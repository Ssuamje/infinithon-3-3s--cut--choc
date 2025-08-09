// src/useGameLogic.ts
import { useEffect, useState, useRef } from "react";

export interface GameState {
  hearts: number;
  combo: number;
  score: number;
  isAlive: boolean;
  lastComboTime: number | null;
  gamePhase: "idle" | "warning" | "danger" | "fever";
  timeRemaining: number; // 게임 시간 (깜빡임으로 연장되는 시간)
  overlayTimeRemaining: number; // 오버레이 시간 (하트 복구용)
  countdown: number | null;
  isPaused: boolean;
  hasShownOverlay: boolean; // 오버레이를 이미 보여줬는지 여부
}

export function useGameLogic(
  currentBlinks: number,
  lastBlinkAt: number | null
) {
  const [gameState, setGameState] = useState<GameState>({
    hearts: 3,
    combo: 0,
    score: 0,
    isAlive: true,
    lastComboTime: null,
    gamePhase: "idle",
    timeRemaining: 6000, // 6초 (게임 시간)
    overlayTimeRemaining: 0, // 오버레이 시간 (초기값 0)
    countdown: null,
    isPaused: false,
    hasShownOverlay: false, // 오버레이를 아직 보여주지 않음
  });

  const prevBlinksRef = useRef(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null); // 오버레이 타이머

  // 게임 상수
  const GAME_DURATION = 6000; // 6초
  const OVERLAY_DURATION = 5000; // 5초 (오버레이 시간)
  const WARNING_THRESHOLD = 3000; // 3초 (경고 시작)
  const DANGER_THRESHOLD = 1000; // 1초 (위험)
  const COMBO_TIMEOUT = 3000; // 콤보 타임아웃 3초
  const FEVER_THRESHOLD = 15; // 피버 시작 콤보

  // 오버레이 상태 계산 (시간이 0이 되고 오버레이 시간이 남아있을 때만 활성)
  const isOverlayActive =
    gameState.timeRemaining <= 0 && gameState.overlayTimeRemaining > 0;

  // 게임 일시정지/재개
  const togglePause = () => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  };

  // 게임 리셋
  const resetGame = () => {
    setGameState({
      hearts: 3,
      combo: 0,
      score: 0,
      isAlive: true,
      lastComboTime: null,
      gamePhase: "idle",
      timeRemaining: GAME_DURATION,
      overlayTimeRemaining: 0,
      countdown: null,
      isPaused: false,
      hasShownOverlay: false,
    });
    prevBlinksRef.current = 0;

    // 기존 타이머들 정리
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    if (countdownRef.current) clearTimeout(countdownRef.current);
    if (overlayTimerRef.current) clearInterval(overlayTimerRef.current);
  };

  // 하트 감소
  const loseHeart = () => {
    setGameState((prev) => {
      const newHearts = Math.max(0, prev.hearts - 1);
      return {
        ...prev,
        hearts: newHearts,
        isAlive: newHearts > 0,
        combo: 0,
        gamePhase: "idle",
        countdown: null,
        hasShownOverlay: false, // 하트 감소 시 오버레이 상태 리셋
      };
    });
  };

  // 하트 복구 (눈물 복구용)
  const restoreHeart = () => {
    setGameState((prev) => {
      const newHearts = Math.min(3, prev.hearts + 1);
      return {
        ...prev,
        hearts: newHearts,
        isAlive: newHearts > 0,
        overlayTimeRemaining: 0, // 오버레이 시간 종료
        gamePhase: "idle",
        countdown: null,
        hasShownOverlay: false, // 오버레이 상태 리셋
      };
    });
  };

  // 오버레이 타이머 관리 (하트 복구 시간)
  useEffect(() => {
    if (gameState.overlayTimeRemaining > 0) {
      // 오버레이 타이머 시작
      overlayTimerRef.current = setInterval(() => {
        setGameState((prev) => {
          if (prev.overlayTimeRemaining <= 0) {
            return prev;
          }

          const newOverlayTime = Math.max(0, prev.overlayTimeRemaining - 100);

          // 오버레이 시간이 0이 되면 오버레이 종료
          if (newOverlayTime === 0) {
            return {
              ...prev,
              overlayTimeRemaining: 0,
              hasShownOverlay: false, // 오버레이 종료 시 플래그 리셋
              timeRemaining: GAME_DURATION, // 게임 시간 리셋
              gamePhase: "idle",
              countdown: null,
            };
          }

          return {
            ...prev,
            overlayTimeRemaining: newOverlayTime,
          };
        });
      }, 100);
    } else {
      // 오버레이 타이머 정리
      if (overlayTimerRef.current) {
        clearInterval(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    }

    return () => {
      if (overlayTimerRef.current) {
        clearInterval(overlayTimerRef.current);
      }
    };
  }, [gameState.overlayTimeRemaining]);

  // 게임 타이머 관리 (오버레이가 활성일 때는 완전 정지)
  useEffect(() => {
    if (gameState.isPaused || !gameState.isAlive || isOverlayActive) return;

    const updateTimer = () => {
      setGameState((prev) => {
        if (prev.timeRemaining <= 0) {
          return prev;
        }

        const newTimeRemaining = Math.max(0, prev.timeRemaining - 100);
        let newPhase = prev.gamePhase;
        let newCountdown = prev.countdown;

        // 게임 페이즈 결정
        if (newTimeRemaining <= DANGER_THRESHOLD) {
          newPhase = "danger";
          if (prev.countdown === null) {
            newCountdown = 3;
          }
        } else if (newTimeRemaining <= WARNING_THRESHOLD) {
          newPhase = "warning";
          newCountdown = null;
        } else {
          newPhase = "idle";
          newCountdown = null;
        }

        return {
          ...prev,
          timeRemaining: newTimeRemaining,
          gamePhase: newPhase,
          countdown: newCountdown,
        };
      });
    };

    gameTimerRef.current = setInterval(updateTimer, 100);
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState.isPaused, gameState.isAlive, isOverlayActive]);

  // 카운트다운 관리
  useEffect(() => {
    if (
      gameState.countdown === null ||
      gameState.countdown <= 0 ||
      isOverlayActive
    )
      return;

    countdownRef.current = setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        countdown: prev.countdown! - 1,
      }));
    }, 1000);

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [gameState.countdown, isOverlayActive]);

  // 깜빡임 감지 및 콤보 처리 (오버레이 중에도 동작)
  useEffect(() => {
    if (gameState.isPaused) return; // 오버레이 중에도 깜빡임 처리 허용

    // 새로운 깜빡임이 감지되었을 때
    if (currentBlinks > prevBlinksRef.current && lastBlinkAt) {
      const newBlinks = currentBlinks - prevBlinksRef.current;

      setGameState((prev) => {
        const now = Date.now();
        let newCombo = prev.combo;
        let newScore = prev.score;
        let newTimeRemaining = prev.timeRemaining;
        let newPhase = prev.gamePhase;
        let newCountdown = prev.countdown;

        if (prev.isAlive) {
          // 콤보 처리
          const timeSinceLastCombo = prev.lastComboTime
            ? now - prev.lastComboTime
            : COMBO_TIMEOUT + 1;

          if (timeSinceLastCombo <= COMBO_TIMEOUT) {
            newCombo = prev.combo + newBlinks;
          } else {
            newCombo = newBlinks;
          }

          // 점수 계산
          const comboMultiplier = Math.floor(newCombo / 5) + 1;
          newScore = prev.score + newBlinks * 10 * comboMultiplier;

          // 오버레이 중이 아닐 때만 시간 리셋
          if (!isOverlayActive) {
            newTimeRemaining = GAME_DURATION;

            if (newTimeRemaining <= DANGER_THRESHOLD) {
              newPhase = "danger";
              newCountdown = 3;
            } else if (newTimeRemaining <= WARNING_THRESHOLD) {
              newPhase = "warning";
              newCountdown = null;
            } else {
              newPhase = "idle";
              newCountdown = null;
            }
          }
        }

        return {
          ...prev,
          combo: newCombo,
          score: newScore,
          timeRemaining: newTimeRemaining,
          gamePhase: newPhase,
          countdown: newCountdown,
          lastComboTime: prev.isAlive ? now : prev.lastComboTime,
        };
      });

      // 콤보 타임아웃 설정
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      if (gameState.isAlive) {
        comboTimeoutRef.current = setTimeout(() => {
          setGameState((prev) => ({
            ...prev,
            combo: 0,
            lastComboTime: null,
          }));
        }, COMBO_TIMEOUT);
      }

      prevBlinksRef.current = currentBlinks;
    }
  }, [
    currentBlinks,
    lastBlinkAt,
    gameState.isAlive,
    gameState.isPaused,
    isOverlayActive,
  ]);

  // 시간 초과 시 오버레이 시작
  useEffect(() => {
    if (
      gameState.timeRemaining <= 0 &&
      gameState.isAlive &&
      gameState.overlayTimeRemaining === 0 &&
      !gameState.hasShownOverlay
    ) {
      setGameState((prev) => ({
        ...prev,
        overlayTimeRemaining: OVERLAY_DURATION,
        hasShownOverlay: true, // 오버레이 시작 시 플래그 설정
      }));
    }
  }, [
    gameState.timeRemaining,
    gameState.isAlive,
    gameState.overlayTimeRemaining,
    gameState.hasShownOverlay,
  ]);

  // 피버 모드 체크
  useEffect(() => {
    if (gameState.combo >= FEVER_THRESHOLD && gameState.gamePhase !== "fever") {
      setGameState((prev) => ({ ...prev, gamePhase: "fever" }));
    } else if (
      gameState.combo < FEVER_THRESHOLD &&
      gameState.gamePhase === "fever"
    ) {
      setGameState((prev) => ({
        ...prev,
        gamePhase:
          prev.timeRemaining <= DANGER_THRESHOLD
            ? "danger"
            : prev.timeRemaining <= WARNING_THRESHOLD
            ? "warning"
            : "idle",
      }));
    }
  }, [gameState.combo, gameState.gamePhase, gameState.timeRemaining]);

  return {
    gameState,
    loseHeart,
    resetGame,
    togglePause,
    restoreHeart,
  };
}
