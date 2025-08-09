// src/App.tsx
import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { useBlinkTimer } from "./hooks/useBlinkTimer";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { BlinkWarningOverlay } from "./components/BlinkWarningOverlay";
import { useState, useCallback, useEffect } from "react";
import { useMicVAD } from "./hooks/useMicVAD";

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

  // 깜빡임 감지
  const blink = useBlinkDetector(videoRef);

  // 게임 로직
  const { gameState, resetGame, togglePause, restoreHeart, loseHeart } =
    useGameLogic(blink.blinks, blink.lastBlinkAt);

  // 🎤 VAD 상태 (표시용)
  const vad = useMicVAD(true);

  // 깜빡임 타이머 완료 콜백 (5초 내 5번 성공 시 하트 복구, 실패 시 감소)
  const handleBlinkTimerComplete = useCallback(
    (success: boolean, blinkCount: number) => {
      if (success) {
        console.log(`🎉 눈물 복구 성공! ${blinkCount}번 깜빡임`);
        restoreHeart();
      } else {
        console.log(`💔 눈물 복구 실패! ${blinkCount}번만 깜빡임`);
        loseHeart();
      }
    },
    [restoreHeart, loseHeart]
  );

  // 깜빡임 타이머 (5초, 5회)
  const blinkTimer = useBlinkTimer(
    blink.lastBlinkAt,
    5000,
    gameState.hearts,
    5,
    handleBlinkTimerComplete,
    gameState.overlayTimeRemaining
  );

  // 오버레이 활성 여부
  const isOverlayActive =
    gameState.timeRemaining <= 0 && gameState.overlayTimeRemaining > 0;

  useEffect(() => {
    // 오버레이 상태 변경 훅 (내부 처리용 - 별도 로직 없음)
  }, [isOverlayActive]);

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
      <div style={{ fontSize: 12, marginBottom: 8 }}>
        VAD: {vad.connected ? "● CONNECTED" : "○ DISCONNECTED"}
        {" | "}inSpeech: {vad.inSpeech ? "YES" : "no"}
        {" | "}p={vad.lastProb.toFixed(3)}
        {vad.error && (
          <span style={{ color: "red" }}>{" | "}{vad.error}</span>
        )}
      </div>

      {/* 깜빡임 경고 오버레이 - 하트를 잃었을 때만 표시하고, 완료되면 숨김 */}
      <BlinkWarningOverlay
        isVisible={(() => {
          const timeCondition = gameState.timeRemaining <= 0;
          const overlayTimeCondition =
            gameState.overlayTimeRemaining > 0;
          return timeCondition && overlayTimeCondition;
        })()}
        progress={blinkTimer.progress}
        timeWithoutBlink={blinkTimer.timeWithoutBlink}
        overlayTimeRemaining={gameState.overlayTimeRemaining}
        combo={gameState.combo}
        score={gameState.score}
        blinkCount={blinkTimer.blinkCount}
        blinkThreshold={5}
      />

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
          <div>
            Overlay Visible:{" "}
            {gameState.hearts < 3 && gameState.overlayTimeRemaining > 0
              ? "Yes"
              : "No"}
          </div>
          <div>Blink Count: {blinkTimer.blinkCount}/5</div>
          <div>Is Completed: {blinkTimer.isCompleted ? "Yes" : "No"}</div>
          <div>BlinkTimer Progress: {blinkTimer.progress.toFixed(1)}%</div>
          <div>Is Warning: {blinkTimer.isWarning ? "Yes" : "No"}</div>
          <div>
            Overlay Time: {Math.floor(gameState.overlayTimeRemaining / 1000)}s
          </div>
          <div>Game Time: {Math.floor(gameState.timeRemaining / 1000)}s</div>
          <div>Raw Overlay Time: {gameState.overlayTimeRemaining}ms</div>
          <div>Raw Game Time: {gameState.timeRemaining}ms</div>
          <div>Last Blink: {blink.lastBlinkAt ? "Yes" : "No"}</div>
          <div>
            Challenge Start:{" "}
            {blinkTimer.timeWithoutBlink > 0 ? "Active" : "Inactive"}
          </div>
          <div>Current Time: {new Date().toLocaleTimeString()}</div>
          <div>
            Last Blink Time:{" "}
            {blink.lastBlinkAt
              ? new Date(blink.lastBlinkAt).toLocaleTimeString()
              : "None"}
          </div>
          <div>
            Timer State: {blinkTimer.isCompleted ? "Completed" : "Running"}
          </div>
          <div>
            Overlay Condition: Hearts &lt; 3:{" "}
            {gameState.hearts < 3 ? "Yes" : "No"}, Not Completed:{" "}
            {!blinkTimer.isCompleted ? "Yes" : "No"}
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
