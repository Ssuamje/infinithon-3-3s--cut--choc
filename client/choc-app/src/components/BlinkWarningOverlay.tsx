// src/components/BlinkWarningOverlay.tsx
import React from "react";
import styled, { keyframes, css } from "styled-components";

interface BlinkWarningOverlayProps {
  isVisible: boolean;
  progress: number; // 0-100%
  timeWithoutBlink: number; // milliseconds
  combo?: number;
  score?: number;
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

const progressFill = keyframes`
  from { width: 0%; }
  to { width: 100%; }
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
      ? css`${slideDown} 0.3s ease-out`
      : "none"};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const CompactHUD = styled.div<{ $isWarning: boolean }>`
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(234, 88, 12, 0.9));
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 107, 53, 0.8);
  border-radius: 16px;
  padding: 12px 16px;
  min-width: 280px;
  max-width: 400px;
  
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 4px 16px rgba(249, 115, 22, 0.3),
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
  combo = 0,
  score = 0,
}) => {
  const secondsWithoutBlink = Math.floor(timeWithoutBlink / 1000);
  const isWarning = progress >= 100;

  return (
    <OverlayContainer $isVisible={isVisible}>
      <CompactHUD $isWarning={isWarning}>
        <Header>
          <WarningIcon>
            {isWarning ? "⚠️" : "👁️"}
            <WarningText>
              {isWarning ? "깜빡여 주세요!" : "눈깜빡임 모니터링"}
            </WarningText>
          </WarningIcon>
          <TimeDisplay>
            {secondsWithoutBlink}초
          </TimeDisplay>
        </Header>
        
        <ProgressContainer>
          <ProgressBar $progress={progress} />
        </ProgressContainer>
        
        <StatsRow>
          <StatItem>
            🔥 콤보: <StatValue>{combo}</StatValue>
          </StatItem>
          <StatItem>
            🏆 점수: <StatValue>{score.toLocaleString()}</StatValue>
          </StatItem>
        </StatsRow>
      </CompactHUD>
    </OverlayContainer>
  );
};