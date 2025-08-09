// src/components/VideoDisplay.tsx
import React, { useEffect } from "react";
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
  // 카메라가 켜져있을 때만 비디오 표시
  useEffect(() => {
    if (videoRef.current && showFace) {
      // 비디오 요소가 보이도록 설정
      videoRef.current.style.display = "block";
    } else if (videoRef.current) {
      // 비디오 요소를 숨김 (깜빡임 감지는 계속 유지)
      videoRef.current.style.display = "none";
    }
  }, [showFace, videoRef]);

  // 둘 다 꺼져있을 때 VideoDisplay 자체를 숨김
  if (!showFace && !showCharacter) {
    return (
      <div style={styles.videoBox}>
        {/* 깜빡임 감지를 위한 숨겨진 비디오 요소 */}
        <video
          ref={videoRef}
          style={{
            ...styles.video,
            transform: mirrored ? "scaleX(-1)" : "none",
            display: "none", // 완전히 숨김
          }}
          playsInline
          muted
          autoPlay
        />

        <div style={styles.emptyScreen}>
          <div style={styles.emptyText}>
            카메라 화면이 숨겨져있습니다
            <br />
            📷 버튼을 눌러 화면을 표시하세요
            <br />
            <br />
            <span style={styles.blinkStatus}>
              {ready && !error ? "👁️ 눈깜빡임 감지 중..." : ""}
            </span>
          </div>
        </div>

        {!ready && !error && <div style={styles.overlay}>카메라 준비 중…</div>}
        {error && <div style={styles.overlay}>에러: {error}</div>}
      </div>
    );
  }

  return (
    <div style={styles.videoBox}>
      {/* 깜빡임 감지를 위한 비디오 요소 */}
      <video
        ref={videoRef}
        style={{
          ...styles.video,
          transform: mirrored ? "scaleX(-1)" : "none",
          display: showFace ? "block" : "none",
        }}
        playsInline
        muted
        autoPlay
      />

      {/* 캐릭터 보기가 켜져있을 때 캐릭터 표시 */}
      {showCharacter && <Character isBlinking={isBlinking} />}

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
    lineHeight: "1.4",
  },
  blinkStatus: {
    fontSize: "clamp(10px, 2.5vw, 12px)",
    color: "#21c074",
    fontWeight: "normal",
    opacity: 0.8,
  },
};
