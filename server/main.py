# server/main.py
import time
import asyncio
from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# (패키지/모듈 실행 모두 대응)
try:
    from .genai import analyze_tablet_data, generate_report 
except Exception:
    try:
        from genai import analyze_tablet_data, generate_report
    except Exception:
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

@app.get("/processed-data/{request_id}")
async def send_processed_data(request_id: str):
    saved = data_store.get(request_id)
    if not saved:
        return {"message": "No data found for the given request ID"}

    # 필요하면 여기서 실제 분석 호출
    if analyze_tablet_data and generate_report:
        preprocessed_data = pd.DataFrame({"TIMESTAMP": saved['payload']['events']})
        analyzed = analyze_tablet_data(preprocessed_data)
        report = generate_report(preprocessed_data, analyzed)
        return report # {"report": report['report_text'], "image": report['image']}
    else:
        return {"message": "Analysis functions are not available."}