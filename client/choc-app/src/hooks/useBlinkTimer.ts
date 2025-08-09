// src/hooks/useBlinkTimer.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { usePageVisibility } from "./usePageVisibility";

interface BlinkTimerState {
  isWarning: boolean;
  timeWithoutBlink: number;
  progress: number; // 0-100%
}

export function useBlinkTimer(
  lastBlinkAt: number | null,
  warningThreshold: number = 6000
) {
  const [state, setState] = useState<BlinkTimerState>({
    isWarning: false,
    timeWithoutBlink: 0,
    progress: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlinkRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // 페이지 가시성 감지
  const { isVisible, timeSinceLastVisible } = usePageVisibility();

  // 타이머 업데이트 함수
  const updateTimer = useCallback(() => {
    const now = Date.now();

    if (!lastBlinkRef.current) {
      // 아직 깜빡임이 감지된 적이 없으면 초기 상태 유지
      setState({
        isWarning: false,
        timeWithoutBlink: 0,
        progress: 0,
      });
      return;
    }

    // 백그라운드에서 돌아왔을 때 시간 보정
    let timeSinceLastBlink = now - lastBlinkRef.current;

    // 백그라운드에서 돌아왔을 때는 실제 경과 시간을 고려
    if (!isVisible && timeSinceLastVisible > 0) {
      // 백그라운드에서 돌아왔을 때는 마지막 업데이트 시간부터 계산
      const backgroundTime = Math.min(timeSinceLastVisible, 30000); // 최대 30초로 제한
      timeSinceLastBlink += backgroundTime;
    }

    const progress = Math.min(
      (timeSinceLastBlink / warningThreshold) * 100,
      100
    );
    const isWarning = timeSinceLastBlink >= warningThreshold;

    setState({
      isWarning,
      timeWithoutBlink: timeSinceLastBlink,
      progress,
    });

    lastUpdateTimeRef.current = now;
  }, [isVisible, timeSinceLastVisible, warningThreshold]);

  useEffect(() => {
    // 새로운 깜빡임이 감지되면 참조값 업데이트
    if (lastBlinkAt && lastBlinkAt !== lastBlinkRef.current) {
      lastBlinkRef.current = lastBlinkAt;
      lastUpdateTimeRef.current = Date.now();
    }
  }, [lastBlinkAt]);

  useEffect(() => {
    // 페이지가 보이지 않을 때는 타이머를 더 느리게 실행
    const interval = isVisible ? 100 : 1000;

    // 항상 실행되는 타이머 - 깜빡임 상태를 지속적으로 체크
    intervalRef.current = setInterval(updateTimer, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateTimer, isVisible]);

  // 페이지가 다시 보이게 되었을 때 즉시 타이머 업데이트
  useEffect(() => {
    if (isVisible && lastBlinkRef.current) {
      updateTimer();
    }
  }, [isVisible, updateTimer]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return state;
}
