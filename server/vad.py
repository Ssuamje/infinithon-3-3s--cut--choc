#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Silero VAD v5 (ONNX) - 프레임별 출력 버전
- 16kHz mono 권장 (다르면 자동 변환)
- 32 ms (512 샘플) 단위로 스트리밍
- 프레임마다 SPEECH/SILENCE 라벨과 확률 출력
"""
import argparse
import queue
import threading
import time
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

import numpy as np
import torch  # onnx=True여도 내부 전처리/상태에 필요
from silero_vad import load_silero_vad  # v5 API (onnx=True)
import soundfile as sf
from scipy.signal import resample_poly

TARGET_SR = 16000
BLOCK_SAMPLES = 512   # 32 ms @ 16k
DT = BLOCK_SAMPLES / TARGET_SR  # 0.032 s

@dataclass
class Segment:
    start_s: float
    end_s: float

class RealTimeSileroVAD:
    """
    - onnx=True 로 v5 ONNX 백엔드
    - 프레임마다 callback(event, t_s, prob, chunk) 호출 (event ∈ {"frame", "speech_start", "speech_end"})
    - 안전 종료(sentinel + join)
    """
    def __init__(
        self,
        sample_rate: int = TARGET_SR,
        threshold: float = 0.5,
        min_speech_frames: int = 3,   # ≈ 96 ms
        min_silence_frames: int = 6,  # ≈ 192 ms
        onnx: bool = True,
    ):
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.min_speech_frames = min_speech_frames
        self.min_silence_frames = min_silence_frames

        self.model = load_silero_vad(onnx=onnx)

        self.q: "queue.Queue[np.ndarray]" = queue.Queue()
        self.running = False
        self.callback: Optional[Callable[[str, float, float, np.ndarray], None]] = None

        self.speech_frames = 0
        self.silence_frames = 0
        self.in_speech = False
        self.stream_frames = 0

        self._SENTINEL = object()
        self._th: Optional[threading.Thread] = None

    def start(self, callback: Optional[Callable[[str, float, float, np.ndarray], None]] = None):
        self.running = True
        self.callback = callback
        self._th = threading.Thread(target=self._run, daemon=False)
        self._th.start()

    def stop(self):
        self.running = False
        try:
            self.q.put_nowait(self._SENTINEL)
        except queue.Full:
            pass
        try:
            self.model.reset_states()
        except Exception:
            pass
        if self._th is not None:
            self._th.join(timeout=2.0)
            self._th = None

    def put(self, chunk: np.ndarray):
        if chunk.dtype != np.float32:
            chunk = chunk.astype(np.float32)
        self.q.put(chunk)

    def _emit(self, event: str, prob: float, chunk: np.ndarray):
        if self.callback:
            t_s = self.stream_frames * DT
            self.callback(event, t_s, prob, chunk)

    def _run(self):
        while True:
            try:
                chunk = self.q.get(timeout=0.1)
            except queue.Empty:
                if not self.running:
                    break
                continue

            if chunk is self._SENTINEL:
                break

            t = torch.from_numpy(chunk)            # 1D tensor
            prob = float(self.model(t, self.sample_rate))
            is_speech = prob > self.threshold

            # 프레임 이벤트는 항상 쏴줌 (요구사항 반영)
            self._emit("frame", prob, chunk)

            # 히스테리시스
            if is_speech:
                self.speech_frames += 1
                self.silence_frames = 0
            else:
                self.silence_frames += 1
                self.speech_frames = 0

            # 시작/종료 이벤트
            if not self.in_speech and self.speech_frames >= self.min_speech_frames:
                self.in_speech = True
                self._emit("speech_start", prob, chunk)
            elif self.in_speech and self.silence_frames >= self.min_silence_frames:
                self.in_speech = False
                self._emit("speech_end", prob, chunk)

            self.stream_frames += 1

def load_wav_mono_f32(path: str, target_sr: int = TARGET_SR) -> np.ndarray:
    """
    WAV 로드 → mono → float32 → 필요시 16k로 리샘플
    """
    audio, sr = sf.read(path, always_2d=True, dtype="float32")
    mono = audio[:, 0]
    if sr != target_sr:
        g = np.gcd(sr, target_sr)
        up = target_sr // g
        down = sr // g
        mono = resample_poly(mono, up, down).astype(np.float32, copy=False)
    return mono

def stream_chunks(x: np.ndarray, block: int = BLOCK_SAMPLES):
    """
    512 샘플씩 순차 반환 (마지막은 zero-pad)
    """
    n = len(x)
    k = n // block
    r = n % block
    for i in range(k):
        yield x[i * block : (i + 1) * block]
    if r:
        last = np.zeros(block, dtype=np.float32)
        last[:r] = x[-r:]
        yield last

def main():
    p = argparse.ArgumentParser(description="Silero VAD v5 (ONNX) - framewise demo")
    p.add_argument("wav_path", type=str, help="입력 WAV 경로")
    p.add_argument("--threshold", type=float, default=0.5, help="음성 확률 임계값")
    p.add_argument("--min_speech_frames", type=int, default=3, help="연속 스피치 프레임(시작)")
    p.add_argument("--min_silence_frames", type=int, default=6, help="연속 침묵 프레임(종료)")
    p.add_argument("--realtime", action="store_true", help="콘솔 출력이 실시간처럼 보이게 32ms 대기")
    args = p.parse_args()

    wav = load_wav_mono_f32(args.wav_path, TARGET_SR)

    segs: List[Segment] = []
    cur_start: Optional[float] = None

    def on_event(event: str, t_s: float, prob: float, chunk: np.ndarray):
        nonlocal cur_start, segs
        if event == "frame":
            state = "SPEECH" if prob > args.threshold else "silence"
            print(f"[{t_s:8.3f}s] {state:7s}  p={prob:.3f}")
        elif event == "speech_start":
            cur_start = t_s
            print(f"▶️  speech_start @ {t_s:.3f}s (p={prob:.3f})")
        elif event == "speech_end":
            if cur_start is None:
                cur_start = max(0.0, t_s - DT)
            end = t_s
            segs.append(Segment(start_s=cur_start, end_s=end))
            print(f"⏹️  speech_end   @ {end:.3f}s   -> [{cur_start:.3f}, {end:.3f}] (dur={end-cur_start:.3f}s)")
            cur_start = None

    vad = RealTimeSileroVAD(
        sample_rate=TARGET_SR,
        threshold=args.threshold,
        min_speech_frames=args.min_speech_frames,
        min_silence_frames=args.min_silence_frames,
        onnx=True,
    )
    vad.start(on_event)

    # 1) 실제 오디오 청크 투입 (+옵션: 실시간 느낌)
    for ch in stream_chunks(wav, BLOCK_SAMPLES):
        vad.put(ch)
        if args.realtime:
            time.sleep(DT)

    # 2) 마지막 구간 닫히도록 무음 청크 추가
    for _ in range(vad.min_silence_frames):
        vad.put(np.zeros(BLOCK_SAMPLES, dtype=np.float32))

    # 3) 안전 종료
    vad.stop()

    print("\n=== Detected Segments ===")
    for i, s in enumerate(segs, 1):
        print(f"{i:02d}. {s.start_s:.3f}s  →  {s.end_s:.3f}s  (dur={s.end_s - s.start_s:.3f}s)")

if __name__ == "__main__":
    main()
