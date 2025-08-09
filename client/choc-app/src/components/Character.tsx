// src/components/Character.tsx
import React from "react";

interface CharacterProps {
  isBlinking: boolean;
}

export function Character({ isBlinking }: CharacterProps) {
  return (
    <div style={styles.character}>
      <div style={styles.characterFace}>
        {/* 눈 */}
        <div style={styles.eyes}>
          <div
            style={{
              ...styles.eye,
              ...(isBlinking ? styles.eyeClosed : styles.eyeOpen),
            }}
          >
            {!isBlinking && <div style={styles.pupil}></div>}
          </div>
          <div
            style={{
              ...styles.eye,
              ...(isBlinking ? styles.eyeClosed : styles.eyeOpen),
            }}
          >
            {!isBlinking && <div style={styles.pupil}></div>}
          </div>
        </div>
        {/* 입 */}
        <div style={styles.mouth}></div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  character: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  characterFace: {
    position: "relative",
    width: "clamp(120px, 25vw, 200px)", // 반응형 크기
    height: "clamp(120px, 25vw, 200px)", // 반응형 크기
    background: "#FFA500",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "clamp(2px, 0.5vw, 3px) solid #FF8C00", // 반응형 border
  },
  eyes: {
    position: "absolute",
    top: "35%",
    left: "20%",
    width: "60%",
    height: "20%",
    display: "flex",
    justifyContent: "space-between",
    gap: "clamp(12px, 2.5vw, 20px)", // 반응형 gap
  },
  eye: {
    width: "clamp(24px, 4vw, 30px)", // 반응형 크기
    height: "clamp(24px, 4vw, 30px)", // 반응형 크기
    background: "#fff",
    borderRadius: "50%",
    border: "clamp(1px, 0.3vw, 2px) solid #333", // 반응형 border
    position: "relative",
  },
  eyeOpen: {
    background: "#fff",
  },
  eyeClosed: {
    background: "#fff",
    transform: "scaleY(0.1)",
    transition: "transform 0.1s ease-in-out",
  },
  pupil: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "clamp(8px, 1.2vw, 12px)", // 반응형 크기
    height: "clamp(8px, 1.2vw, 12px)", // 반응형 크기
    background: "#000",
    borderRadius: "50%",
  },
  mouth: {
    position: "absolute",
    bottom: "25%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "clamp(24px, 5vw, 40px)", // 반응형 크기
    height: "clamp(12px, 2.5vw, 20px)", // 반응형 크기
    background: "#333",
    borderRadius: "0 0 40px 40px",
  },
};
