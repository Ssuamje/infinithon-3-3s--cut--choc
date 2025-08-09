# server/main.py
import time
import contextlib
import asyncio
from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import queue
import base64


# (패키지/모듈 실행 모두 대응)
try:
    from .genai import analyze_tablet_data, generate_report 
except Exception:
    print("Error importing relative genai module. Trying absolute import.")
    try:
        from genai import analyze_tablet_data, generate_report
    except Exception:
        print("Error importing genai functions. Ensure genai directory is in the same directory or properly installed.")
        analyze_tablet_data = None
        generate_report = None

class BlinkSession(BaseModel):
    id: str
    events: list[str]
    startedAt: str
    endedAt: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # ex) ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_store: Dict[str, Dict] = {}
history_store: Dict[str, Dict] = {}
for name in ['increase', 'decrease', 'stable', 'month', 'week', 'first']:
    history_store[name] = pd.read_csv(f'data/blink_data_{name}.csv')

async def cleanup_loop():
    """1시간 이상 된 항목 정리 루프 (백그라운드 태스크)"""
    while True:
        now = time.time()
        to_delete = [k for k, v in data_store.items() if now - v["timestamp"] > 3600]
        for k in to_delete:
            data_store.pop(k, None)
        await asyncio.sleep(3600)

@app.on_event("startup")
async def on_startup():
    asyncio.create_task(cleanup_loop())

@app.post("/blink-data/")
async def receive_blink_data(data: BlinkSession):
    ts = time.time()
    print("=== blink-data 수신 ===")
    print(f"id: {data.id}")
    print(f"events: {data.events}")
    print(f"startedAt: {data.startedAt}")
    print(f"endedAt: {data.endedAt}")
    print("======================")
    data_store[data.id] = {"payload": data.dict(), "timestamp": ts}
    return {"message": "Data received and processed successfully", "id": data.id, "timestamp": ts}
    
@app.post("/blink-session")
async def receive_blink_session(data: BlinkSession):
    # 기존 로직 재사용
    return await receive_blink_data(data)

@app.get("/processed-data/{request_id}")
async def send_processed_data(request_id: str):
    saved = data_store.get(request_id)
    if not saved:
        return {"message": "No data found for the given request ID"}

    if analyze_tablet_data and generate_report:
        history_df = history_store['increase']
        user_info = {
            'joined_at': history_df['TIMESTAMP'].min(),
        }
        preprocessed_data = pd.concat([history_df, pd.DataFrame({"TIMESTAMP": saved['payload']['events']})])
        analyzed = analyze_tablet_data(preprocessed_data)
        report = generate_report(preprocessed_data, analyzed, user_info=user_info)

        # ✅ 이미지 바이트를 base64 문자열로 변환해서 JSON 직렬화 가능하게
        img_bytes = report.get("daily_line_plot")
        if isinstance(img_bytes, (bytes, bytearray)):
            report["daily_line_plot_b64"] = base64.b64encode(img_bytes).decode("ascii")
            del report["daily_line_plot"]

        return report
    else:
        return {"message": "Analysis functions are not available."}
# ==== [VAD WS] 추가 시작 =========================================
from fastapi import WebSocket, WebSocketDisconnect
import numpy as np
import asyncio
import json

# 네가 준 RealTimeSileroVAD가 별도 파일이면 다음처럼 시도:
try:
    from .vad import RealTimeSileroVAD, TARGET_SR, BLOCK_SAMPLES
except Exception:
    try:
        from vad import RealTimeSileroVAD, TARGET_SR, BLOCK_SAMPLES
    except Exception as e:
        print("VAD import error:", e)
        RealTimeSileroVAD = None
        TARGET_SR = 16000
        BLOCK_SAMPLES = 512

@app.websocket("/vad-stream")
async def vad_stream(ws: WebSocket):
    await ws.accept()
    if RealTimeSileroVAD is None:
        await ws.send_json({"type":"error","message":"VAD not available on server"})
        await ws.close()
        return

    # 클라가 보내는 512 float32(리틀엔디안) 프레임을 처리
    # 이벤트(frame/speech_start/speech_end)는 JSON으로 push
    loop = asyncio.get_running_loop()
    ev_q: "queue.Queue[dict]" = queue.Queue()

    def on_event(event: str, t_s: float, prob: float, chunk: np.ndarray):
        ev_q.put({"type": event, "t_s": float(t_s), "prob": float(prob)})

    vad = RealTimeSileroVAD(sample_rate=TARGET_SR, threshold=0.5, min_speech_frames=3, min_silence_frames=6, onnx=True)
    vad.start(on_event)

    send_task = asyncio.create_task(_ws_event_sender(ws, ev_q))

    try:
        # 첫 메시지가 설정 JSON일 수 있음(선택)
        try:
            msg = await ws.receive_text()
            try:
                cfg = json.loads(msg)
                if isinstance(cfg, dict) and cfg.get("type") == "config":
                    th = float(cfg.get("threshold", 0.5))
                    msf = int(cfg.get("min_speech_frames", 3))
                    mif = int(cfg.get("min_silence_frames", 6))
                    # 간단 적용: 인스턴스 재생성 대신 내부 필드 업데이트
                    vad.threshold = th
                    vad.min_speech_frames = msf
                    vad.min_silence_frames = mif
            except Exception:
                # 텍스트지만 config 아님 → 무시
                pass
        except Exception:
            # 첫 프레임이 바이너리일 수도 있음 → 패스
            pass

        # 메인 수신 루프(바이너리 프레임)
        while True:
            data = await ws.receive_bytes()
            # Float32 Little-Endian 가정
            arr = np.frombuffer(data, dtype=np.float32)
            if arr.ndim != 1:
                continue
            if len(arr) != BLOCK_SAMPLES:
                # 틱사이즈가 다르면 드랍(클라가 512로 보내야 함)
                continue
            vad.put(arr)
    except WebSocketDisconnect:
        pass
    finally:
        try:
            vad.stop()
        except Exception:
            pass
        send_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await send_task

async def _ws_event_sender(ws: WebSocket, ev_q: "queue.Queue[dict]"):
    # 쓰레드 큐 -> WS로 비동기 전송
    try:
        while True:
            ev = await asyncio.to_thread(ev_q.get)
            await ws.send_json(ev)
    except asyncio.CancelledError:
        # 정상 종료 경로
        return
    except Exception:
        # 기타 에러는 조용히 무시(원하면 logging 추가)
        return
# ==== [VAD WS] 추가 끝 ===========================================
