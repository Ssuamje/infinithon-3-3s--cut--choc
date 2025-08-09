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
  const { videoRef, state, ready, error, startCamera, stopCamera } =
    useCamera();

  const vad = useMicVAD(true);

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

  // 게임 로직을 먼저 호출
  const { gameState, resetGame, togglePause, restoreHeart, loseHeart } =
    useGameLogic(blink.blinks, blink.lastBlinkAt); // 하트 수 파라미터 제거

  // 깜빡임 타이머 완료 콜백
  const handleBlinkTimerComplete = useCallback(
    (success: boolean, blinkCount: number) => {
      if (success) {
        // 5초 안에 5번 깜빡임 성공: 눈물 복구
        console.log(`🎉 눈물 복구 성공! ${blinkCount}번 깜빡임`);
        restoreHeart(); // 하트 복구
      } else {
        // 5초 안에 5번 못 채움: 눈물 1개 추가 손실
        console.log(`💔 눈물 복구 실패! ${blinkCount}번만 깜빡임`);
        loseHeart(); // 하트 1개 감소
      }
    },
    [restoreHeart, loseHeart]
  );

  // 깜빡임 타이머 (5초, 5번 깜빡임으로 눈물 복구)
  const blinkTimer = useBlinkTimer(
    blink.lastBlinkAt,
    5000, // 5초로 변경
    gameState.hearts, // 이제 gameState가 정의된 후에 사용
    5,
    handleBlinkTimerComplete,
    gameState.overlayTimeRemaining // 오버레이 시간 전달
  );

  // 오버레이 활성 상태 계산
  const isOverlayActive =
    gameState.timeRemaining <= 0 && gameState.overlayTimeRemaining > 0;

  // 오버레이 상태가 변경될 때마다 게임 로직 업데이트
  useEffect(() => {
    // 이 부분은 useGameLogic 내부에서 처리되므로 별도 로직 불필요
  }, [isOverlayActive]);

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
      {/* === VAD 상태 (임시 표시) === */}
      <div style={{ fontSize: 12, marginBottom: 8 }}>
        VAD: {vad.connected ? "● CONNECTED" : "○ DISCONNECTED"}
        {" | "}inSpeech: {vad.inSpeech ? "YES" : "no"}
        {" | "}p={vad.lastProb.toFixed(3)}
        {" | "}built:{vad.framesBuilt} sent:{vad.framesSent}
        {vad.error && <span style={{ color: "red" }}>{" | "}{vad.error}</span>}
      </div>

      {/* 깜빡임 경고 오버레이 - 하트를 잃었을 때만 표시하고, 완료되면 숨김 */}
      <BlinkWarningOverlay
        isVisible={(() => {
          const timeCondition = gameState.timeRemaining <= 0;
          const overlayTimeCondition = gameState.overlayTimeRemaining > 0;

          console.log("🔍 오버레이 표시 조건:", {
            timeRemaining: gameState.timeRemaining,
            timeCondition,
            overlayTimeRemaining: gameState.overlayTimeRemaining,
            overlayTimeCondition,
            finalResult: timeCondition && overlayTimeCondition,
          });

          return timeCondition && overlayTimeCondition;
        })()}
        progress={blinkTimer.progress}
        timeWithoutBlink={blinkTimer.timeWithoutBlink}
        overlayTimeRemaining={gameState.overlayTimeRemaining} // 오버레이 시간 추가
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
      {showHUD && <p style={styles.hud}>{hudText}</p>}

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
