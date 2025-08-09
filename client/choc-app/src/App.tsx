import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { useBlinkTimer } from "./hooks/useBlinkTimer";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
import { BlinkWarningOverlay } from "./components/BlinkWarningOverlay";
import { WarningWindow } from "./components/WarningWindow";
import { BackgroundWarningPopup } from "./components/BackgroundWarningPopup";
import { useState, useEffect, useRef } from "react";
import openEyeSound from "../assets/open_eye.wav";


type ButPhase = "idle" | "needLongClose" | "waitCloseAfterOpen";

export default function App() {
  // 경고 창 모드인지 확인 (URL 해시로 구분)
  const isWarningWindow = window.location.hash === "#/warning";

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

  // 깜빡임 경고 상태를 Electron 메인 프로세스에 전송
  useEffect(() => {
    if (window.blinkAPI && window.blinkAPI.updateWarningState) {
      window.blinkAPI.updateWarningState({
        isVisible: blinkTimer.progress > 30 || blinkTimer.isWarning,
        progress: blinkTimer.progress,
        timeWithoutBlink: blinkTimer.timeWithoutBlink,
        combo: gameState.combo,
        score: gameState.score,
        totalBlinks: blink.blinks,
      });
    }
  }, [
    blinkTimer.progress,
    blinkTimer.isWarning,
    blinkTimer.timeWithoutBlink,
    gameState.combo,
    gameState.score,
    blink.blinks,
  ]);

  // 경고 상태 동기화 요청 처리
  useEffect(() => {
    const handleWarningStateSync = () => {
      if (window.electronAPI && window.electronAPI.sendWarningStateSync) {
        window.electronAPI.sendWarningStateSync({
          isVisible: blinkTimer.progress > 30 || blinkTimer.isWarning,
          progress: blinkTimer.progress,
          timeWithoutBlink: blinkTimer.timeWithoutBlink,
          combo: gameState.combo,
          score: gameState.score,
          totalBlinks: blink.blinks,
        });
      }
    };

    if (window.electronAPI) {
      window.electronAPI.on(
        "request-warning-state-sync",
        handleWarningStateSync
      );
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener(
          "request-warning-state-sync",
          handleWarningStateSync
        );
      }
    };
  }, [
    blinkTimer.progress,
    blinkTimer.isWarning,
    blinkTimer.timeWithoutBlink,
    gameState.combo,
    gameState.score,
    blink.blinks,
  ]);

  // 경고 창 모드일 때는 WarningWindow만 렌더링
  if (isWarningWindow) {
    return <WarningWindow />;
  }

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

  // ===== BUT 측정 상태 =====
  const [isMeasuringBUT, setIsMeasuringBUT] = useState(false);
  const [butPhase, setButPhase] = useState<ButPhase>("idle");
  const longCloseStartRef = useRef<number | null>(null);
  const openStartRef = useRef<number | null>(null);
  const closeStartRef = useRef<number | null>(null);
  const prevBlinkStateRef = useRef(blink.state);

  const [butResult, setButResult] = useState<number | null>(null);
  const [butMessage, setButMessage] = useState<string>("");

  const resetBUT = () => {
    setIsMeasuringBUT(false);
    setButPhase("idle");
    longCloseStartRef.current = null;
    openStartRef.current = null;
    closeStartRef.current = null;
  };

  const startBUT = () => {
    setButResult(null);
    setIsMeasuringBUT(true);
    setButPhase("needLongClose");
    longCloseStartRef.current = null;
    openStartRef.current = null;
    closeStartRef.current = null;
    setButMessage(
      // "버튼을 눌렀습니다. 이제 눈을 1초 이상 감았다가, 눈을 뜬 채로 유지하다가 따가워질 때 눈을 감아주세요."
      " "
    );
  };

  useEffect(() => {
    const now = Date.now();
    const prev = prevBlinkStateRef.current;
    const curr = blink.state;

    if (!isMeasuringBUT) {
      prevBlinkStateRef.current = curr;
      return;
    }

    switch (butPhase) {
      case "needLongClose": {
        if (prev !== "CLOSED" && curr === "CLOSED") {
          longCloseStartRef.current = now;
        }
        if (prev === "CLOSED" && curr === "OPEN") {
          const started = longCloseStartRef.current;
          if (started && now - started >= 1000) {
            openStartRef.current = now;
            setButPhase("waitCloseAfterOpen");
            setButMessage(
              // "잘했어요! 이제 눈을 뜬 채로 유지하다가 따가워질 때 자연스럽게 눈을 감아주세요."
              " "
            );
            const audio = new Audio(openEyeSound);
            audio.play();
          } else {
            longCloseStartRef.current = null;
            // setButMessage("1초 이상 감고 시작해야 해요. 다시 한 번 눈을 길게 감아볼까요?");
            setButMessage(" ");
          }
        }
        break;
      }
      case "waitCloseAfterOpen": {
        if (prev !== "CLOSED" && curr === "CLOSED") {
          closeStartRef.current = now;
          const o = openStartRef.current;
          const c = closeStartRef.current;
          if (o && c && c > o) {
            const seconds = (c - o) / 1000;
            setButResult(seconds);
            setButMessage(
              // `사용자님의 BUT(눈물막 파괴 시간)은 ${seconds.toFixed(
              //   1
              // )}초에요. 측정된 BUT 시간 안에 한 번 이상 눈을 깜빡이는 걸 목표로 해봐요!`
              "!"
            );
          } else {
            // setButMessage("측정값을 계산하지 못했어요. 다시 시도해볼까요?");
            setButMessage(" ");
          }
          resetBUT();
        }
        break;
      }
    }

    prevBlinkStateRef.current = curr;
  }, [blink.state, isMeasuringBUT, butPhase]);

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
      {/* <FullScreenWarningOverlay
        isVisible={blinkTimer.isWarning}
        totalBlinks={blink.blinks}
        onBlink={() => {
          // 강제로 깜빡임 상태를 리셋하여 오버레이를 닫음
          // 실제 깜빡임이 감지되면 자동으로 타이머가 리셋됨
        }}
      /> */}

      {/* 깜빡임 경고 오버레이 - 모든 창 위에 표시 */}
      <BlinkWarningOverlay
        isVisible={blinkTimer.progress > 30 || blinkTimer.isWarning} // 30% 이후부터 표시
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
        butButton={
          <button
            onClick={startBUT}
            disabled={isMeasuringBUT}
            style={styles.butButton}
          >
            {isMeasuringBUT ? "측정 중…" : "BUT 측정"}
          </button>
        }
        butMessage={
          <span style={styles.butText}>
            {/* {butMessage ||
              "버튼을 누르면: 눈을 1초 이상 감은 뒤, 눈을 뜬 채로 유지하다 따가워질 때 감아 측정합니다."} */}
            {butResult != null && (
              <span style={styles.butResult}>
                {" "}
                | 결과: {butResult.toFixed(1)}초
              </span>
            )}
          </span>
        }
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

      {/* WarningWindow 대신 BackgroundWarningPopup 사용 */}
      <BackgroundWarningPopup />
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
