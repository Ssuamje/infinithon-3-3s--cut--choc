// src/components/StatusIcon.tsx
import React from "react";
import styled, { keyframes } from "styled-components";

interface StatusIconProps {
  isActive: boolean;
  blinkCount: number;
}

// 애니메이션
const activeGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
  }
`;

const pulseIcon = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
`;

// 스타일 컴포넌트
const IconContainer = styled.div<{ $isActive: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 12px;
  
  background: ${({ $isActive }) =>
    $isActive
      ? "linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.8))"
      : "rgba(107, 114, 128, 0.8)"};
  
  border: 2px solid ${({ $isActive }) =>
    $isActive ? "rgba(16, 185, 129, 0.6)" : "rgba(107, 114, 128, 0.5)"};
  
  border-radius: 24px;
  padding: 8px 16px;
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  
  animation: ${({ $isActive }) =>
    $isActive ? activeGlow + " 2s ease-in-out infinite" : "none"};
  
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }
`;

const StatusDot = styled.div<{ $isActive: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $isActive }) =>
    $isActive
      ? "linear-gradient(135deg, #10b981, #059669)"
      : "#6b7280"};
  
  animation: ${({ $isActive }) =>
    $isActive ? pulseIcon + " 1s ease-in-out infinite" : "none"};
  
  box-shadow: ${({ $isActive }) =>
    $isActive
      ? "0 0 8px rgba(16, 185, 129, 0.6)"
      : "0 0 4px rgba(107, 114, 128, 0.4)"};
`;

const BlinkDisplay = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $isActive }) => ($isActive ? "white" : "#6b7280")};
  text-shadow: ${({ $isActive }) =>
    $isActive ? "0 1px 2px rgba(0, 0, 0, 0.2)" : "none"};
`;

const BlinkIcon = styled.span`
  font-size: 16px;
`;

const BlinkCount = styled.span`
  font-weight: 700;
  min-width: 20px;
  text-align: center;
`;

export const StatusIcon: React.FC<StatusIconProps> = ({
  isActive,
  blinkCount,
}) => {
  return (
    <IconContainer $isActive={isActive}>
      <StatusDot $isActive={isActive} />
      <BlinkDisplay $isActive={isActive}>
        <BlinkIcon>👁️</BlinkIcon>
        <BlinkCount>{blinkCount}</BlinkCount>
      </BlinkDisplay>
    </IconContainer>
  );
};