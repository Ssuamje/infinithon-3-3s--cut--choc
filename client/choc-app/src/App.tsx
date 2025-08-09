// src/App.tsx
import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { useState, useEffect } from "react";
// import { useMicVAD } from "./hooks/useMicVAD";

export default function App() {
  // 카메라 관련 로직
  const { videoRef, state, ready, error, startCamera, stopCamera } = useCamera();

  // 화면 표시 설정 관련 로직
  const {
    mirrored,
    showFace,
    showCharacter,
    setMirrored,
    setShowFace,
    setShowCharacter,
  } = useDisplaySettings();

  // HUD / ControlPanel 표시 상태
  const [showHUD, setShowHUD] = useState(true);
  const [showControlPanel, setShowControlPanel] = useState(true);
  
  // 투명도 관련 상태
  const [opacity, setOpacity] = useState(0.8);
  const [warningOpacity, setWarningOpacity] = useState(0.6);
  const [dangerOpacity, setDangerOpacity] = useState(0.4);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // 깜빡임 감지
  const blink = useBlinkDetector(videoRef);

  // 게임 로직
  const { gameState, resetGame, togglePause, restoreHeart, loseHeart } =
    useGameLogic(blink.blinks, blink.lastBlinkAt);

  // 🎤 VAD 상태 (표시용)
  // const vad = useMicVAD(true);
  
  // 투명도 변경 이벤트 리스너
  useEffect(() => {
    const handleOpacityChange = (event: any) => {
      const { type, opacity: newOpacity } = event.detail;
      
      switch (type) {
        case 'normal':
          setOpacity(newOpacity);
          break;
        case 'warning':
          setWarningOpacity(newOpacity);
          break;
        case 'danger':
          setDangerOpacity(newOpacity);
          break;
        default:
          setOpacity(newOpacity);
      }
    };
    
    window.addEventListener('opacityChange', handleOpacityChange);
    return () => {
      window.removeEventListener('opacityChange', handleOpacityChange);
    };
  }, []);

  const isBlinking =
    blink.state === "CLOSED" || blink.state === "CLOSING";

  // 카메라 표시 토글 (스트림은 유지)
  const toggleCamera = () => {
    if (showFace) {
      setShowFace(false);
    } else {
      setShowFace(true);
      if (state !== "ready") {
        startCamera();
      }
    }
  };

  // HUD 표시 문자열
  const hudText = (() => {
    const avg = isFinite(blink.avgRatio) ? blink.avgRatio : 0;
    const min = isFinite(blink.windowMin) ? blink.windowMin : 0;
    const max = isFinite(blink.windowMax) ? blink.windowMax : 0;
    const lastTs = blink.lastCalibratedAt
      ? new Date(blink.lastCalibratedAt).toLocaleTimeString()
      : "-";

    return `평균: ${avg.toFixed(3)} | 임계값: 감음<${blink.CLOSE_T.toFixed(
      2
    )} / 뜸>${blink.OPEN_T.toFixed(
      2
    )} | 최솟값: ${min.toFixed(3)} / 최댓값: ${max.toFixed(
      3
    )} | 최근 갱신: ${lastTs}`;
  })();

  return (
    <div style={styles.wrap}>
      {/* === VAD 상태 (임시 표시) === */}
      {/* <div style={{ fontSize: 12, marginBottom: 8 }}>
        VAD: {vad.connected ? "● CONNECTED" : "○ DISCONNECTED"}
        {" | "}inSpeech: {vad.inSpeech ? "YES" : "no"}
        {" | "}p={vad.lastProb.toFixed(3)}
        {vad.error && (
          <span style={{ color: "red" }}>{" | "}{vad.error}</span>
        )}
      </div> */}

      {/* 디버깅용 로그 (개발 중에만 표시) */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "8px",
            fontSize: "12px",
            zIndex: 10000,
            fontFamily: "monospace",
          }}
        >
          <div>Hearts: {gameState.hearts}/3</div>
          <div>Game Time: {Math.floor(gameState.timeRemaining / 1000)}s</div>
          <div>Raw Game Time: {gameState.timeRemaining}ms</div>
          <div>Last Blink: {blink.lastBlinkAt ? "Yes" : "No"}</div>
          <div>Current Time: {new Date().toLocaleTimeString()}</div>
          <div>
            Last Blink Time:{" "}
            {blink.lastBlinkAt
              ? new Date(blink.lastBlinkAt).toLocaleTimeString()
              : "None"}
          </div>
        </div>
      )}

      {/* 게임 UI */}
      <GameUI
        hearts={gameState.hearts}
        combo={gameState.combo}
        score={gameState.score}
        isAlive={gameState.isAlive}
        gamePhase={gameState.gamePhase}
        timeRemaining={gameState.timeRemaining}
        countdown={gameState.countdown}
        isPaused={gameState.isPaused}
        onResetGame={resetGame}
        onTogglePause={togglePause}
        showControlPanel={showControlPanel}
        onToggleControlPanel={() => setShowControlPanel(!showControlPanel)}
        onToggleCamera={toggleCamera}
        isCameraOn={showFace}
        opacity={opacity}
        warningOpacity={warningOpacity}
        dangerOpacity={dangerOpacity}
        showContextMenu={showContextMenu}
        onToggleContextMenu={() => setShowContextMenu(!showContextMenu)}
      />

      {/* 컨트롤 패널 */}
      {showControlPanel && (
        <ControlPanel
          state={state}
          blinkState={blink.state}
          blinks={blink.blinks}
          ratioL={blink.ratioL}
          ratioR={blink.ratioR}
          closeT={blink.CLOSE_T}
          openT={blink.OPEN_T}
          mirrored={mirrored}
          showFace={showFace}
          showCharacter={showCharacter}
          showHUD={showHUD}
          onMirroredChange={setMirrored}
          onShowFaceChange={setShowFace}
          onShowCharacterChange={setShowCharacter}
          onShowHUDChange={setShowHUD}
          onStopCamera={stopCamera}
          onStartCamera={() => startCamera()}
        />
      )}

      {/* 비디오/캐릭터 */}
      <VideoDisplay
        videoRef={videoRef}
        showFace={showFace}
        showCharacter={showCharacter}
        mirrored={mirrored}
        ready={ready}
        error={error}
        isBlinking={isBlinking}
      />

      {/* HUD */}
      {showHUD && <p style={styles.hud}>{hudText}</p>}

      <p style={styles.tip}>
        ※ 완전한 깜빡임 사이클(뜸→감음→뜸)을 감지합니다. 눈을 감고만 있으면 카운트되지 않아요!
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: "16px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    width: "100%",
    maxWidth: "100%",
    minWidth: "320px",
    margin: "0 auto",
    boxSizing: "border-box",
    background: "transparent",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "clamp(16px, 4vw, 18px)",
    textAlign: "center",
  },
  tip: {
    color: "#666",
    marginTop: 12,
    fontSize: "clamp(11px, 2.5vw, 12px)",
    textAlign: "center",
  },
  hud: {
    color: "#333",
    marginTop: 8,
    fontSize: "clamp(12px, 2.5vw, 13px)",
    textAlign: "center",
    whiteSpace: "pre-wrap",
  },
};
