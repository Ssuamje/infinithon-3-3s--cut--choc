// src/hooks/useDisplaySettings.ts
import { useState } from "react";

export interface UseDisplaySettingsReturn {
  mirrored: boolean;
  showFace: boolean;
  showCharacter: boolean;
  setMirrored: (mirrored: boolean) => void;
  setShowFace: (showFace: boolean) => void;
  setShowCharacter: (showCharacter: boolean) => void;
}

export function useDisplaySettings(): UseDisplaySettingsReturn {
  const [mirrored, setMirrored] = useState(true);
  const [showFace, setShowFace] = useState(true);
  const [showCharacter, setShowCharacter] = useState(false);

  return {
    mirrored,
    showFace,
    showCharacter,
    setMirrored,
    setShowFace,
    setShowCharacter,
  };
}
