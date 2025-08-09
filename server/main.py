from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# 데이터 모델 정의
class BlinkData(BaseModel):
    state: str
    blinks: int
    ratioL: float
    ratioR: float

# 클라이언트 → 서버: 데이터 수신
@app.post("/blink-data/")
async def receive_blink_data(data: BlinkData):
    print(f"Received data: {data}")
    return {"message": "Data received successfully"}

# 서버 → 클라이언트: 데이터 전송
@app.get("/status/")
async def send_status():
    return {"status": "Server is running", "info": "Ready to receive data"}