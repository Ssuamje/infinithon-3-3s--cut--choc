import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { useBlinkTimer } from "./hooks/useBlinkTimer";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { BlinkWarningOverlay } from "./components/BlinkWarningOverlay";
import { FullScreenWarningOverlay } from "./components/FullScreenWarningOverlay";
import { useState, useEffect } from "react";

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

  // 깜빡임 타이머 (6초)
  const blinkTimer = useBlinkTimer(blink.lastBlinkAt, 6000);

  const isBlinking = blink.state === "CLOSED" || blink.state === "CLOSING";

  // 깜빡임 카운트가 변경될 때마다 메인 프로세스에 전송
  useEffect(() => {
    if (window.blinkAPI) {
      window.blinkAPI.updateBlinkCount(blink.blinks);
    }
  }, [blink.blinks]);

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

  // HUD 표시 문자열 (평균/임계값/최소/최대/최근 갱신)
  const hudText = (() => {
    const avg = isFinite(blink.avgRatio) ? blink.avgRatio : 0;
    const min = isFinite(blink.windowMin) ? blink.windowMin : 0;
    const max = isFinite(blink.windowMax) ? blink.windowMax : 0;
    const lastTs = blink.lastCalibratedAt
      ? new Date(blink.lastCalibratedAt).toLocaleTimeString()
      : "-";

    return `평균: ${avg.toFixed(3)} | 임계값: 감음<${blink.CLOSE_T.toFixed(
      2
    )} / 뜸>${blink.OPEN_T.toFixed(2)} | 최솟값: ${min.toFixed(
      3
    )} / 최댓값: ${max.toFixed(3)} | 최근 갱신: ${lastTs}`;
  })();

  return (
    <div style={styles.wrap}>
      {/* 6초 후 전체화면 경고 오버레이 */}
      <FullScreenWarningOverlay
        isVisible={blinkTimer.isWarning}
        totalBlinks={blink.blinks}
        onBlink={() => {
          // 강제로 깜빡임 상태를 리셋하여 오버레이를 닫음
          // 실제 깜빡임이 감지되면 자동으로 타이머가 리셋됨
        }}
      />

      {/* 깜빡임 경고 오버레이 - 모든 창 위에 표시 */}
      <BlinkWarningOverlay
        isVisible={blinkTimer.progress > 50 || blinkTimer.isWarning} // 50% 이후부터 표시
        progress={blinkTimer.progress}
        timeWithoutBlink={blinkTimer.timeWithoutBlink}
        combo={gameState.combo}
        score={gameState.score}
        totalBlinks={blink.blinks}
      />

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

      {/* 컨트롤 패널 - 토글 가능 (기존 props 유지) */}
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

      {/* 캘리브레이션/HUD 정보: 기존 문구 유지 + 확장 정보 별도 표기 */}
      {/* {showHUD && <p style={styles.hud}>{hudText}</p>} */}

      {/* <p style={styles.tip}>
        ※ 완전한 깜빡임 사이클(뜸→감음→뜸)을 감지합니다. 눈을 감고만 있으면
        카운트되지 않아요!
      </p> */}
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
