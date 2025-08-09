// src/App.tsx
import { useEffect, useRef, useState } from "react";
import { useCamera } from "./hooks/useCamera";
import { useDisplaySettings } from "./hooks/useDisplaySettings";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { GameUI } from "./GameUI";
import { VideoDisplay } from "./components/VideoDisplay";
import { ControlPanel } from "./components/ControlPanel";
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
  const { gameState, resetGame, togglePause } =
    useGameLogic(blink.blinks, blink.lastBlinkAt);

  // 🎤 VAD 상태 (표시용)
  const vad = useMicVAD(true);

  const isBlinking = blink.state === "CLOSED" || blink.state === "CLOSING";

  // === Blink 이벤트 기록용 ===
  const [events, setEvents] = useState<string[]>([]);
  const startedAt = useRef<string>(new Date().toISOString()); // 프로그램 시작 시
  const prevBlinkState = useRef<string>(blink.state);

  // blink.state 변화 감지: CLOSED → OPEN 전환 시 타임스탬프 기록
  useEffect(() => {
    if (prevBlinkState.current === "CLOSED" && blink.state === "OPEN") {
      setEvents((prev) => [...prev, new Date().toISOString()]);
    }
    prevBlinkState.current = blink.state;
  }, [blink.state]);

  // 서버 URL
  const API_BASE =
    (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

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

  // 편의: 전송 후 즉시 분석결과 조회
  const sendAndFetch = async () => {
    const ok = await sendBlinkData();
    if (ok) await fetchProcessed();
  };

  // 카메라 표시 토글 (스트림은 유지)
  const toggleCamera = () => {
    if (showFace) {
      setShowFace(false);
    } else {
      setShowFace(true);
      if (state !== "ready") startCamera();
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
        showControlPanel={showControlPanel}
        onResetGame={resetGame}
        onTogglePause={togglePause}
        onToggleControlPanel={() => setShowControlPanel(!showControlPanel)}
        onToggleCamera={toggleCamera}
        isCameraOn={showFace}
      />

      {/* 설정 패널 */}
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

      {/* 임시 버튼: 전송 + 분석결과 조회 */}
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <button onClick={sendAndFetch} style={styles.button}>
          데이터 전송 & 분석 결과 보기
        </button>
      </div>

      {/* 임시 결과 패널 */}
      {processed && (
        <div
          style={{
            position: "fixed",
            bottom: 10,
            right: 10,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: 12,
            maxWidth: 380,
            borderRadius: 8,
            fontFamily: "monospace",
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Processed Result</div>

          {"message" in processed && !("report" in processed) && (
            <div style={{ marginBottom: 6 }}>{String(processed.message)}</div>
          )}

          {"report" in processed && (
            <pre style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
              {processed.report}
            </pre>
          )}

          {"daily_blink_per_minute" in processed && (
            <div style={{ marginTop: 6 }}>
              Daily BPM: {Number(processed.daily_blink_per_minute || 0).toFixed(2)}
            </div>
          )}

          {"daily_line_plot_b64" in processed && processed.daily_line_plot_b64 && (
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
