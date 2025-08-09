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
    timeRemaining: 6000, // 6초 (게임 시간)
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
        gamePhase: "idle",
        countdown: null,
        timeRemaining: newHearts > 0 ? GAME_DURATION : 0, // 게임 오버면 시간 0, 아니면 시간 리셋
      };
    });
  };

  // 하트 복구 (사용하지 않음 - 오버레이 제거)
  const restoreHeart = () => {
    setGameState((prev) => {
      const newHearts = Math.min(3, prev.hearts + 1);
      return {
        ...prev,
        hearts: newHearts,
        isAlive: newHearts > 0,
      };
    });
  };


  // 게임 타이머 관리
  useEffect(() => {
    if (gameState.isPaused || !gameState.isAlive) return;

    const updateTimer = () => {
      setGameState((prev) => {
        if (prev.timeRemaining <= 0) {
          return prev;
        }

        const newTimeRemaining = Math.max(0, prev.timeRemaining - 100);
        let newPhase = prev.gamePhase;
        let newCountdown = prev.countdown;
        let newHearts = prev.hearts;
        let isStillAlive = prev.isAlive;

        // 시간이 0에 도달하면 하트 감소
        if (prev.timeRemaining > 0 && newTimeRemaining === 0) {
          newHearts = Math.max(0, prev.hearts - 1);
          isStillAlive = newHearts > 0;
        }

        // 게임 페이즈 결정
        if (newTimeRemaining <= DANGER_THRESHOLD && newTimeRemaining > 0) {
          newPhase = "danger";
          if (prev.countdown === null) {
            newCountdown = 3;
          }
        } else if (newTimeRemaining <= WARNING_THRESHOLD && newTimeRemaining > 0) {
          newPhase = "warning";
          newCountdown = null;
        } else if (newTimeRemaining > 0) {
          newPhase = "idle";
          newCountdown = null;
        }

        return {
          ...prev,
          hearts: newHearts,
          isAlive: isStillAlive,
          timeRemaining: newTimeRemaining,
          gamePhase: newPhase,
          countdown: newCountdown,
          combo: newTimeRemaining === 0 ? 0 : prev.combo, // 시간 0이면 콤보 리셋
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
    if (
      gameState.countdown === null ||
      gameState.countdown <= 0 ||
      !gameState.isAlive
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
  }, [gameState.countdown, gameState.isAlive]);

  // 깜빡임 감지 및 콤보 처리
  useEffect(() => {
    if (gameState.isPaused || !gameState.isAlive) return;

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

          // 깜빡이면 항상 시간 리셋
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
  ]);


  // 게임 페이즈 체크 (피버 모드 + 시간 상태 결합)
  useEffect(() => {
    setGameState((prev) => {
      let newPhase = prev.gamePhase;
      
      // 피버 모드 체크
      const isFeverCombo = prev.combo >= FEVER_THRESHOLD;
      
      // 시간에 따른 기본 페이즈 결정
      let timeBasedPhase = "idle";
      if (prev.timeRemaining <= DANGER_THRESHOLD) {
        timeBasedPhase = "danger";
      } else if (prev.timeRemaining <= WARNING_THRESHOLD) {
        timeBasedPhase = "warning";
      }
      
      // 피버 모드이면서 동시에 시간 상태도 반영
      if (isFeverCombo) {
        // 피버 모드 중에도 시간이 위험하면 danger, 경고면 warning
        if (timeBasedPhase === "danger") {
          newPhase = "danger";
        } else if (timeBasedPhase === "warning") {
          newPhase = "warning";  
        } else {
          newPhase = "fever";
        }
      } else {
        newPhase = timeBasedPhase;
      }
      
      if (newPhase !== prev.gamePhase) {
        return { ...prev, gamePhase: newPhase };
      }
      
      return prev;
    });
  }, [gameState.combo, gameState.timeRemaining]);

  return {
    gameState,
    loseHeart,
    resetGame,
    togglePause,
    restoreHeart,
  };
}
