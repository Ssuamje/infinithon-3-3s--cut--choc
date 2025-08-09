// src/hooks/useBlinkTimer.ts
import { useEffect, useRef, useState, useCallback } from "react";

interface BlinkTimerState {
  isWarning: boolean;
  timeWithoutBlink: number;
  progress: number; // 0-100% (오버레이 시간 진행률)
  blinkCount: number; // 깜빡임 횟수 추가
  isCompleted: boolean; // 완료 상태 추가 (성공/실패)
}

export function useBlinkTimer(
  lastBlinkAt: number | null,
  warningThreshold: number = 5000, // 5초로 변경 (오버레이 시간)
  hearts: number = 3, // 하트 수 추가
  blinkThreshold: number = 5, // 눈물 복구에 필요한 깜빡임 횟수
  onComplete?: (success: boolean, blinkCount: number) => void, // 완료 콜백 추가
  overlayTimeRemaining: number = 0 // 오버레이 시간 추가
) {
  const [state, setState] = useState<BlinkTimerState>({
    isWarning: false,
    timeWithoutBlink: 0,
    progress: 0, // 0-100% (오버레이 시간 진행률)
    blinkCount: 0, // 깜빡임 횟수
    isCompleted: false, // 완료 상태
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlinkRef = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const lastHeartsRef = useRef<number>(hearts);
  const onCompleteRef = useRef(onComplete);
  const challengeStartTimeRef = useRef<number | null>(null); // 도전 시작 시간
  const stateRef = useRef<BlinkTimerState>(state); // 현재 상태를 ref로 관리

  // 상태가 변경될 때마다 ref 업데이트
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 콜백 함수 업데이트
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // 타이머 정리 함수
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // 도전 시작 시간도 리셋
    challengeStartTimeRef.current = null;
  }, []);

  // 타이머 시작 함수
  const startTimer = useCallback(() => {
    clearTimer();

    intervalRef.current = setInterval(() => {
      const now = Date.now();

      // 도전 시작 시간이 없으면 계산하지 않음
      if (!challengeStartTimeRef.current) return;

      const timeSinceChallengeStart = now - challengeStartTimeRef.current;
      const progress = Math.min(
        (timeSinceChallengeStart / warningThreshold) * 100,
        100
      );
      const isWarning = timeSinceChallengeStart >= warningThreshold;

      // 5초 제한 시간이 끝났을 때 결과 처리
      if (isWarning && !stateRef.current.isCompleted) {
        const success = stateRef.current.blinkCount >= blinkThreshold;
        console.log(
          `⏰ 시간 초과! ${stateRef.current.blinkCount}/5 - ${
            success ? "성공" : "실패"
          }`
        );

        // 즉시 완료 상태로 설정하여 오버레이를 숨김
        setState((prevState) => ({
          ...prevState,
          isWarning,
          timeWithoutBlink: timeSinceChallengeStart,
          progress,
          isCompleted: true,
        }));

        // 콜백 함수 호출
        if (onCompleteRef.current) {
          onCompleteRef.current(success, stateRef.current.blinkCount);
        }

        // 타이머 정리
        clearTimer();
        return;
      }

      // 깜빡임 횟수가 임계값에 도달했을 때 성공 처리
      if (
        stateRef.current.blinkCount >= blinkThreshold &&
        !stateRef.current.isCompleted
      ) {
        console.log(
          `🎉 성공! ${stateRef.current.blinkCount}/5 깜빡임으로 눈물 복구`
        );

        setState((prevState) => ({
          ...prevState,
          isCompleted: true,
        }));

        // 성공 콜백 호출
        if (onCompleteRef.current) {
          onCompleteRef.current(true, stateRef.current.blinkCount);
        }

        // 타이머 정리
        clearTimer();
        return;
      }

      // 상태 업데이트 - 항상 시간과 진행률을 업데이트
      setState((prevState) => ({
        ...prevState,
        isWarning,
        timeWithoutBlink: timeSinceChallengeStart,
        progress,
      }));
    }, 50); // 50ms마다 업데이트하여 더 부드럽게
  }, [warningThreshold, clearTimer, blinkThreshold]); // overlayTimeRemaining 의존성 제거

  useEffect(() => {
    // 이미 완료된 상태라면 더 이상 처리하지 않음
    if (state.isCompleted) {
      return;
    }

    console.log(`🔄 useBlinkTimer useEffect 실행:`, {
      lastBlinkAt,
      overlayTimeRemaining,
      challengeStartTime: challengeStartTimeRef.current,
      lastBlinkRef: lastBlinkRef.current,
      state: state,
    });

    // 오버레이가 시작되었을 때 (overlayTimeRemaining > 0) 새로운 도전 시작
    if (overlayTimeRemaining > 0 && challengeStartTimeRef.current === null) {
      console.log(`🚀 오버레이 시작! 새로운 도전 시작`);
      console.log(`오버레이 시작 시 lastBlinkAt: ${lastBlinkAt}, lastBlinkRef: ${lastBlinkRef.current}`);
      
      challengeStartTimeRef.current = Date.now(); // 도전 시작 시간 설정

      // lastBlinkRef를 현재 lastBlinkAt으로 설정 (다음 깜빡임부터 감지하기 위해)
      lastBlinkRef.current = lastBlinkAt;

      setState({
        isWarning: false,
        timeWithoutBlink: 0,
        progress: 0,
        blinkCount: 0, // 깜빡임 횟수 리셋
        isCompleted: false, // 완료 상태도 리셋
      });

      // 타이머 시작
      startTimer();
      return;
    }

    // 오버레이가 종료되었을 때 (overlayTimeRemaining === 0) 타이머 정리
    if (overlayTimeRemaining === 0 && challengeStartTimeRef.current !== null) {
      console.log(`🏁 오버레이 종료! 타이머 정리`);
      
      // 오버레이가 종료될 때 깜빡임 횟수가 임계값에 못 미쳤다면 실패 처리
      if (stateRef.current.blinkCount < blinkThreshold && onCompleteRef.current) {
        console.log(`💔 오버레이 종료로 인한 실패: ${stateRef.current.blinkCount}/5`);
        onCompleteRef.current(false, stateRef.current.blinkCount);
      }
      
      clearTimer();
      challengeStartTimeRef.current = null; // 도전 시작 시간도 리셋
      setState({
        isWarning: false,
        timeWithoutBlink: 0,
        progress: 0,
        blinkCount: 0,
        isCompleted: false,
      });
      return;
    }

    // 새로운 깜빡임이 감지되면 깜빡임 횟수 증가 (오버레이 중에만)
    if (
      lastBlinkAt &&
      lastBlinkAt !== lastBlinkRef.current &&
      overlayTimeRemaining > 0 &&
      challengeStartTimeRef.current !== null // 도전이 시작된 상태여야 함
    ) {
      console.log(`👁️ 깜빡임 감지! lastBlinkAt: ${lastBlinkAt}, lastBlinkRef: ${lastBlinkRef.current}`);
      lastBlinkRef.current = lastBlinkAt;

      setState((prevState) => {
        const newBlinkCount = prevState.blinkCount + 1;
        console.log(`👁️ 깜빡임 횟수: ${newBlinkCount}/5`);

        // 5번에 도달했지만 아직 시간이 남아있다면 성공 처리
        if (newBlinkCount >= blinkThreshold && !prevState.isCompleted) {
          console.log(`🎉 성공! ${newBlinkCount}번 깜빡임으로 눈물 복구`);

          // 성공 콜백 호출
          if (onCompleteRef.current) {
            onCompleteRef.current(true, newBlinkCount);
          }

          // 타이머 정리
          clearTimer();
        }

        return {
          ...prevState,
          blinkCount: newBlinkCount,
        };
      });

      return;
    } else {
      // 디버깅: 왜 조건을 통과하지 못하는지 확인
      if (overlayTimeRemaining > 0) {
        console.log(`❌ 깜빡임 감지 실패:`, {
          lastBlinkAt: !!lastBlinkAt,
          lastBlinkAtValue: lastBlinkAt,
          lastBlinkRef: lastBlinkRef.current,
          isDifferent: lastBlinkAt !== lastBlinkRef.current,
          overlayTimeRemaining: overlayTimeRemaining,
          overlayTimeRemainingCheck: overlayTimeRemaining > 0,
          challengeStartTime: challengeStartTimeRef.current !== null,
          challengeStartTimeValue: challengeStartTimeRef.current,
        });
      }
    }

    // 하트를 잃었을 때 (하트 수가 줄어들었을 때) 새로운 도전 시작
    if (hearts < lastHeartsRef.current) {
      lastHeartsRef.current = hearts;
      challengeStartTimeRef.current = Date.now(); // 도전 시작 시간 설정

      setState({
        isWarning: false,
        timeWithoutBlink: 0,
        progress: 0,
        blinkCount: 0, // 하트를 잃으면 깜빡임 횟수도 리셋
        isCompleted: false, // 완료 상태도 리셋
      });

      // 타이머 시작
      startTimer();
      return;
    }

    // 초기화되지 않은 경우에만 타이머 시작 (깜빡임 감지 여부와 관계없이)
    if (!isInitializedRef.current) {
      if (lastBlinkAt) {
        lastBlinkRef.current = lastBlinkAt;
      }
      lastHeartsRef.current = hearts;
      isInitializedRef.current = true;

      // 하트가 이미 3개 미만이면 도전 시작
      if (hearts < 3) {
        challengeStartTimeRef.current = Date.now();
        startTimer();
      }
    }
  }, [
    lastBlinkAt,
    hearts,
    blinkThreshold,
    clearTimer,
    state.isCompleted,
    overlayTimeRemaining,
    startTimer, // startTimer 의존성 추가
  ]);

  // isCompleted가 true가 되었을 때 상태 초기화
  useEffect(() => {
    if (state.isCompleted) {
      // 완료된 후 상태 초기화
      const timer = setTimeout(() => {
        clearTimer(); // 타이머 정리
        setState({
          isWarning: false,
          timeWithoutBlink: 0,
          progress: 0,
          blinkCount: 0,
          isCompleted: false,
        });
      }, 100); // 100ms 후 초기화하여 UI가 업데이트될 시간을 줌

      return () => clearTimeout(timer);
    }
  }, [state.isCompleted, clearTimer]);

  return state;
}
