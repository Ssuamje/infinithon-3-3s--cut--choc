// src/hooks/useBlinkTimer.ts
import { useEffect, useRef, useState } from "react";

interface BlinkTimerState {
  isWarning: boolean;
  timeWithoutBlink: number;
  progress: number; // 0-100%
}

export function useBlinkTimer(lastBlinkAt: number | null, warningThreshold: number = 6000) {
  const [state, setState] = useState<BlinkTimerState>({
    isWarning: false,
    timeWithoutBlink: 0,
    progress: 0,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlinkRef = useRef<number | null>(null);

  useEffect(() => {
    // 새로운 깜빡임이 감지되면 타이머 리셋
    if (lastBlinkAt && lastBlinkAt !== lastBlinkRef.current) {
      lastBlinkRef.current = lastBlinkAt;
      setState({
        isWarning: false,
        timeWithoutBlink: 0,
        progress: 0,
      });
      return;
    }

    // 깜빡임이 감지된 적이 없으면 타이머 시작하지 않음
    if (!lastBlinkAt) return;

    // 타이머 시작
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastBlink = now - lastBlinkAt;
      const progress = Math.min((timeSinceLastBlink / warningThreshold) * 100, 100);
      const isWarning = timeSinceLastBlink >= warningThreshold;

      setState({
        isWarning,
        timeWithoutBlink: timeSinceLastBlink,
        progress,
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastBlinkAt, warningThreshold]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return state;
}