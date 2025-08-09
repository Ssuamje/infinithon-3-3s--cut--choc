// src/useGameLogic.ts
import { useEffect, useState, useRef } from "react";

export interface GameState {
  hearts: number;
  combo: number;
  score: number;
  isAlive: boolean;
  lastComboTime: number | null;
}

export function useGameLogic(currentBlinks: number, lastBlinkAt: number | null) {
  const [gameState, setGameState] = useState<GameState>({
    hearts: 3,
    combo: 0,
    score: 0,
    isAlive: true,
    lastComboTime: null,
  });

  const prevBlinksRef = useRef(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 콤보 시간 제한 (3초)
  const COMBO_TIMEOUT = 3000;
  
  // 부활에 필요한 깜빡임 횟수
  const REVIVAL_BLINKS = 10;

  useEffect(() => {
    // 새로운 깜빡임이 감지되었을 때
    if (currentBlinks > prevBlinksRef.current && lastBlinkAt) {
      const newBlinks = currentBlinks - prevBlinksRef.current;
      
      setGameState(prev => {
        const now = Date.now();
        let newCombo = prev.combo;
        let newScore = prev.score;
        let newHearts = prev.hearts;
        let newIsAlive = prev.isAlive;

        if (prev.isAlive) {
          // 살아있을 때의 로직
          const timeSinceLastCombo = prev.lastComboTime ? (now - prev.lastComboTime) : COMBO_TIMEOUT + 1;
          
          if (timeSinceLastCombo <= COMBO_TIMEOUT) {
            // 콤보 유지
            newCombo = prev.combo + newBlinks;
          } else {
            // 새로운 콤보 시작
            newCombo = newBlinks;
          }

          // 점수 계산 (콤보에 따라 점수 배율 적용)
          const comboMultiplier = Math.floor(newCombo / 5) + 1; // 5콤보마다 배율 증가
          newScore = prev.score + (newBlinks * 10 * comboMultiplier);

        } else {
          // 죽었을 때의 부활 로직
          if (currentBlinks > 0 && currentBlinks % REVIVAL_BLINKS === 0) {
            // 10번째 깜빡임마다 하트 1개 회복
            newHearts = Math.min(3, prev.hearts + 1);
            if (newHearts > 0) {
              newIsAlive = true;
              newCombo = 0; // 부활 시 콤보 리셋
            }
          }
        }

        return {
          ...prev,
          combo: newCombo,
          score: newScore,
          hearts: newHearts,
          isAlive: newIsAlive,
          lastComboTime: prev.isAlive ? now : prev.lastComboTime,
        };
      });

      // 콤보 타임아웃 설정
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }

      if (gameState.isAlive) {
        comboTimeoutRef.current = setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            combo: 0,
            lastComboTime: null,
          }));
        }, COMBO_TIMEOUT);
      }

      prevBlinksRef.current = currentBlinks;
    }
  }, [currentBlinks, lastBlinkAt, gameState.isAlive]);

  // 하트 감소 함수 (게임 오버 시나리오용)
  const loseHeart = () => {
    setGameState(prev => {
      const newHearts = Math.max(0, prev.hearts - 1);
      return {
        ...prev,
        hearts: newHearts,
        isAlive: newHearts > 0,
        combo: 0,
        lastComboTime: null,
      };
    });
  };

  // 게임 리셋 함수
  const resetGame = () => {
    setGameState({
      hearts: 3,
      combo: 0,
      score: 0,
      isAlive: true,
      lastComboTime: null,
    });
    prevBlinksRef.current = 0;
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  return {
    gameState,
    loseHeart,
    resetGame,
    revivalProgress: gameState.isAlive ? 0 : (currentBlinks % REVIVAL_BLINKS),
    revivalRequired: REVIVAL_BLINKS,
  };
}