// src/useGameLogic.ts
import { useEffect, useState, useRef } from "react";

export interface GameState {
  hearts: number;
  combo: number;
  score: number;
  isAlive: boolean;
  lastComboTime: number | null;
  gamePhase: "idle" | "warning" | "danger" | "fever";
  timeRemaining: number;
  countdown: number | null;
  isPaused: boolean;
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
    timeRemaining: 6000, // 6초
    countdown: null,
    isPaused: false,
  });

  const prevBlinksRef = useRef(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // 게임 상수
  const GAME_DURATION = 6000; // 6초
  const WARNING_THRESHOLD = 3000; // 3초 (경고 시작)
  const DANGER_THRESHOLD = 1000; // 1초 (위험)
  const COMBO_TIMEOUT = 3000; // 콤보 타임아웃 3초
  const FEVER_THRESHOLD = 15; // 피버 시작 콤보

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
      countdown: null,
      isPaused: false,
    });
    prevBlinksRef.current = 0;

    // 기존 타이머들 정리
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    if (countdownRef.current) clearTimeout(countdownRef.current);
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
        timeRemaining: GAME_DURATION,
        gamePhase: "idle",
        countdown: null,
      };
    });
  };

  // 게임 타이머 관리
  useEffect(() => {
    if (gameState.isPaused || !gameState.isAlive) return;

    const updateTimer = () => {
      setGameState((prev) => {
        if (prev.timeRemaining <= 0) {
          // 시간 초과 - 하트 감소
          return prev;
        }

        const newTimeRemaining = Math.max(0, prev.timeRemaining - 100);
        let newPhase = prev.gamePhase;
        let newCountdown = prev.countdown;

        // 게임 페이즈 결정 (피버 모드가 아닐 때만)
        if (prev.gamePhase !== "fever") {
          if (newTimeRemaining <= DANGER_THRESHOLD) {
            newPhase = "danger";
            // 3-2-1 카운트다운 시작
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
        } else {
          // 피버 모드 중에는 페이즈 유지
          newPhase = "fever";
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
  }, [gameState.isPaused, gameState.isAlive]);

  // 카운트다운 관리
  useEffect(() => {
    if (gameState.countdown === null || gameState.countdown <= 0) return;

    countdownRef.current = setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        countdown: prev.countdown! - 1,
      }));
    }, 1000);

    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [gameState.countdown]);

  // 깜빡임 감지 및 콤보 처리
  useEffect(() => {
    if (gameState.isPaused) return;

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
            // 콤보 유지
            newCombo = prev.combo + newBlinks;
          } else {
            // 새로운 콤보 시작
            newCombo = newBlinks;
          }

          // 점수 계산
          const comboMultiplier = Math.floor(newCombo / 5) + 1;
          newScore = prev.score + newBlinks * 10 * comboMultiplier;

          // 시간 연장 (깜빡임마다 1초씩)
          newTimeRemaining = Math.min(GAME_DURATION, prev.timeRemaining + 1000);

          // 게임 페이즈 재계산 (피버 모드가 아닐 때만)
          if (prev.gamePhase !== "fever") {
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
          } else {
            // 피버 모드 유지
            newPhase = "fever";
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
  }, [currentBlinks, lastBlinkAt, gameState.isAlive, gameState.isPaused]);

  // 시간 초과 시 하트 감소
  useEffect(() => {
    if (gameState.timeRemaining <= 0 && gameState.isAlive) {
      loseHeart();
    }
  }, [gameState.timeRemaining, gameState.isAlive]);

  // 피버 모드 체크 - 안정화된 로직
  useEffect(() => {
    setGameState((prev) => {
      // 피버 모드 진입 조건
      if (prev.combo >= FEVER_THRESHOLD && prev.gamePhase !== "fever") {
        return { ...prev, gamePhase: "fever" };
      }
      
      // 피버 모드 종료 조건 (콤보가 크게 떨어지거나 0이 되었을 때만)
      if (prev.gamePhase === "fever" && prev.combo < FEVER_THRESHOLD - 5) {
        // 시간 기반으로 새로운 페이즈 결정
        let newPhase: "idle" | "warning" | "danger" = "idle";
        if (prev.timeRemaining <= DANGER_THRESHOLD) {
          newPhase = "danger";
        } else if (prev.timeRemaining <= WARNING_THRESHOLD) {
          newPhase = "warning";
        }
        return { ...prev, gamePhase: newPhase };
      }
      
      return prev;
    });
  }, [gameState.combo]);

  return {
    gameState,
    loseHeart,
    resetGame,
    togglePause,
  };
}
