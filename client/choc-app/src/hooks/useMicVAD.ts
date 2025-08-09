// src/hooks/useMicVAD.ts
import { useEffect, useRef, useState } from "react";

const TARGET_SR = 16000;
const BLOCK = 512;

// http -> ws 로 변환
function http2ws(url: string) {
  return url.replace(/^http/, "ws");
}

const WS_URL =
  (import.meta.env.VITE_WS_BASE as string | undefined) ??
  http2ws((import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000") +
    "/vad-stream";

type VADEvent =
  | { type: "frame"; t_s: number; prob: number }
  | { type: "speech_start"; t_s: number; prob: number }
  | { type: "speech_end"; t_s: number; prob: number }
  | { type: "error"; message: string };

export function useMicVAD(enabled: boolean) {
  const [connected, setConnected] = useState(false);
  const [lastProb, setLastProb] = useState(0);
  const [inSpeech, setInSpeech] = useState(false);
  const [events, setEvents] = useState<VADEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // 입력 누적 버퍼 / 출력 누적 버퍼 / 입력 위치(부동)
  const inBufRef = useRef<Float32Array>(new Float32Array(0));
  const outBufRef = useRef<Float32Array>(new Float32Array(0));
  const posRef = useRef<number>(0);

  function resampleAndChunk(input: Float32Array, inRate: number) {
    // 입력 누적
    const prev = inBufRef.current;
    const merged = new Float32Array(prev.length + input.length);
    merged.set(prev, 0);
    merged.set(input, prev.length);

    const ratio = TARGET_SR / inRate;
    let pos = posRef.current;
    const out: number[] = [];

    // 선형 보간 리샘플
    while (pos + 1 < merged.length) {
      const i0 = Math.floor(pos);
      const i1 = i0 + 1;
      const frac = pos - i0;
      const s = merged[i0] * (1 - frac) + merged[i1] * frac;
      out.push(s);
      pos += 1 / ratio;
    }

    // 소비한 정수 샘플 제거
    const consumed = Math.floor(pos);
    inBufRef.current = merged.slice(consumed);
    posRef.current = pos - consumed;

    // 출력 누적 → 512 샘플씩 분할
    const prevOut = outBufRef.current;
    const outAll = new Float32Array(prevOut.length + out.length);
    outAll.set(prevOut, 0);
    outAll.set(out, prevOut.length);

    const frames: Float32Array[] = [];
    let off = 0;
    while (off + BLOCK <= outAll.length) {
      frames.push(outAll.slice(off, off + BLOCK));
      off += BLOCK;
    }
    outBufRef.current = outAll.slice(off);
    return frames;
  }

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;

    (async () => {
      try {
        const ac = new AudioContext();
        acRef.current = ac;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        const src = ac.createMediaStreamSource(stream);
        srcRef.current = src;

        // 간단한 ScriptProcessorNode (1024 샘플 단위 pull)
        const proc = ac.createScriptProcessor(1024, 1, 1);
        procRef.current = proc;

        const ws = new WebSocket(WS_URL);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          // (선택) 서버 VAD 파라미터 설정
          ws.send(
            JSON.stringify({
              type: "config",
              threshold: 0.5,
              min_speech_frames: 3,
              min_silence_frames: 6,
            })
          );
        };
        ws.onclose = () => setConnected(false);
        ws.onerror = (e) => {
          console.error(e);
          setError("WebSocket error");
        };
        ws.onmessage = (ev) => {
          try {
            if (typeof ev.data !== "string") return;
            const m: VADEvent = JSON.parse(ev.data);
            if (m.type === "error") {
              setError(m.message);
              return;
            }
            setEvents((prev) =>
              prev.length > 200 ? [...prev.slice(-200), m] : [...prev, m]
            );
            if (m.type === "frame") setLastProb(m.prob);
            if (m.type === "speech_start") setInSpeech(true);
            if (m.type === "speech_end") setInSpeech(false);
          } catch {
            // ignore
          }
        };

        proc.onaudioprocess = (e) => {
          if (stopped) return;
          const ch = e.inputBuffer.getChannelData(0);
          const frames = resampleAndChunk(ch, ac.sampleRate);
          if (ws.readyState === WebSocket.OPEN) {
            for (const f of frames) ws.send(f.buffer); // Float32Array -> ArrayBuffer
          }
        };

        src.connect(proc);
        // 소리 출력 원치 않으면 destination 연결 생략해도 됨
        proc.connect(ac.destination);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? String(err));
      }
    })();

    return () => {
      stopped = true;
      try {
        procRef.current?.disconnect();
        srcRef.current?.disconnect();
        acRef.current?.close();
      } catch {}
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [enabled]);

  return { connected, lastProb, inSpeech, events, error };
}
