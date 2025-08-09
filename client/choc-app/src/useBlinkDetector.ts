// src/useBlinkDetector.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

type BlinkState = "OPEN" | "CLOSED";

export interface BlinkResult {
  ratioL: number;
  ratioR: number;
  state: BlinkState;
  blinks: number;
  lastBlinkAt: number | null;
}

/** 유클리드 거리 */
const dist = (a: any, b: any) => {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return Math.hypot(dx, dy);
};

/**
 * MediaPipe FaceMesh 인덱스 (정면 기준)
 * 좌안: 가로(33-133), 세로(159-145)
 * 우안: 가로(362-263), 세로(386-374)
 * - 참고: 좌표는 정규화([0..1])
 */
const LEFT = { L: 33, R: 133, T: 159, B: 145 };
const RIGHT = { L: 362, R: 263, T: 386, B: 374 };

/** EAR 유사치: 세로/가로 (값이 작아지면 감김) */
function eyeOpenRatio(lm: any[], eye: typeof LEFT) {
  const w = dist(lm[eye.L], lm[eye.R]) + 1e-6;
  const h = dist(lm[eye.T], lm[eye.B]);
  return h / w;
}

/** 이동평균(간단 저역통과) */
function smooth(prev: number, next: number, alpha = 0.2) {
  return prev * (1 - alpha) + next * alpha;
}

export function useBlinkDetector(videoEl: HTMLVideoElement | null) {
  const [res, setRes] = useState<BlinkResult>({
    ratioL: 0,
    ratioR: 0,
    state: "OPEN",
    blinks: 0,
    lastBlinkAt: null,
  });

  const camRef = useRef<Camera | null>(null);
  const meshRef = useRef<FaceMesh | null>(null);
  const rafRef = useRef<number | null>(null);

  // 스무딩된 비율
  const rLRef = useRef(0);
  const rRRef = useRef(0);
  // 상태/임계값
  const stateRef = useRef<BlinkState>("OPEN");
  const blinksRef = useRef(0);
  const lastBlinkAtRef = useRef<number | null>(null);

  // 히스테리시스 임계값(경험치): 닫힘 판단은 낮고, 열림 판단은 약간 높게
  const CLOSE_T = 0.2;
  const OPEN_T = 0.23;

  // FaceMesh 초기화
  const initMesh = useMemo(
    () => async () => {
      const fm = new FaceMesh({
        locateFile: (f) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      meshRef.current = fm;
    },
    []
  );

  useEffect(() => {
    if (!videoEl) return;
    let cancelled = false;

    (async () => {
      await initMesh();
      if (!meshRef.current) return;

      meshRef.current.onResults((results: any) => {
        const lm = results.multiFaceLandmarks?.[0];
        if (!lm) return;

        const rawL = eyeOpenRatio(lm, LEFT);
        const rawR = eyeOpenRatio(lm, RIGHT);

        // 스무딩
        rLRef.current = smooth(rLRef.current || rawL, rawL);
        rRRef.current = smooth(rRRef.current || rawR, rawR);

        // 양쪽 평균으로 상태 판단 (원하면 좌/우 개별 판단도 가능)
        const avg = (rLRef.current + rRRef.current) / 2;

        let st = stateRef.current;
        if (st === "OPEN" && avg < CLOSE_T) st = "CLOSED";
        else if (st === "CLOSED" && avg > OPEN_T) {
          st = "OPEN";
          blinksRef.current += 1; // CLOSED → OPEN 전이 = blink
          lastBlinkAtRef.current = Date.now();
        }
        stateRef.current = st;

        setRes({
          ratioL: rLRef.current,
          ratioR: rRRef.current,
          state: st,
          blinks: blinksRef.current,
          lastBlinkAt: lastBlinkAtRef.current,
        });
      });

      // 카메라 프레임 → FaceMesh로 보내기
      camRef.current = new Camera(videoEl, {
        onFrame: async () => {
          if (!meshRef.current) return;
          await meshRef.current.send({ image: videoEl });
        },
        width: 640,
        height: 360,
      });

      if (!cancelled) camRef.current.start();
    })();

    return () => {
      cancelled = true;
      camRef.current?.stop();
      camRef.current = null;
      meshRef.current?.close();
      meshRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoEl, initMesh]);

  return res;
}
