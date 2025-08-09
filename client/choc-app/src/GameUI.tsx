// src/GameUI.tsx
import React from "react";

interface GameUIProps {
  hearts: number;
  combo: number;
  score: number;
  isAlive: boolean;
  gamePhase: "idle" | "warning" | "danger" | "fever";
  timeRemaining: number;
  countdown: number | null;
  isPaused: boolean;
  showControlPanel: boolean;
  onResetGame: () => void;
  onTogglePause: () => void;
  onToggleControlPanel: () => void;
  onToggleCamera: () => void;
  isCameraOn: boolean;
}

export const GameUI: React.FC<GameUIProps> = ({
  hearts,
  combo,
  score,
  isAlive,
  gamePhase,
  timeRemaining,
  countdown,
  isPaused,
  showControlPanel,
  onResetGame,
  onTogglePause,
  onToggleControlPanel,
  onToggleCamera,
  isCameraOn,
}) => {
  // 게임 페이즈에 따른 투명도와 스타일
  const getPhaseStyles = () => {
    switch (gamePhase) {
      case "idle":
        return {
          opacity: 0.9,
          backgroundColor: "rgba(33, 192, 116, 0.15)",
          borderColor: "rgba(33, 192, 116, 0.4)",
        };
      case "warning":
        return {
          opacity: 0.95,
          backgroundColor: "rgba(247, 183, 49, 0.2)",
          borderColor: "rgba(247, 183, 49, 0.5)",
        };
      case "danger":
        return {
          opacity: 1.0,
          backgroundColor: "rgba(255, 80, 80, 0.25)",
          borderColor: "rgba(255, 80, 80, 0.7)",
        };
      case "fever":
        return {
          opacity: 0.95,
          backgroundColor: "rgba(255, 107, 53, 0.25)",
          borderColor: "rgba(255, 107, 53, 0.8)",
        };
      default:
        return {
          opacity: 0.9,
          backgroundColor: "rgba(33, 192, 116, 0.15)",
          borderColor: "rgba(33, 192, 116, 0.4)",
        };
    }
  };

  const phaseStyles = getPhaseStyles();
  const timePercent = (timeRemaining / 6000) * 100;

  return (
    <div style={styles.container}>
      {/* 상단 상태바 HUD */}
      <div
        style={{
          ...styles.statusBar,
          ...phaseStyles,
          animation: gamePhase === "fever" ? "feverPulse 2s infinite" : "none",
        }}
      >
        {/* 왼쪽: 라이프와 콤보 */}
        <div style={styles.leftSection}>
          {/* 라이프 */}
          <div style={styles.lifeContainer}>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                style={{
                  ...styles.heart,
                  opacity: i <= hearts ? 1 : 0.3,
                  color: i <= hearts ? "#ff5050" : "#ccc",
                }}
              >
                ❤️
              </span>
            ))}
          </div>

          {/* 콤보 */}
          {combo > 0 && (
            <div style={styles.comboContainer}>
              <div
                style={{
                  ...styles.combo,
                  animation:
                    gamePhase === "warning"
                      ? "comboPulse 0.5s infinite"
                      : "none",
                }}
              >
                {combo}
              </div>
              <div style={styles.comboLabel}>콤보</div>
            </div>
          )}
        </div>

        {/* 중앙: 상태 점과 피버 배지 */}
        <div style={styles.centerSection}>
          {/* 상태 점 */}
          <div style={styles.statusDot}>
            <div
              style={{
                ...styles.dot,
                backgroundColor:
                  gamePhase === "idle"
                    ? "#21c074"
                    : gamePhase === "warning"
                    ? "#f7b731"
                    : gamePhase === "danger"
                    ? "#ff5050"
                    : "#ff6b35",
                animation:
                  gamePhase === "danger" ? "dangerPulse 1s infinite" : "none",
              }}
            />
          </div>

          {/* 피버 배지 */}
          {gamePhase === "fever" && (
            <div style={styles.feverBadge}>
              <span style={styles.feverText}>🔥 FEVER x5</span>
            </div>
          )}
        </div>

        {/* 오른쪽: 점수와 버튼들 */}
        <div style={styles.rightSection}>
          {/* 점수 */}
          <div style={styles.scoreContainer}>
            <span style={styles.score}>{score.toLocaleString()}</span>
          </div>

          {/* 버튼들 */}
          <div style={styles.buttonContainer}>
            {/* 카메라 토글 버튼 */}
            <button
              onClick={onToggleCamera}
              style={{
                ...styles.cameraButton,
                backgroundColor: isCameraOn
                  ? "rgba(255, 80, 80, 0.3)"
                  : "rgba(33, 192, 116, 0.3)",
                borderColor: isCameraOn
                  ? "rgba(255, 80, 80, 0.6)"
                  : "rgba(33, 192, 116, 0.6)",
              }}
              title={isCameraOn ? "카메라 끄기" : "카메라 켜기"}
            >
              {isCameraOn ? "📷" : "📷"}
            </button>

            {/* 일시정지 버튼 */}
            <button
              onClick={onTogglePause}
              style={styles.pauseButton}
              title={isPaused ? "게임 재개" : "게임 일시정지"}
            >
              {isPaused ? "▶️" : "⏸️"}
            </button>

            {/* ControlPanel 토글 버튼 */}
            <button
              onClick={onToggleControlPanel}
              style={styles.controlPanelButton}
              title={showControlPanel ? "설정 패널 숨기기" : "설정 패널 보기"}
            >
              {showControlPanel ? "⚙️" : "⚙️"}
            </button>
          </div>
        </div>
      </div>

      {/* 타이머 게이지 - 상태바 아래에 별도로 표시 */}
      <div style={styles.timerSection}>
        <div style={styles.timerBar}>
          <div
            style={{
              ...styles.timerProgress,
              width: `${timePercent}%`,
              backgroundColor:
                gamePhase === "idle"
                  ? "#21c074"
                  : gamePhase === "warning"
                  ? "#f7b731"
                  : gamePhase === "danger"
                  ? "#ff5050"
                  : "#ff6b35",
            }}
          />
        </div>

        {/* 카운트다운 */}
        {countdown !== null && (
          <div style={styles.countdown}>
            <span style={styles.countdownText}>{countdown}</span>
            <div style={styles.countdownMessage}>지금 눈을 감아주세요!</div>
          </div>
        )}
      </div>

      {/* 게임 오버 화면 */}
      {!isAlive && (
        <div style={styles.gameOver}>
          <div style={styles.gameOverContent}>
            <h2 style={styles.gameOverTitle}>게임 오버</h2>
            <p style={styles.gameOverScore}>
              최종 점수: {score.toLocaleString()}
            </p>
            <button onClick={onResetGame} style={styles.restartButton}>
              다시 시작
            </button>
          </div>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>
        {`
          @keyframes comboPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }

          @keyframes dangerPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.8; }
          }

          @keyframes feverPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.3); }
            50% { box-shadow: 0 0 30px rgba(255, 107, 53, 0.6); }
          }
        `}
      </style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 1000,
  },

  // 상태바 스타일
  statusBar: {
    position: "absolute",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90vw",
    maxWidth: "800px",
    padding: "12px 20px",
    borderRadius: "20px",
    border: "2px solid",
    backdropFilter: "blur(15px)",
    pointerEvents: "auto",
    transition: "all 0.3s ease",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
  },

  leftSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  centerSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  rightSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  lifeContainer: {
    display: "flex",
    gap: "4px",
  },

  heart: {
    fontSize: "18px",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
  },

  comboContainer: {
    textAlign: "center",
  },

  combo: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#ff6b35",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },

  comboLabel: {
    fontSize: "10px",
    color: "#666",
    marginTop: "2px",
  },

  statusDot: {
    display: "flex",
    alignItems: "center",
  },

  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },

  feverBadge: {
    backgroundColor: "rgba(255, 107, 53, 0.9)",
    color: "white",
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "10px",
    fontWeight: "bold",
  },

  feverText: {
    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
  },

  scoreContainer: {
    textAlign: "right",
  },

  score: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    textShadow: "0 1px 2px rgba(255,255,255,0.5)",
  },

  buttonContainer: {
    display: "flex",
    gap: "8px",
  },

  cameraButton: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid",
    borderRadius: "8px",
    padding: "8px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(5px)",
  },

  pauseButton: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    padding: "8px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(5px)",
  },

  controlPanelButton: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "8px",
    padding: "8px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backdropFilter: "blur(5px)",
  },

  // 타이머 섹션
  timerSection: {
    position: "absolute",
    top: "100px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "90vw",
    maxWidth: "800px",
    pointerEvents: "none",
  },

  timerBar: {
    width: "100%",
    height: "6px",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "8px",
  },

  timerProgress: {
    height: "100%",
    transition: "width 0.1s ease",
    borderRadius: "3px",
  },

  countdown: {
    textAlign: "center",
    pointerEvents: "none",
  },

  countdownText: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#ff5050",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
    display: "block",
  },

  countdownMessage: {
    fontSize: "12px",
    color: "#ff5050",
    fontWeight: "bold",
    marginTop: "4px",
  },

  gameOver: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    pointerEvents: "auto",
  },

  gameOverContent: {
    backgroundColor: "white",
    padding: "32px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  },

  gameOverTitle: {
    margin: "0 0 16px",
    color: "#ff5050",
    fontSize: "24px",
  },

  gameOverScore: {
    margin: "0 0 24px",
    fontSize: "18px",
    color: "#666",
  },

  restartButton: {
    backgroundColor: "#21c074",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
};
