// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import { useBlinkDetector } from "./useBlinkDetector";
import { useGameLogic } from "./useGameLogic";
import { GameUI } from "./GameUI";

type CamState = "idle" | "loading" | "ready" | "error";

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);

  const [state, setState] = useState<CamState>("idle");
  const [ready, setReady] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const attachAndPlay = async (video: HTMLVideoElement, stream: MediaStream) => {
    // 1) 이전 연결 해제
    if (video.srcObject && video.srcObject !== stream) {
      (video.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    
    // 2) 새 스트림 연결
    video.srcObject = stream;

    // 3) loadedmetadata 이후 play
    await new Promise<void>((res) => {
      if (video.readyState >= 1) return res(); // HAVE_METADATA
      const onLoaded = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        res();
      };
      video.addEventListener("loadedmetadata", onLoaded);
    });

    try {
      await video.play(); // autoplay 정책 대비: muted + playsInline 필수
    } catch (e) {
      console.debug("video.play() rejected:", e);
    }
  };

  const startCamera = async (deviceId?: string) => {
    setState("loading");
    setError(null);

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    if (videoRef.current) {
      await attachAndPlay(videoRef.current, stream);
    }

    setReady(true);
    setState("ready");
  };

  const stopCamera = () => {
    const v = videoRef.current;
    const s = streamRef.current;

    if (s) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (v) v.srcObject = null;

    setReady(false);
    setState("idle");
  };

  // 카메라 켜기 (StrictMode 이중 실행 가드)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        await startCamera();
      } catch (e: unknown) {
        setError((e as Error)?.message ?? "camera error");
        setState("error");
      }
    })();

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 블링크 감지 훅 (비디오 레퍼런스로 동작)
  const blink = useBlinkDetector(videoRef.current);

  // 게임 로직
  const { gameState, loseHeart, resetGame, revivalProgress, revivalRequired } =
    useGameLogic(blink.blinks, blink.lastBlinkAt);

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

      <div style={styles.panel}>
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
          <b
            style={{
              color:
                blink.state === "CLOSED" || blink.state === "CLOSING"
                  ? "#ff5050"
                  : blink.state === "OPENING"
                  ? "#f7b731"
                  : blink.state === "OPEN"
                  ? "#21c074"
                  : "#999",
            }}
          >
            {blink.state === "UNKNOWN"
              ? "대기중"
              : blink.state === "OPEN"
              ? "눈뜸"
              : blink.state === "CLOSING"
              ? "감는중"
              : blink.state === "CLOSED"
              ? "눈감음"
              : blink.state === "OPENING"
              ? "뜨는중"
              : blink.state}
          </b>
        </div>
        <div>
          Blinks: <b>{blink.blinks}</b>
        </div>
        <div>
          Ratio L/R: {blink.ratioL.toFixed(3)} / {blink.ratioR.toFixed(3)}
        </div>
        <div style={{ fontSize: 11, color: "#ddd", marginTop: 4 }}>
          평균: {((blink.ratioL + blink.ratioR) / 2).toFixed(3)} | 임계값: 감음
          &lt;
          {blink.CLOSE_T !== undefined ? blink.CLOSE_T.toFixed(3) : "-"}
          {" / "}
          뜸&gt;{blink.OPEN_T !== undefined ? blink.OPEN_T.toFixed(3) : "-"}
          <br />
          (최솟값:{" "}
          {blink.minEAR !== undefined && isFinite(blink.minEAR)
            ? blink.minEAR.toFixed(3)
            : "-"}
          {" / "}
          최댓값:{" "}
          {blink.maxEAR !== undefined && isFinite(blink.maxEAR)
            ? blink.maxEAR.toFixed(3)
            : "-"}
          )
          {blink.calibAt && (
            <>
              {" "}
              | 갱신: {new Date(blink.calibAt).toLocaleTimeString()}
            </>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#ccc" }}>
          완전한 깜빡임 사이클 감지 (뜸→감음→뜸)
        </div>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(e) => setMirrored(e.target.checked)}
          />
          미러 모드
        </label>
        {state === "ready" ? (
          <button style={styles.buttonSecondary} onClick={stopCamera}>
            중지
          </button>
        ) : (
          <button style={styles.button} onClick={() => startCamera()}>
            시작
          </button>
        )}
      </div>

      <div style={styles.videoBox}>
        <video
          ref={videoRef}
          style={{
            ...styles.video,
            transform: mirrored ? "scaleX(-1)" : "none",
          }}
          playsInline
          muted
          autoPlay
        />
        {!ready && !error && (
          <div style={styles.overlay}>카메라 준비 중…</div>
        )}
        {error && <div style={styles.overlay}>에러: {error}</div>}
      </div>

      <p style={styles.tip}>
        ※ 완전한 깜빡임 사이클(뜸→감음→뜸)을 감지합니다.
        눈을 감고만 있으면 카운트되지 않아요!
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  title: { margin: "0 0 12px" },
  panel: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    background: "#5e5e5e",
    padding: 10,
    borderRadius: 10,
    color: "#fff",
  },
  checkbox: { display: "flex", alignItems: "center", gap: 6 },
  videoBox: {
    position: "relative",
    width: 800,
    maxWidth: "100%",
    aspectRatio: "16/9",
    background: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    background: "rgba(0,0,0,0.35)",
    fontSize: 18,
  },
  tip: { color: "#666", marginTop: 10 },
  button: {
    background: "#21c074",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
  buttonSecondary: {
    background: "#444",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
  },
};
