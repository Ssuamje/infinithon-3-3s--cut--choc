// src/App.tsx
import { useState, useEffect, useRef } from "react";
import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
// import { useMicVAD } from "./hooks/useMicVAD"; // VAD 비활성

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

  // HUD / ControlPanel 표시 상태
  const [showHUD, setShowHUD] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);

  // 투명도 관련 상태 (새 기능 유지)
  const [opacity, setOpacity] = useState(0.7);
  const [warningOpacity, setWarningOpacity] = useState(0.85);
  const [dangerOpacity, setDangerOpacity] = useState(1);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // 깜빡임 감지
  const blink = useBlinkDetector(videoRef);

  // 게임 로직
  const { gameState, resetGame, togglePause, restoreHeart, loseHeart } =
    useGameLogic(blink.blinks, blink.lastBlinkAt);

  // 🎤 VAD 상태 (비활성)
  // const vad = useMicVAD(true);

  // 투명도 변경 이벤트 리스너 (새 기능 유지)
  useEffect(() => {
    const handleOpacityChange = (event: any) => {
      const { type, opacity: newOpacity } = event.detail;
      switch (type) {
        case "normal":
          setOpacity(newOpacity);
          break;
        case "warning":
          setWarningOpacity(newOpacity);
          break;
        case "danger":
          setDangerOpacity(newOpacity);
          break;
        default:
          setOpacity(newOpacity);
      }
    };
    window.addEventListener("opacityChange", handleOpacityChange);
    return () =>
      window.removeEventListener("opacityChange", handleOpacityChange);
  }, []);

  const isBlinking = blink.state === "CLOSED" || blink.state === "CLOSING";

  // 카메라 표시 토글 (스트림은 유지)
  const toggleCamera = () => {
    if (showFace) {
      setShowFace(false);
    } else {
      setShowFace(true);
      if (state !== "ready") startCamera();
    }
  };

  // === Blink 이벤트 기록/전송/조회 ===
  const [events, setEvents] = useState<string[]>([]);
  const startedAt = useRef<string>(new Date().toISOString()); // 프로그램 시작 시각
  const prevBlinkState = useRef<string>(blink.state);

  // CLOSED → OPEN 전환 시 타임스탬프 기록
  useEffect(() => {
    if (prevBlinkState.current === "CLOSED" && blink.state === "OPEN") {
      setEvents((prev) => [...prev, new Date().toISOString()]);
    }
    prevBlinkState.current = blink.state;
  }, [blink.state]);

  // 서버 URL
  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || "http://10.99.13.19:8000";

  // 데이터 서버로 전송
  const sendBlinkData = async () => {
    const payload = {
      id: "1",
      events,
      startedAt: startedAt.current,
      endedAt: new Date().toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE}/blink-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log("Blink data sent:", payload);
      return true;
    } catch (err) {
      console.error("Failed to send blink data:", err);
      return false;
    }
  };

  // 처리 결과 가져오기(JSON: report, daily_blink_per_minute, daily_line_plot_b64)
  const [processed, setProcessed] = useState<any | null>(null);
  const fetchProcessed = async () => {
    try {
      const res = await fetch(`${API_BASE}/processed-data/1`);
      const json = await res.json();
      setProcessed(json);
      console.log("processed:", json);
    } catch (e) {
      console.error(e);
    }
  };

  // 전송 후 즉시 분석결과 조회
  const sendAndFetch = async () => {
    const ok = await sendBlinkData();
    if (ok) await fetchProcessed();
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
    )} / 뜸>${blink.OPEN_T.toFixed(2)} | 최솟값: ${min.toFixed(
      3
    )} / 최댓값: ${max.toFixed(3)} | 최근 갱신: ${lastTs}`;
  })();

  return (
    <div style={styles.wrap}>
      {/* 디버깅용 로그 (개발 중에만 표시) */}
      {/* {process.env.NODE_ENV === "development" && (
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
      )} */}

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
        onSendAndFetch={sendAndFetch}
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
      {/* {showHUD && <p style={styles.hud}>{hudText}</p>} */}

      {/* <p style={styles.tip}>
        ※ 완전한 깜빡임 사이클(뜸→감음→뜸)을 감지합니다. 눈을 감고만 있으면
        카운트되지 않아요!
      </p> */}

      {/* 임시 결과 패널 */}
      {processed && (
        <div
          style={{
            position: "relative",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
            fontFamily: "monospace",
          }}
        >
          <div
            style={{
              marginBottom: 8,
              fontWeight: 700,
              textAlign: "center",
              fontSize: "18px",
            }}
          >
            <b>"{String(processed.user_name)}"의 눈 건강 리포트 💾</b>
          </div>

          {"message" in processed && !("report" in processed) && (
            <div style={{ marginBottom: 6 }}>{String(processed.message)}</div>
          )}

          {"daily_blink_per_minute" in processed && (
            <div style={{ marginTop: 6 }}>
              <b>오늘의 평균 눈 깜박임 횟수 👁️</b>{" "}
              {Number(processed.daily_blink_per_minute || 0).toFixed(2)}회 / 분
            </div>
          )}

          {"report" in processed && (
            <div
              style={{ marginTop: 6, textAlign: "center", fontSize: "15px" }}
            >
              <b>['촉💦'의 한 마디]</b>
            </div>
          )}

          {"report" in processed && (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {processed.report}
            </pre>
          )}

          {"daily_line_plot_b64" in processed && (
            <div
              style={{ marginTop: 6, textAlign: "center", fontSize: "15px" }}
            >
              <b>[오늘의 깜빡✨ 그래프]</b>
            </div>
          )}

          {"daily_line_plot_b64" in processed &&
            processed.daily_line_plot_b64 && (
              <img
                alt="plot"
                style={{ width: "100%", marginTop: 8, borderRadius: 6 }}
                src={`data:image/png;base64,${processed.daily_line_plot_b64}`}
              />
            )}
        </div>
      )}
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
  button: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    background: "#f6f6f6",
    cursor: "pointer",
  },
};
