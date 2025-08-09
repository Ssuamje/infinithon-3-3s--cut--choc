/// <reference types="vite/client" />

// Electron API 타입 정의
interface BlinkAPI {
  updateBlinkCount: (count: number) => void;
  getBlinkCount: () => Promise<number>;
}

interface Window {
  blinkAPI: BlinkAPI;
}
