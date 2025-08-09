import { useEffect, useMemo, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

type BlinkState = "UNKNOWN" | "OPEN" | "CLOSING" | "CLOSED" | "OPENING";

export interface BlinkResult {
  ratioL: number;
  ratioR: number;
  state: BlinkState;
  blinks: number;
  lastBlinkAt: number | null;
  CLOSE_T: number;
  OPEN_T: number;
  minEAR?: number;
  maxEAR?: number;
  calibAt?: number;
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const LEFT = { L: 33, R: 133, T: 159, B: 145 };
const RIGHT = { L: 362, R: 263, T: 386, B: 374 };

function eyeOpenRatio(lm: { x: number; y: number }[], eye: typeof LEFT) {
  const w = dist(lm[eye.L], lm[eye.R]) + 1e-6;
  const h = dist(lm[eye.T], lm[eye.B]);
  return h / w;
}

function smooth(prev: number, next: number, alpha = 0.4) {
  return prev * (1 - alpha) + next * alpha;
}

export function useBlinkDetector(videoEl: HTMLVideoElement | null) {
  const INIT_CLOSE_T = 0.30;
  const INIT_OPEN_T = 0.50;
  const CALIBRATION_INTERVAL = 10000;
  const INIT_DURATION = 10000;

  const [res, setRes] = useState<BlinkResult>({
    ratioL: 0,
    ratioR: 0,
    state: "UNKNOWN",
    blinks: 0,
    lastBlinkAt: null,
    CLOSE_T: INIT_CLOSE_T,
    OPEN_T: INIT_OPEN_T,
    minEAR: undefined,
    maxEAR: undefined,
    calibAt: undefined,
  });

  const camRef = useRef<Camera | null>(null);
  const meshRef = useRef<FaceMesh | null>(null);

  const rLRef = useRef(0);
  const rRRef = useRef(0);
  const stateRef = useRef<BlinkState>("UNKNOWN");
  const blinksRef = useRef(0);
  const lastBlinkAtRef = useRef<number | null>(null);

  const stateStartTimeRef = useRef<number>(0);
  const consecutiveFramesRef = useRef<number>(0);
  const lastDetectedRatioRef = useRef<number>(0);

  const minEARRef = useRef<number>(Number.POSITIVE_INFINITY);
  const maxEARRef = useRef<number>(Number.NEGATIVE_INFINITY);

  const closeTRef = useRef<number>(INIT_CLOSE_T);
  const openTRef = useRef<number>(INIT_OPEN_T);

  const startTimeRef = useRef<number | null>(null);

  const lastCalibratedMinEAR = useRef<number | undefined>(undefined);
  const lastCalibratedMaxEAR = useRef<number | undefined>(undefined);
  const lastCalibratedCloseT = useRef<number>(INIT_CLOSE_T);
  const lastCalibratedOpenT = useRef<number>(INIT_OPEN_T);
  const lastCalibAtRef = useRef<number | undefined>(undefined);

  const MIN_STATE_DURATION = 30;
  const MIN_CONSECUTIVE_FRAMES = 1;
  const NO_FACE_TIMEOUT = 3000;

  const runCalibration = useMemo(
    () => () => {
      const min = minEARRef.current;
      const max = maxEARRef.current;

      if (
        min < max &&
        isFinite(min) &&
        isFinite(max) &&
        min !== Number.POSITIVE_INFINITY &&
        max !== Number.NEGATIVE_INFINITY
      ) {
        closeTRef.current = (min + max) / 2;
        openTRef.current = (min + max) / 2;

        lastCalibratedMinEAR.current = min;
        lastCalibratedMaxEAR.current = max;
        lastCalibratedCloseT.current = closeTRef.current;
        lastCalibratedOpenT.current = openTRef.current;
        lastCalibAtRef.current = Date.now();

        minEARRef.current = Number.POSITIVE_INFINITY;
        maxEARRef.current = Number.NEGATIVE_INFINITY;

        setRes((prev) => ({
          ...prev,
          CLOSE_T: closeTRef.current,
          OPEN_T: openTRef.current,
          minEAR: lastCalibratedMinEAR.current,
          maxEAR: lastCalibratedMaxEAR.current,
          calibAt: lastCalibAtRef.current,
        }));
      }
    },
    []
  );

  useEffect(() => {
    if (!videoEl) return;
    let firstTimeoutId: number | null = null;
    let intervalId: number | null = null;

    firstTimeoutId = window.setTimeout(() => {
      runCalibration();
      intervalId = window.setInterval(runCalibration, CALIBRATION_INTERVAL);
    }, INIT_DURATION);

    return () => {
      if (firstTimeoutId) window.clearTimeout(firstTimeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [videoEl, runCalibration]);

  const initMesh = useMemo(
    () => async () => {
      const fm = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });
      meshRef.current = fm;
    },
    []
  );

  useEffect(() => {
    if (!videoEl) return;
    let cancelled = false;

    stateStartTimeRef.current = Date.now();
    consecutiveFramesRef.current = 0;
    rLRef.current = 0;
    rRRef.current = 0;
    startTimeRef.current = Date.now();

    (async () => {
      await initMesh();
      if (!meshRef.current) return;

      meshRef.current.onResults(
        (results: { multiFaceLandmarks?: { x: number; y: number }[][] }) => {
          const lm = results.multiFaceLandmarks?.[0];
          const now = Date.now();

          if (!lm) {
            if (now - stateStartTimeRef.current > NO_FACE_TIMEOUT) {
              rLRef.current = 0;
              rRRef.current = 0;
              consecutiveFramesRef.current = 0;
            }
            const useDynamic =
              !!startTimeRef.current && now - startTimeRef.current >= INIT_DURATION;

            setRes((prev) => ({
              ...prev,
              ratioL: rLRef.current,
              ratioR: rRRef.current,
              state: stateRef.current,
              blinks: blinksRef.current,
              lastBlinkAt: lastBlinkAtRef.current,
              CLOSE_T: useDynamic ? closeTRef.current : INIT_CLOSE_T,
              OPEN_T: useDynamic ? openTRef.current : INIT_OPEN_T,
              minEAR:
                lastCalibratedMinEAR.current ??
                (isFinite(minEARRef.current) &&
                minEARRef.current !== Number.POSITIVE_INFINITY
                  ? minEARRef.current
                  : undefined),
              maxEAR:
                lastCalibratedMaxEAR.current ??
                (isFinite(maxEARRef.current) &&
                maxEARRef.current !== Number.NEGATIVE_INFINITY
                  ? maxEARRef.current
                  : undefined),
              calibAt: lastCalibAtRef.current,
            }));
            return;
          }

          const rawL = eyeOpenRatio(lm, LEFT);
          const rawR = eyeOpenRatio(lm, RIGHT);

          const avgRaw = (rawL + rawR) / 2;
          if (avgRaw < minEARRef.current) minEARRef.current = avgRaw;
          if (avgRaw > maxEARRef.current) maxEARRef.current = avgRaw;

          if (rLRef.current === 0) rLRef.current = rawL;
          if (rRRef.current === 0) rRRef.current = rawR;

          rLRef.current = smooth(rLRef.current, rawL);
          rRRef.current = smooth(rRRef.current, rawR);

          const avgRatio = (rLRef.current + rRRef.current) / 2;

          const useDynamic =
            !!startTimeRef.current && now - startTimeRef.current >= INIT_DURATION;
          const CLOSE_T = useDynamic ? closeTRef.current : INIT_CLOSE_T;
          const OPEN_T = useDynamic ? openTRef.current : INIT_OPEN_T;

          const currentState = stateRef.current;
          let newState = currentState;
          const timeSinceStateChange = now - stateStartTimeRef.current;
          const ratioDiff = Math.abs(avgRatio - lastDetectedRatioRef.current);

          if (ratioDiff < 0.02) {
            consecutiveFramesRef.current += 1;
          } else {
            consecutiveFramesRef.current = 1;
          }
          lastDetectedRatioRef.current = avgRatio;

          const canChangeState =
            timeSinceStateChange >= MIN_STATE_DURATION &&
            consecutiveFramesRef.current >= MIN_CONSECUTIVE_FRAMES;

          switch (currentState) {
            case "UNKNOWN":
              if (avgRatio > OPEN_T) newState = "OPEN";
              else if (avgRatio < CLOSE_T) newState = "CLOSED";
              break;
            case "OPEN":
              if (canChangeState && avgRatio < CLOSE_T) newState = "CLOSED";
              break;
            case "CLOSED":
              if (canChangeState && avgRatio > OPEN_T) {
                newState = "OPEN";
                blinksRef.current += 1;
                lastBlinkAtRef.current = now;
              }
              break;
          }

          if (newState !== currentState) {
            stateRef.current = newState;
            stateStartTimeRef.current = now;
            consecutiveFramesRef.current = 0;
          }

          setRes((prev) => ({
            ...prev,
            ratioL: rLRef.current,
            ratioR: rRRef.current,
            state: newState,
            blinks: blinksRef.current,
            lastBlinkAt: lastBlinkAtRef.current,
            CLOSE_T: CLOSE_T,
            OPEN_T: OPEN_T,
            minEAR:
              lastCalibratedMinEAR.current ??
              (isFinite(minEARRef.current) &&
              minEARRef.current !== Number.POSITIVE_INFINITY
                ? minEARRef.current
                : undefined),
            maxEAR:
              lastCalibratedMaxEAR.current ??
              (isFinite(maxEARRef.current) &&
              maxEARRef.current !== Number.NEGATIVE_INFINITY
                ? maxEARRef.current
                : undefined),
            calibAt: lastCalibAtRef.current,
          }));
        }
      );

      camRef.current = new Camera(videoEl, {
        onFrame: async () => {
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
      camRef.current?.stop();
      camRef.current = null;
      meshRef.current?.close();
      meshRef.current = null;
    };
  }, [videoEl, initMesh]);

  return res;
}
