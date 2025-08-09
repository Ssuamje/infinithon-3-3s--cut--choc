// src/App.tsx
import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { useState } from "react";

export default function App() {
  // 카메라 관련 로직
  const { videoRef, state, ready, error, startCamera, stopCamera } =
    useCamera();

  // 화면 표시 설정 관련 로직
  const {
    mirrored,
    showFace,
    showCharacter,
    setMirrored,
    setShowFace,
    setShowCharacter,
  } = useDisplaySettings();

  // HUD 표시 상태
  const [showHUD, setShowHUD] = useState(true);

  // ControlPanel 표시 상태
  const [showControlPanel, setShowControlPanel] = useState(true);

  // 깜빡임 감지
  const blink = useBlinkDetector(videoRef);

  // 게임 로직
  const { gameState, resetGame, togglePause } = useGameLogic(
    blink.blinks,
    blink.lastBlinkAt
  );

  const isBlinking = blink.state === "CLOSED" || blink.state === "CLOSING";

  // 카메라 표시 토글 함수 (스트림은 유지하고 화면만 숨김/표시)
  const toggleCamera = () => {
    if (showFace) {
      setShowFace(false);
    } else {
      setShowFace(true);
      // 카메라가 아직 시작되지 않았다면 시작
      if (state !== "ready") {
        startCamera();
      }
    }
  };

  return (
    <div style={styles.wrap}>
      {/* 게임 UI - 항상 표시 */}
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
      />

      {/* 컨트롤 패널 - 토글 가능 */}
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

      {/* 비디오/캐릭터 표시 - 항상 렌더링하되 내부에서 표시 제어 */}
      <VideoDisplay
        videoRef={videoRef}
        showFace={showFace}
        showCharacter={showCharacter}
        mirrored={mirrored}
        ready={ready}
        error={error}
        isBlinking={isBlinking}
      />

      <p style={styles.tip}>
        ※ 완전한 깜빡임 사이클(뜸→감음→뜸)을 감지합니다. 눈을 감고만 있으면
        카운트되지 않아요!
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
    background: "transparent", // 배경을 투명하게 설정
  },
  title: {
    margin: "0 0 12px",
    fontSize: "clamp(16px, 4vw, 18px)", // 반응형 폰트 크기
    textAlign: "center",
  },
  tip: {
    color: "#666",
    marginTop: 12,
    fontSize: "clamp(11px, 2.5vw, 12px)", // 반응형 폰트 크기
    textAlign: "center",
  },
};
