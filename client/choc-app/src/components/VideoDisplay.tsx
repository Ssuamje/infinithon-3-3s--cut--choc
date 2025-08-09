// src/components/VideoDisplay.tsx
import React from "react";
import { Character } from "./Character";

interface VideoDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  showFace: boolean;
  showCharacter: boolean;
  mirrored: boolean;
  ready: boolean;
  error: string | null;
  isBlinking: boolean;
}

export function VideoDisplay({
  videoRef,
  showFace,
  showCharacter,
  mirrored,
  ready,
  error,
  isBlinking,
}: VideoDisplayProps) {
  return (
    <div style={styles.videoBox}>
      {/* 얼굴 보기가 켜져있고 캐릭터가 꺼져있을 때만 비디오 표시 */}
      {showFace && !showCharacter && (
        <video
          ref={videoRef}
          style={{
            ...styles.video,
            transform: mirrored ? "scaleX(-1)" : "none",
          }}
          playsInline
          muted
          autoPlay
        />
      )}

      {/* 캐릭터 보기가 켜져있을 때 캐릭터 표시 */}
      {showCharacter && <Character isBlinking={isBlinking} />}

      {/* 얼굴과 캐릭터 모두 꺼져있을 때 빈 화면 */}
      {!showFace && !showCharacter && (
        <div style={styles.emptyScreen}>
          <div style={styles.emptyText}>
            카메라와 캐릭터가 모두 꺼져있습니다
          </div>
        </div>
      )}

      {!ready && !error && <div style={styles.overlay}>카메라 준비 중…</div>}
      {error && <div style={styles.overlay}>에러: {error}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  videoBox: {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    minWidth: "280px",
    aspectRatio: "4/3",
    background: "#000",
    borderRadius: "clamp(8px, 2vw, 12px)", // 반응형 border-radius
    overflow: "hidden",
    margin: "0 auto",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    background: "rgba(0,0,0,0.35)",
    fontSize: "clamp(14px, 3.5vw, 16px)", // 반응형 폰트 크기
  },
  emptyScreen: {
    position: "absolute",
    inset: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    background: "rgba(0,0,0,0.5)",
    fontSize: "clamp(12px, 3vw, 14px)", // 반응형 폰트 크기
  },
  emptyText: {
    color: "#fff",
    textAlign: "center",
  },
};
