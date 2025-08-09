// src/components/BlinkWarningOverlay.tsx
import React from "react";
import styled, { keyframes, css } from "styled-components";

interface BlinkWarningOverlayProps {
  isVisible: boolean;
  progress: number; // 0-100%
  timeWithoutBlink: number; // milliseconds
  overlayTimeRemaining: number; // 오버레이 시간 (milliseconds)
  combo?: number;
  score?: number;
  blinkCount?: number; // 깜빡임 횟수 추가
  blinkThreshold?: number; // 눈물 복구에 필요한 깜빡임 횟수 추가
}

// 애니메이션
const pulseWarning = keyframes`
  0%, 100% {
    background-color: rgba(255, 107, 53, 0.9);
    border-color: rgba(255, 107, 53, 0.8);
  }
  50% {
    background-color: rgba(255, 80, 80, 0.95);
    border-color: rgba(255, 80, 80, 0.9);
  }
`;

const slideDown = keyframes`
  from {
    transform: translateX(-50%) translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
`;

// 스타일 컴포넌트
const OverlayContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;

  visibility: ${({ $isVisible }) => ($isVisible ? "visible" : "hidden")};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  animation: ${({ $isVisible }) =>
    $isVisible
      ? css`
          ${slideDown} 0.3s ease-out
        `
      : "none"};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const CompactHUD = styled.div<{ $isWarning: boolean }>`
  background: linear-gradient(
    135deg,
    rgba(249, 115, 22, 0.95),
    rgba(234, 88, 12, 0.9)
  );
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 107, 53, 0.8);
  border-radius: 16px;
  padding: 12px 16px;
  min-width: 280px;
  max-width: 400px;

  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(249, 115, 22, 0.3),
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
  margin-bottom: 8px;
`;

const WarningIcon = styled.div`
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const WarningText = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const TimeDisplay = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const ProgressContainer = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ProgressBar = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: linear-gradient(90deg, #fbbf24, #f59e0b, #dc2626);
  border-radius: 3px;
  transition: width 0.1s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
`;

const StatValue = styled.span`
  color: white;
  font-weight: 600;
`;

export const BlinkWarningOverlay: React.FC<BlinkWarningOverlayProps> = ({
  isVisible,
  progress,
  timeWithoutBlink,
  overlayTimeRemaining,
  combo = 0,
  score = 0,
  blinkCount = 0,
  blinkThreshold = 5,
}) => {
  const secondsWithoutBlink = Math.floor(timeWithoutBlink / 1000);
  const overlaySecondsRemaining = Math.floor(overlayTimeRemaining / 1000);
  const isWarning = progress >= 100;
  const blinkProgress = (blinkCount / blinkThreshold) * 100; // 깜빡임 게이지
  const remainingTime = Math.max(0, 5 - secondsWithoutBlink); // 남은 시간

  // 디버깅용 로그
  console.log("BlinkWarningOverlay render:", {
    isVisible,
    progress: progress.toFixed(2),
    timeWithoutBlink,
    secondsWithoutBlink,
    overlayTimeRemaining,
    overlaySecondsRemaining,
    remainingTime,
    isWarning,
    blinkCount,
    blinkProgress: blinkProgress.toFixed(2),
    timestamp: new Date().toISOString(),
  });

  return (
    <OverlayContainer $isVisible={isVisible}>
      <CompactHUD $isWarning={isWarning}>
        <Header>
          <WarningIcon>
            {isWarning ? "💧" : "💦"}
            <WarningText>
              {isWarning ? "눈물을 잃었습니다!" : "눈물 복구 중..."}
            </WarningText>
          </WarningIcon>
          <TimeDisplay>
            {overlaySecondsRemaining}초 남음 ({secondsWithoutBlink}s 경과)
          </TimeDisplay>
        </Header>

        {/* 깜빡임 게이지 */}
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "4px",

              textAlign: "center",
            }}
          >
            깜빡임: {blinkCount}/{blinkThreshold}
          </div>
          <ProgressContainer>
            <ProgressBar $progress={blinkProgress} />
          </ProgressContainer>
        </div>

        {/* 시간 게이지 */}
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(255, 255, 255, 0.9)",
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            시간 제한: {overlaySecondsRemaining}초 (진행률:{" "}
            {progress.toFixed(1)}%)
          </div>
          <ProgressContainer>
            <ProgressBar $progress={progress} />
          </ProgressContainer>
        </div>

        <StatsRow>
          <StatItem>
            🔥 콤보: <StatValue>{combo}</StatValue>
          </StatItem>
          <StatItem>
            🏆 점수: <StatValue>{score.toLocaleString()}</StatValue>
          </StatItem>
        </StatsRow>

        {/* 눈물 복구 안내 메시지 */}
        <div
          style={{
            marginTop: "8px",
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.9)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {isWarning
            ? "시간 내에 5번 깜빡여서 눈물을 복구하세요!"
            : `${blinkThreshold - blinkCount}번 더 깜빡이면 눈물이 복구됩니다!`}
        </div>
      </CompactHUD>
    </OverlayContainer>
  );
};
