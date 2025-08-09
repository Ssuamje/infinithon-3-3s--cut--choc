// src/hooks/useBlinkTimer.ts
import { useEffect, useRef, useState, useCallback } from "react";

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
  const isInitializedRef = useRef<boolean>(false);

  // 타이머 정리 함수
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 타이머 시작 함수
  const startTimer = useCallback(() => {
    clearTimer();

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastBlink = now - (lastBlinkRef.current || now);
      const progress = Math.min(
        (timeSinceLastBlink / warningThreshold) * 100,
        100
      );
      const isWarning = timeSinceLastBlink >= warningThreshold;

      setState((prevState) => {
        // 상태가 실제로 변경된 경우에만 업데이트
        if (
          prevState.isWarning !== isWarning ||
          Math.abs(prevState.progress - progress) > 1
        ) {
          return {
            isWarning,
            timeWithoutBlink: timeSinceLastBlink,
            progress,
          };
        }
        return prevState;
      });
    }, 100);
  }, [warningThreshold, clearTimer]);

  useEffect(() => {
    // 새로운 깜빡임이 감지되면 타이머 리셋
    if (lastBlinkAt && lastBlinkAt !== lastBlinkRef.current) {
      lastBlinkRef.current = lastBlinkAt;
      setState({
        isWarning: false,
        timeWithoutBlink: 0,
        progress: 0,
      });

      // 타이머 재시작
      if (isInitializedRef.current) {
        startTimer();
      }
      return;
    }

    // 깜빡임이 감지된 적이 없으면 타이머 시작하지 않음
    if (!lastBlinkAt) {
      clearTimer();
      return;
    }

    // 초기화되지 않은 경우에만 타이머 시작
    if (!isInitializedRef.current) {
      lastBlinkRef.current = lastBlinkAt;
      isInitializedRef.current = true;
      startTimer();
    }

    return () => {
      clearTimer();
    };
  }, [lastBlinkAt, startTimer, clearTimer]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return state;
}
