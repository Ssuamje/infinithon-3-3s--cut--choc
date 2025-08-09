import time
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from typing import Dict

from genai import analyze_tablet_data, generate_report
import uuid

app = FastAPI()

# 데이터 모델 정의
class BlinkData(BaseModel):
    timestamp: list[str]  # 타임스탬프 리스트

# 요청 데이터를 저장할 임시 메모리 저장소 (예: 데이터베이스 대신 사용)
data_store: Dict[str, Dict] = {}

@app.on_event("startup")
async def cleanup_data_store():
    while True:
        current_time = time.time()
        keys_to_delete = [key for key, value in data_store.items() if current_time - value["timestamp"] > 3600]
        for key in keys_to_delete:
            del data_store[key]
        await asyncio.sleep(3600)  # 1시간마다 정리

# 클라이언트 → 서버: 데이터 수신
@app.post("/blink-data/")
async def receive_blink_data(data: BlinkData):
    request_id = str(uuid.uuid4())  # 난수로 고유 ID 생성
    timestamp = time.time()
    data_store[request_id] = data.timestamp
    return {"message": "Data received and processed successfully", "request_id": request_id, "timestamp": timestamp}

# 서버 → 클라이언트: 가공된 데이터 전송
@app.get("/processed-data/{request_id}")
async def send_processed_data(request_id: str):
    if request_id not in data_store:
        return {"message": "No data found for the given request ID"}
    # processed_data = analyze_tablet_data(data_store[request_id]['state'])
    # report = generate_report(processed_data)
    report = data_store[request_id]
    return {"report": report, "request_id": request_id}