// src/useBlinkDetector.ts
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  RefObject,
  useCallback,
} from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

type BlinkState = "UNKNOWN" | "OPEN" | "CLOSING" | "CLOSED" | "OPENING";

export interface BlinkResult {
  ratioL: number;
  ratioR: number;
  state: BlinkState;
  blinks: number;
  lastBlinkAt: number | null;
  CLOSE_T: number; // 감음 임계값
  OPEN_T: number; // 뜸 임계값
}

/** 유클리드 거리 */
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
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
function eyeOpenRatio(lm: { x: number; y: number }[], eye: typeof LEFT) {
  const w = dist(lm[eye.L], lm[eye.R]) + 1e-6;
  const h = dist(lm[eye.T], lm[eye.B]);
  return h / w;
}

/** 이동평균(간단 저역통과) - 더 빠른 반응을 위해 알파값 증가 */
function smooth(prev: number, next: number, alpha = 0.4) {
  return prev * (1 - alpha) + next * alpha;
}

export function useBlinkDetector(videoRef: RefObject<HTMLVideoElement>) {
  const [res, setRes] = useState<BlinkResult>({
    ratioL: 0,
    ratioR: 0,
    state: "UNKNOWN",
    blinks: 0,
    lastBlinkAt: null,
    CLOSE_T: 0.3, // 감음 임계값
    OPEN_T: 0.5, // 뜸 임계값
  });

  const camRef = useRef<Camera | null>(null);
  const meshRef = useRef<FaceMesh | null>(null);
  const rafRef = useRef<number | null>(null);

  // 스무딩된 비율
  const rLRef = useRef(0);
  const rRRef = useRef(0);
  // 상태 관리
  const stateRef = useRef<BlinkState>("UNKNOWN");
  const blinksRef = useRef(0);
  const lastBlinkAtRef = useRef<number | null>(null);

  // 상태 지속시간 추적
  const stateStartTimeRef = useRef<number>(0);
  const consecutiveFramesRef = useRef<number>(0);
  const lastDetectedRatioRef = useRef<number>(0);

  // 깜빡임 감지를 위한 임계값들 - 더 관대하게 조정
  const CLOSE_T = 0.25; // 감음 판단 임계값 (더 낮게)
  const OPEN_T = 0.5; // 뜸 판단 임계값 (더 낮게)
  const MIN_STATE_DURATION = 30; // 상태 변경 최소 지속시간 (ms) - 더 짧게
  const MIN_CONSECUTIVE_FRAMES = 1; // 상태 변경을 위한 최소 연속 프레임 수 - 더 관대하게
  const NO_FACE_TIMEOUT = 3000; // 얼굴 감지 실패 후 리셋 시간 (ms)

  // FaceMesh 초기화
  const initMesh = useMemo(
    () => async () => {
      const fm = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7, // 더 높은 신뢰도로 안정성 향상
        minTrackingConfidence: 0.7, // 더 높은 추적 신뢰도
      });
      meshRef.current = fm;
    },
    []
  );

  // videoRef.current가 변경될 때마다 실행되는 콜백
  const handleVideoRefChange = useCallback(() => {
    if (!videoRef.current) {
      console.log(
        "videoRef.current is null, skipping blink detector initialization"
      );
      return;
    }

    const videoEl = videoRef.current;
    console.log("videoEl in useBlinkDetector:", videoEl);

    let cancelled = false;

    // 상태 초기화
    stateRef.current = "UNKNOWN";
    stateStartTimeRef.current = Date.now();
    consecutiveFramesRef.current = 0;
    rLRef.current = 0;
    rRRef.current = 0;

    (async () => {
      await initMesh();
      if (!meshRef.current) {
        console.error("FaceMesh is not initialized");
        return;
      }
      console.log("FaceMesh initialized successfully");
      meshRef.current.onResults(
        (results: { multiFaceLandmarks?: { x: number; y: number }[][] }) => {
          const lm = results.multiFaceLandmarks?.[0];
          if (!lm) {
            console.warn("No landmarks detected");
          }

          const now = Date.now();

          // 얼굴이 감지되지 않은 경우
          if (!lm) {
            // 일정 시간 후 상태 리셋
            if (now - stateStartTimeRef.current > NO_FACE_TIMEOUT) {
              stateRef.current = "UNKNOWN";
              rLRef.current = 0;
              rRRef.current = 0;
              consecutiveFramesRef.current = 0;
            }

            setRes({
              ratioL: rLRef.current,
              ratioR: rRRef.current,
              state: stateRef.current,
              blinks: blinksRef.current,
              lastBlinkAt: lastBlinkAtRef.current,
              CLOSE_T,
              OPEN_T,
            });
            return;
          }

          // EAR 계산 및 스무딩
          const rawL = eyeOpenRatio(lm, LEFT);
          const rawR = eyeOpenRatio(lm, RIGHT);

          // 초기값이 0이면 바로 설정 (스무딩 없이)
          if (rLRef.current === 0) rLRef.current = rawL;
          if (rRRef.current === 0) rRRef.current = rawR;

          rLRef.current = smooth(rLRef.current, rawL);
          rRRef.current = smooth(rRRef.current, rawR);

          // 평균 EAR 계산
          const avgRatio = (rLRef.current + rRRef.current) / 2;
          const currentState = stateRef.current;
          let newState = currentState;

          // 상태 전환 로직
          const timeSinceStateChange = now - stateStartTimeRef.current;

          // 연속 프레임 검사를 더 관대하게 - 비율이 크게 변하지 않으면 연속으로 간주
          const ratioDiff = Math.abs(avgRatio - lastDetectedRatioRef.current);
          if (ratioDiff < 0.02) {
            // 0.02 이내의 변화는 동일한 것으로 간주
            consecutiveFramesRef.current += 1;
          } else {
            consecutiveFramesRef.current = 1;
          }
          lastDetectedRatioRef.current = avgRatio;

          // 상태 변경 조건 확인 (최소 지속시간과 연속 프레임 조건)
          const canChangeState =
            timeSinceStateChange >= MIN_STATE_DURATION &&
            consecutiveFramesRef.current >= MIN_CONSECUTIVE_FRAMES;

          switch (currentState) {
            case "UNKNOWN":
              // 얼굴이 감지되면 바로 OPEN 또는 CLOSED로 전환
              if (avgRatio > OPEN_T) {
                newState = "OPEN";
              } else if (avgRatio < CLOSE_T) {
                newState = "CLOSED";
              }
              break;

            case "OPEN":
              // 감긴 상태로 바로 전환
              if (canChangeState && avgRatio < CLOSE_T) {
                newState = "CLOSED";
              }
              break;

            case "CLOSED":
              // 뜬 상태로 바로 전환
              if (canChangeState && avgRatio > OPEN_T) {
                newState = "OPEN";
                // 완전한 깜빡임 사이클 완료
                blinksRef.current += 1;
                lastBlinkAtRef.current = now;
              }
              break;
          }

          // 상태가 변경된 경우
          if (newState !== currentState) {
            stateRef.current = newState;
            stateStartTimeRef.current = now;
            consecutiveFramesRef.current = 0;
          }

          setRes({
            ratioL: rLRef.current,
            ratioR: rRRef.current,
            state: newState,
            blinks: blinksRef.current,
            lastBlinkAt: lastBlinkAtRef.current,
            CLOSE_T,
            OPEN_T,
          });
        }
      );

      // 카메라 프레임 → FaceMesh로 보내기 (더 높은 해상도와 빠른 처리)
      camRef.current = new Camera(videoEl, {
        onFrame: async () => {
          console.log("Sending frame to FaceMesh");
          if (!meshRef.current) return;
          await meshRef.current.send({ image: videoEl });
        },
        width: 1280,
        height: 720,
      });

      if (!cancelled) camRef.current.start();
    })();

    return () => {
      cancelled = true;
      const rafId = rafRef.current;
      camRef.current?.stop();
      camRef.current = null;
      meshRef.current?.close();
      meshRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [initMesh]);

  useEffect(() => {
    const cleanup = handleVideoRefChange();
    return cleanup;
  }, [handleVideoRefChange]);

  return res;
}
