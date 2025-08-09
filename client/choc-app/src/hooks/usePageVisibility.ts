// src/hooks/usePageVisibility.ts
import { useState, useEffect } from "react";

export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [lastVisibleTime, setLastVisibleTime] = useState<number>(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const wasVisible = !document.hidden;

      setIsVisible(wasVisible);

      if (wasVisible) {
        // 페이지가 다시 보이게 되었을 때
        setLastVisibleTime(now);
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      setIsVisible(true);
      setLastVisibleTime(now);
    };

    const handleBlur = () => {
      setIsVisible(false);
    };

    // 페이지 가시성 변경 감지
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 윈도우 포커스/블러 감지 (Electron에서 더 정확)
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return {
    isVisible,
    lastVisibleTime,
    timeSinceLastVisible: Date.now() - lastVisibleTime,
  };
}
