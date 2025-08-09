// src/components/ControlPanel.tsx
import React from "react";

interface ControlPanelProps {
  state: "idle" | "loading" | "ready" | "error";
  blinkState: string;
  blinks: number;
  ratioL: number;
  ratioR: number;
  closeT: number;
  openT: number;
  mirrored: boolean;
  showFace: boolean;
  showCharacter: boolean;
  onMirroredChange: (mirrored: boolean) => void;
  onShowFaceChange: (showFace: boolean) => void;
  onShowCharacterChange: (showCharacter: boolean) => void;
  onStopCamera: () => void;
  onStartCamera: () => void;
}

export function ControlPanel({
  state,
  blinkState,
  blinks,
  ratioL,
  ratioR,
  closeT,
  openT,
  mirrored,
  showFace,
  showCharacter,
  onMirroredChange,
  onShowFaceChange,
  onShowCharacterChange,
  onStopCamera,
  onStartCamera,
}: ControlPanelProps) {
  const getBlinkStateColor = () => {
    if (blinkState === "CLOSED" || blinkState === "CLOSING") return "#ff5050";
    if (blinkState === "OPENING") return "#f7b731";
    if (blinkState === "OPEN") return "#21c074";
    return "#999";
  };

  const getBlinkStateText = () => {
    switch (blinkState) {
      case "UNKNOWN":
        return "대기중";
      case "OPEN":
        return "눈뜸";
      case "CLOSING":
        return "감는중";
      case "CLOSED":
        return "눈감음";
      case "OPENING":
        return "뜨는중";
      default:
        return blinkState;
    }
  };

  // 브라우저 환경 정보
  const getEnvironmentInfo = () => {
    const isElectron = navigator.userAgent.includes("Electron");
    const isSecure =
      location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";
    const hasMediaDevices = !!navigator.mediaDevices;

    return {
      isElectron,
      isSecure,
      hasMediaDevices,
      userAgent: isElectron ? "Electron" : "Browser",
    };
  };

  const envInfo = getEnvironmentInfo();

  return (
    <div style={styles.panel}>
      {/* 환경 정보 */}
      <div style={styles.environmentInfo}>
        <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4 }}>
          환경: {envInfo.userAgent} |{envInfo.isSecure ? " 🔒" : " ⚠️"} |
          {envInfo.hasMediaDevices ? " 📹" : " ❌"}
        </div>
      </div>

      <div>
        Cam:{" "}
        <b
          style={{
            color:
              state === "ready"
                ? "#21c074"
                : state === "error"
                ? "#ff5050"
                : "#999",
          }}
        >
          {state}
        </b>
      </div>
      <div>
        State:{" "}
        <b style={{ color: getBlinkStateColor() }}>{getBlinkStateText()}</b>
      </div>
      <div>
        Blinks: <b>{blinks}</b>
      </div>
      <div>
        Ratio L/R: {ratioL.toFixed(3)} / {ratioR.toFixed(3)}
      </div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
        평균: {((ratioL + ratioR) / 2).toFixed(3)}| 임계값: 감음&lt;{closeT} /
        뜸&gt;{openT}
      </div>
      <div style={{ fontSize: 12, color: "#666" }}>
        완전한 깜빡임 사이클 감지 (뜸→감음→뜸)
      </div>

      {/* 설정 토글들 */}
      <div style={styles.settings}>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(e) => onMirroredChange(e.target.checked)}
          />
          미러 모드
        </label>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={showFace}
            onChange={(e) => onShowFaceChange(e.target.checked)}
          />
          얼굴 보기
        </label>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={showCharacter}
            onChange={(e) => onShowCharacterChange(e.target.checked)}
          />
          캐릭터 보기
        </label>
      </div>

      {state === "ready" ? (
        <button style={styles.buttonSecondary} onClick={onStopCamera}>
          중지
        </button>
      ) : (
        <button style={styles.button} onClick={onStartCamera}>
          시작
        </button>
      )}

      {/* 브라우저 문제 해결 팁 */}
      {!envInfo.isSecure && (
        <div style={styles.warning}>
          ⚠️ HTTPS가 필요합니다. localhost에서 실행하거나 HTTPS 환경을
          사용하세요.
        </div>
      )}

      {!envInfo.hasMediaDevices && (
        <div style={styles.warning}>
          ❌ 이 브라우저는 카메라를 지원하지 않습니다.
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    gap: "clamp(8px, 2vw, 12px)", // 반응형 gap
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "clamp(8px, 2vw, 12px)", // 반응형 margin
    background: "#5e5e5e",
    padding: "clamp(8px, 2.5vw, 12px)", // 반응형 padding
    borderRadius: "clamp(6px, 1.5vw, 10px)", // 반응형 border-radius
    fontSize: "clamp(11px, 2.5vw, 13px)", // 반응형 폰트 크기
  },
  environmentInfo: {
    width: "100%",
    marginBottom: "8px",
  },
  warning: {
    width: "100%",
    fontSize: "10px",
    color: "#ff6b35",
    background: "rgba(255, 107, 53, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px",
    marginTop: "8px",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(4px, 1.5vw, 6px)", // 반응형 gap
    fontSize: "clamp(10px, 2.5vw, 12px)", // 반응형 폰트 크기
  },
  button: {
    background: "#21c074",
    color: "white",
    border: "none",
    padding: "clamp(6px 12px, 2vw 4vw, 8px 16px)", // 반응형 padding
    borderRadius: "clamp(3px, 1vw, 4px)", // 반응형 border-radius
    cursor: "pointer",
    fontSize: "clamp(10px, 2.5vw, 12px)", // 반응형 폰트 크기
  },
  buttonSecondary: {
    background: "#ff5050",
    color: "white",
    border: "none",
    padding: "clamp(6px 12px, 2vw 4vw, 8px 16px)", // 반응형 padding
    borderRadius: "clamp(3px, 1vw, 4px)", // 반응형 border-radius
    cursor: "pointer",
    fontSize: "clamp(10px, 2.5vw, 12px)", // 반응형 폰트 크기
  },
  settings: {
    display: "flex",
    gap: "clamp(6px, 1.5vw, 8px)", // 반응형 gap
    marginBottom: "clamp(6px, 1.5vw, 8px)", // 반응형 margin
    flexWrap: "wrap",
  },
};
