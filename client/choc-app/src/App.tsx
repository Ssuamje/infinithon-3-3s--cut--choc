import { useEffect, useRef, useState, useCallback } from "react";

type CamState = "idle" | "loading" | "ready" | "error";

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CamState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [mirrored, setMirrored] = useState(true);

  /** 카메라 중지 & 리소스 정리 */
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState("idle");
  }, []);

  /** 카메라 시작 */
  const startCamera = useCallback(async (id?: string) => {
    try {
      setState("loading");
      setError(null);

      // 권장 해상도는 추후 분석용으로 조정 가능 (예: 640x480, 1280x720 등)
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: id ? { exact: id } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("ready");
    } catch (e: any) {
      setError(e?.message ?? "카메라 접근 오류");
      setState("error");
    }
  }, []);

  /** 장치 목록 갱신 */
  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((d) => d.kind === "videoinput");
      setDevices(cams);
      // 첫 실행 시 기본 장치 선택
      if (!deviceId && cams[0]?.deviceId) {
        setDeviceId(cams[0].deviceId);
      }
    } catch (e: any) {
      setError(e?.message ?? "카메라 장치 탐색 오류");
    }
  }, [deviceId]);

  /** 최초 마운트: 권한 요청 & 장치 목록 & 기본 카메라 ON */
  useEffect(() => {
    let mounted = true;

    (async () => {
      await refreshDevices();
      // 일부 브라우저/환경에선 enumerateDevices 전에 getUserMedia 한 번 호출해야 라벨 보임
      if (mounted) {
        await startCamera(deviceId);
      }
    })();

    return () => {
      mounted = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 디바이스 변경 시 재시작 */
  useEffect(() => {
    if (!deviceId) return;
    // 이미 켜져 있으면 재시작
    if (state === "ready" || state === "loading" || state === "error") {
      (async () => {
        stopCamera();
        await startCamera(deviceId);
      })();
    }
  }, [deviceId, startCamera, stopCamera, state]);

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Blink Preview (Electron + React)</h1>

      <div style={styles.controls}>
        <label style={styles.label}>
          Camera:
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            style={styles.select}
          >
            {devices.map((d, idx) => (
              <option key={d.deviceId || idx} value={d.deviceId}>
                {d.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => startCamera(deviceId)}
          disabled={state === "loading"}
          style={styles.button}
        >
          시작
        </button>
        <button onClick={stopCamera} style={styles.buttonSecondary}>
          중지
        </button>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(e) => setMirrored(e.target.checked)}
          />
          미러(거울) 모드
        </label>
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
        {state !== "ready" && (
          <div style={styles.overlay}>
            {state === "loading" && "카메라 준비 중…"}
            {state === "idle" && "대기 중"}
            {state === "error" && `에러: ${error ?? "알 수 없음"}`}
          </div>
        )}
      </div>

      <p style={styles.tip}>
        ✅ 권한 거부 시 macOS “시스템 설정 &gt; 개인정보 보호 및 보안 &gt;
        카메라”에서 앱에 권한을 허용해 주세요.
      </p>
    </div>
  );
}

/** 인라인 스타일 간단 정리 (임시) */
const styles: Record<string, React.CSSProperties> = {
  wrap: {
    padding: 16,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  title: { margin: "0 0 12px" },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  label: { display: "flex", alignItems: "center", gap: 6 },
  select: { padding: "6px 8px", borderRadius: 8, border: "1px solid #ccc" },
  button: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #222",
    background: "#111",
    color: "#fff",
  },
  buttonSecondary: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #bbb",
    background: "#eee",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
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
};

// src/App.tsx
// import { useEffect, useRef, useState } from "react";
// import { useBlinkDetector } from "./useBlinkDetector";

// export default function App() {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const [ready, setReady] = useState(false);
//   const [mirrored, setMirrored] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // 1) 카메라 켜기
//   useEffect(() => {
//     (async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             width: { ideal: 1280 },
//             height: { ideal: 720 },
//             facingMode: "user",
//           },
//           audio: false,
//         });
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           await videoRef.current.play();
//           setReady(true);
//         }
//       } catch (e: any) {
//         setError(e?.message ?? "camera error");
//       }
//     })();

//     return () => {
//       const tracks =
//         (videoRef.current?.srcObject as MediaStream | null)?.getTracks() ?? [];
//       tracks.forEach((t) => t.stop());
//     };
//   }, []);

//   // 2) 깜빡임 감지
//   const blink = useBlinkDetector(videoRef.current);

//   return (
//     <div style={styles.wrap}>
//       <h1 style={styles.title}>Blink Detector (MediaPipe)</h1>

//       <div style={styles.panel}>
//         <div>
//           State:{" "}
//           <b
//             style={{ color: blink.state === "CLOSED" ? "#ff5050" : "#21c074" }}
//           >
//             {blink.state}
//           </b>
//         </div>
//         <div>
//           Blinks: <b>{blink.blinks}</b>
//         </div>
//         <div>
//           Ratio L/R: {blink.ratioL.toFixed(3)} / {blink.ratioR.toFixed(3)}
//         </div>
//         <label style={styles.checkbox}>
//           <input
//             type="checkbox"
//             checked={mirrored}
//             onChange={(e) => setMirrored(e.target.checked)}
//           />
//           미러 모드
//         </label>
//       </div>

//       <div style={styles.videoBox}>
//         <video
//           ref={videoRef}
//           style={{
//             ...styles.video,
//             transform: mirrored ? "scaleX(-1)" : "none",
//           }}
//           playsInline
//           muted
//           autoPlay
//         />
//         {!ready && !error && <div style={styles.overlay}>카메라 준비 중…</div>}
//         {error && <div style={styles.overlay}>에러: {error}</div>}
//       </div>

//       <p style={styles.tip}>
//         ※ EAR 임계값은 조명/카메라에 따라 달라질 수 있어요. CLOSE_T/OPEN_T를
//         미세 조정하세요.
//       </p>
//     </div>
//   );
// }

// const styles: Record<string, React.CSSProperties> = {
//   wrap: {
//     padding: 16,
//     fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
//   },
//   title: { margin: "0 0 12px" },
//   panel: {
//     display: "flex",
//     gap: 16,
//     alignItems: "center",
//     flexWrap: "wrap",
//     marginBottom: 12,
//     background: "#f6f6f8",
//     padding: 10,
//     borderRadius: 10,
//   },
//   checkbox: { display: "flex", alignItems: "center", gap: 6 },
//   videoBox: {
//     position: "relative",
//     width: 800,
//     maxWidth: "100%",
//     aspectRatio: "16/9",
//     background: "#000",
//     borderRadius: 12,
//     overflow: "hidden",
//   },
//   video: { width: "100%", height: "100%", objectFit: "cover" },
//   overlay: {
//     position: "absolute",
//     inset: 0,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     color: "#fff",
//     background: "rgba(0,0,0,0.35)",
//     fontSize: 18,
//   },
//   tip: { color: "#666", marginTop: 10 },
// };
