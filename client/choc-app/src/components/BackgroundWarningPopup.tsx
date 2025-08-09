// src/components/BackgroundWarningPopup.tsx
import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

interface WarningState {
  isVisible: boolean;
  progress: number;
  timeWithoutBlink: number;
  combo: number;
  score: number;
  totalBlinks: number;
}

export const BackgroundWarningPopup = () => {
  const [warningState, setWarningState] = useState<WarningState>({
    isVisible: false,
    progress: 0,
    timeWithoutBlink: 0,
    combo: 0,
    score: 0,
    totalBlinks: 0,
  });

  const [isAppInBackground, setIsAppInBackground] = useState(false);

  useEffect(() => {
    // 앱이 백그라운드에 있는지 감지
    const handleVisibilityChange = () => {
      setIsAppInBackground(document.hidden);
    };

    // 페이지 가시성 변경 감지
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 초기 상태 설정
    setIsAppInBackground(document.hidden);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // 메인 프로세스로부터 경고 상태 업데이트 받기
    const handleWarningStateUpdate = (
      event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const state = args[0] as WarningState;
      setWarningState(state);
    };

    // Electron 환경에서만 이벤트 리스너 추가
    if (window.electronAPI) {
      window.electronAPI.on("update-warning-state", handleWarningStateUpdate);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener(
          "update-warning-state",
          handleWarningStateUpdate
        );
      }
    };
  }, []);

  // 백그라운드에서 경고가 필요할 때 시스템 알림 표시
  useEffect(() => {
    if (
      isAppInBackground &&
      warningState.isVisible &&
      warningState.progress > 80
    ) {
      // 시스템 알림 표시
      if ("Notification" in window && Notification.permission === "granted") {
        const notification = new Notification("눈 깜빡임 경고!", {
          body: `경과 시간: ${Math.floor(
            warningState.timeWithoutBlink / 1000
          )}초\n콤보: ${warningState.combo}`,
          icon: "/path/to/icon.png", // 아이콘 경로 설정 필요
          tag: "blink-warning",
          requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
          silent: false,
        });

        // 알림 클릭 시 앱 포커스
        notification.onclick = () => {
          if (window.electronAPI) {
            window.electronAPI.send("focus-app");
          }
          notification.close();
        };

        // 10초 후 자동으로 닫기
        setTimeout(() => {
          notification.close();
        }, 10000);
      }
    }
  }, [
    isAppInBackground,
    warningState.isVisible,
    warningState.progress,
    warningState.timeWithoutBlink,
    warningState.combo,
  ]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const isWarning = warningState.progress > 80;

  // 앱이 백그라운드에 있을 때는 팝업을 표시하지 않음
  if (isAppInBackground) {
    return null;
  }

  return (
    <WarningContainer
      $isVisible={warningState.isVisible}
      $isWarning={isWarning}
    >
      <WarningCard $isWarning={isWarning}>
        <Header>
          <WarningIcon>
            ⚠️ <WarningText>눈 깜빡임 필요!</WarningText>
          </WarningIcon>
        </Header>

        <ProgressBar>
          <ProgressFill $progress={warningState.progress} />
        </ProgressBar>

        <Stats>
          <StatItem>
            <StatValue>{formatTime(warningState.timeWithoutBlink)}</StatValue>
            <StatLabel>경과</StatLabel>
          </StatItem>

          <StatItem>
            <StatValue>{warningState.combo}</StatValue>
            <StatLabel>콤보</StatLabel>
          </StatItem>

          <StatItem>
            <StatValue>{warningState.score}</StatValue>
            <StatLabel>점수</StatLabel>
          </StatItem>

          <StatItem>
            <StatValue>{warningState.totalBlinks}</StatValue>
            <StatLabel>총 깜빡임</StatLabel>
          </StatItem>
        </Stats>
      </WarningCard>
    </WarningContainer>
  );
};

// 애니메이션
const pulseWarning = keyframes`
  0%, 100% {
    background-color: rgba(255, 107, 53, 0.95);
    border-color: rgba(255, 107, 53, 0.9);
    transform: scale(1);
  }
  50% {
    background-color: rgba(255, 80, 80, 1);
    border-color: rgba(255, 80, 80, 1);
    transform: scale(1.02);
  }
`;

const slideIn = keyframes`
  from {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
`;

// 스타일 컴포넌트
const WarningContainer = styled.div<{
  $isVisible: boolean;
  $isWarning: boolean;
}>`
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 120px;
  z-index: 9999;
  pointer-events: none;

  visibility: ${({ $isVisible }) => ($isVisible ? "visible" : "hidden")};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  animation: ${({ $isVisible, $isWarning }) => {
    if (!$isVisible) return "none";
    if ($isWarning)
      return css`
        ${slideIn} 0.4s ease-out, ${shake} 0.5s ease-in-out 0.4s
      `;
    return css`
      ${slideIn} 0.4s ease-out
    `;
  }};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const WarningCard = styled.div<{ $isWarning: boolean }>`
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.95),
    rgba(234, 88, 12, 0.9)
  );
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 107, 53, 0.8);
  border-radius: 16px;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;

  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(249, 115, 22, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);

  ${({ $isWarning }) =>
    $isWarning &&
    css`
      animation: ${pulseWarning} 2s ease-in-out infinite;
    `}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const WarningIcon = styled.div`
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WarningText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: linear-gradient(90deg, #ff6b35, #ff5050);
  border-radius: 3px;
  transition: width 0.3s ease;
`;

const Stats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const StatValue = styled.span`
  font-weight: 700;
  font-size: 14px;
`;

const StatLabel = styled.span`
  font-size: 10px;
  opacity: 0.9;
`;
