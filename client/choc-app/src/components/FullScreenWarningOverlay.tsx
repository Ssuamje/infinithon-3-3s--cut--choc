// src/components/FullScreenWarningOverlay.tsx
import React from "react";
import styled, { keyframes, css } from "styled-components";

interface FullScreenWarningOverlayProps {
  isVisible: boolean;
  totalBlinks: number;
  onBlink: () => void;
}

// 애니메이션
const fadeIn = keyframes`
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 30px rgba(255, 80, 80, 0.5), 0 0 60px rgba(255, 80, 80, 0.3);
  }
  50% {
    box-shadow: 0 0 50px rgba(255, 80, 80, 0.8), 0 0 100px rgba(255, 80, 80, 0.5);
  }
`;

const bounceIn = keyframes`
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.05);
  }
  70% {
    transform: translate(-50%, -50%) scale(0.95);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
`;

// 스타일 컴포넌트
const FullScreenContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  
  visibility: ${({ $isVisible }) => ($isVisible ? "visible" : "hidden")};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  animation: ${({ $isVisible }) =>
    $isVisible
      ? css`${fadeIn} 0.5s ease-out`
      : "none"};
  transition: opacity 0.5s ease, visibility 0.5s ease;
  
  pointer-events: ${({ $isVisible }) => ($isVisible ? "auto" : "none")};
`;

const WarningCard = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  
  background: linear-gradient(135deg, rgba(255, 80, 80, 0.95), rgba(239, 68, 68, 0.9));
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  padding: 40px 48px;
  text-align: center;
  max-width: 480px;
  width: 90vw;
  
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 8px 32px rgba(255, 80, 80, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  
  animation: ${bounceIn} 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55),
             ${pulseGlow} 3s ease-in-out infinite;
`;

const WarningIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
`;

const WarningTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: -0.02em;
`;

const WarningMessage = styled.p`
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 24px;
  font-weight: 500;
  line-height: 1.5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`;

const BlinkCounter = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  padding: 16px 24px;
  margin: 0 0 32px;
  border: 2px solid rgba(255, 255, 255, 0.2);
`;

const BlinkCountLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 4px;
  font-weight: 500;
`;

const BlinkCountNumber = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const BlinkButton = styled.button`
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
  
  border: 2px solid rgba(255, 255, 255, 0.2);
  min-width: 200px;
  
  &:hover {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
  }
`;

const InstructionText = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 16px;
  font-weight: 500;
`;

export const FullScreenWarningOverlay: React.FC<FullScreenWarningOverlayProps> = ({
  isVisible,
  totalBlinks,
  onBlink,
}) => {
  return (
    <FullScreenContainer $isVisible={isVisible}>
      <WarningCard>
        <WarningIcon>⚠️</WarningIcon>
        
        <WarningTitle>눈을 깜빡여 주세요!</WarningTitle>
        
        <WarningMessage>
          6초 동안 눈을 깜빡이지 않았습니다.<br />
          눈 건강을 위해 깜빡임이 필요합니다.
        </WarningMessage>
        
        <BlinkCounter>
          <BlinkCountLabel>총 깜빡임 횟수</BlinkCountLabel>
          <BlinkCountNumber>{totalBlinks}</BlinkCountNumber>
        </BlinkCounter>
        
        <BlinkButton onClick={onBlink}>
          👁️ 눈 깜빡이기
        </BlinkButton>
        
        <InstructionText>
          눈을 깜빡이면 이 화면이 사라집니다
        </InstructionText>
      </WarningCard>
    </FullScreenContainer>
  );
};