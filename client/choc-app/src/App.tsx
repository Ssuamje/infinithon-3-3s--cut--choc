// src/App.tsx
import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";

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

  // 깜빡임 감지
  const blink = useBlinkDetector(videoRef);

  // 게임 로직
  const { gameState, loseHeart, resetGame, revivalProgress, revivalRequired } =
    useGameLogic(blink.blinks, blink.lastBlinkAt);

  const isBlinking = blink.state === "CLOSED" || blink.state === "CLOSING";

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>🍫 초콜릿 깜빡임 게임</h1>

      {/* 게임 UI */}
      <GameUI
        hearts={gameState.hearts}
        combo={gameState.combo}
        score={gameState.score}
        isAlive={gameState.isAlive}
        revivalProgress={revivalProgress}
        revivalRequired={revivalRequired}
        onLoseHeart={loseHeart}
        onResetGame={resetGame}
      />

      {/* 컨트롤 패널 */}
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
        onMirroredChange={setMirrored}
        onShowFaceChange={setShowFace}
        onShowCharacterChange={setShowCharacter}
        onStopCamera={stopCamera}
        onStartCamera={() => startCamera()}
      />

      {/* 비디오/캐릭터 표시 */}
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
