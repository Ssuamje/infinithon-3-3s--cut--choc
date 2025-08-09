// src/types/electron.d.ts
declare global {
  interface Window {
    blinkAPI?: {
      updateBlinkCount: (count: number) => void;
      getBlinkCount: () => Promise<number>;
      updateWarningState: (state: {
        isVisible: boolean;
        progress: number;
        timeWithoutBlink: number;
        combo: number;
        score: number;
        totalBlinks: number;
      }) => void;
    };
    electronAPI?: {
      on: (
        channel: string,
        func: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
      ) => void;
      removeListener: (
        channel: string,
        func: (event: Electron.IpcRendererEvent, ...args: unknown[]) => void
      ) => void;
      sendWarningStateSync: (state: {
        isVisible: boolean;
        progress: number;
        timeWithoutBlink: number;
        combo: number;
        score: number;
        totalBlinks: number;
      }) => void;
    };
  }
}

export {};
