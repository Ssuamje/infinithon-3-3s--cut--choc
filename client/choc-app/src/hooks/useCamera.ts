// src/hooks/useCamera.ts
import { useEffect, useRef, useState } from "react";

type CamState = "idle" | "loading" | "ready" | "error";

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  state: CamState;
  ready: boolean;
  error: string | null;
  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);

  const [state, setState] = useState<CamState>("idle");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachAndPlay = async (
    video: HTMLVideoElement,
    stream: MediaStream
  ) => {
    try {
      // 1) 이전 연결 해제
      if (video.srcObject && video.srcObject !== stream) {
        (video.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }

      // 2) 새 스트림 연결
      video.srcObject = stream;

      // 3) loadedmetadata 이후 play
      await new Promise<void>((res, rej) => {
        if (video.readyState >= 1) return res(); // HAVE_METADATA

        const onLoaded = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          res();
        };

        const onError = () => {
          video.removeEventListener("error", onError);
          rej(new Error("Video metadata loading failed"));
        };

        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onError);

        // 타임아웃 설정
        setTimeout(() => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
          rej(new Error("Video metadata loading timeout"));
        }, 10000);
      });

      // 4) 비디오 재생
      try {
        await video.play(); // autoplay 정책 대비: muted + playsInline 필수
        console.log("Video started playing successfully");
      } catch (e) {
        console.warn("video.play() failed:", e);
        // 브라우저 정책으로 인한 실패는 일반적이므로 에러로 처리하지 않음
      }
    } catch (e) {
      console.error("Error in attachAndPlay:", e);
      throw e;
    }
  };

  const startCamera = async (deviceId?: string) => {
    setState("loading");
    setError(null);

    try {
      // 브라우저 지원 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API not supported in this browser");
      }

      // HTTPS 환경 확인 (개발 환경에서는 localhost 허용)
      if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        throw new Error("Camera access requires HTTPS (except localhost)");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280, min: 640 }, // 최소 해상도 설정
          height: { ideal: 720, min: 480 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 }, // 프레임레이트 설정
        },
        audio: false,
      };

      console.log("Requesting camera access with constraints:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log("Camera stream obtained:", stream.getVideoTracks()[0]?.label);

      if (videoRef.current) {
        await attachAndPlay(videoRef.current, stream);
      }

      setReady(true);
      setState("ready");
    } catch (e: unknown) {
      const errorMessage = (e as Error)?.message ?? "Unknown camera error";
      console.error("Camera start failed:", e);

      // 사용자 친화적인 에러 메시지
      let userFriendlyError = errorMessage;
      if (errorMessage.includes("Permission denied")) {
        userFriendlyError =
          "카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.";
      } else if (errorMessage.includes("NotFoundError")) {
        userFriendlyError = "사용 가능한 카메라를 찾을 수 없습니다.";
      } else if (errorMessage.includes("NotAllowedError")) {
        userFriendlyError = "카메라 접근이 허용되지 않았습니다.";
      } else if (errorMessage.includes("NotReadableError")) {
        userFriendlyError = "카메라가 다른 애플리케이션에서 사용 중입니다.";
      } else if (errorMessage.includes("OverconstrainedError")) {
        userFriendlyError = "요청한 카메라 설정을 지원하지 않습니다.";
      } else if (errorMessage.includes("HTTPS")) {
        userFriendlyError = "카메라 접근을 위해서는 HTTPS 환경이 필요합니다.";
      }

      setError(userFriendlyError);
      setState("error");
    }
  };

  const stopCamera = () => {
    const v = videoRef.current;
    const s = streamRef.current;

    if (s) {
      s.getTracks().forEach((t) => {
        t.stop();
        console.log("Camera track stopped:", t.label);
      });
      streamRef.current = null;
    }

    if (v) {
      v.srcObject = null;
      v.pause();
    }

    setReady(false);
    setState("idle");
    console.log("Camera stopped");
  };

  // 카메라 초기화
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        await startCamera();
      } catch (e: unknown) {
        console.error("Initial camera start failed:", e);
        // 에러는 startCamera에서 이미 처리됨
      }
    })();

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    state,
    ready,
    error,
    startCamera,
    stopCamera,
  };
}
