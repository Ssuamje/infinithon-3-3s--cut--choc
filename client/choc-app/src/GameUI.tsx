// src/GameUI.tsx
import React from "react";

interface GameUIProps {
  hearts: number;
  combo: number;
  score: number;
  isAlive: boolean;
  revivalProgress: number;
  revivalRequired: number;
  onLoseHeart: () => void;
  onResetGame: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  hearts,
  combo,
  score,
  isAlive,
  revivalProgress,
  revivalRequired,
  onLoseHeart,
  onResetGame,
}) => {
  return (
    <div style={styles.gameUI}>
      {/* 상태 표시 */}
      <div style={styles.statusRow}>
        <div style={styles.statusItem}>
          <span style={styles.label}>상태:</span>
          <span style={{
            ...styles.statusValue,
            color: isAlive ? "#21c074" : "#ff5050"
          }}>
            {isAlive ? "생존" : "사망"}
          </span>
        </div>
        <div style={styles.statusItem}>
          <span style={styles.label}>점수:</span>
          <span style={styles.scoreValue}>{score.toLocaleString()}</span>
        </div>
      </div>

      {/* 하트 표시 */}
      <div style={styles.heartsContainer}>
        <span style={styles.label}>생명:</span>
        <div style={styles.hearts}>
          {[1, 2, 3].map(i => (
            <span
              key={i}
              style={{
                ...styles.heart,
                opacity: i <= hearts ? 1 : 0.3,
                color: i <= hearts ? "#ff5050" : "#ccc"
              }}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* 콤보 표시 */}
      {isAlive && combo > 0 && (
        <div style={styles.comboContainer}>
          <div style={{
            ...styles.combo,
            transform: `scale(${Math.min(1.5, 1 + combo * 0.05)})`,
            color: combo > 10 ? "#ff6b35" : combo > 5 ? "#f7b731" : "#21c074"
          }}>
            {combo} COMBO!
          </div>
          <div style={styles.comboMultiplier}>
            x{Math.floor(combo / 5) + 1} 배율
          </div>
        </div>
      )}

      {/* 부활 진행도 */}
      {!isAlive && (
        <div style={styles.revivalContainer}>
          <div style={styles.revivalTitle}>💀 부활까지</div>
          <div style={styles.revivalBar}>
            <div
              style={{
                ...styles.revivalProgress,
                width: `${(revivalProgress / revivalRequired) * 100}%`
              }}
            />
          </div>
          <div style={styles.revivalText}>
            {revivalProgress} / {revivalRequired} 깜빡임
          </div>
        </div>
      )}

      {/* 게임 컨트롤 버튼 */}
      <div style={styles.controls}>
        <button style={styles.dangerButton} onClick={onLoseHeart}>
          하트 잃기 (테스트)
        </button>
        <button style={styles.resetButton} onClick={onResetGame}>
          게임 리셋
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  gameUI: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  statusItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    opacity: 0.9,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f7b731",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
  },
  heartsContainer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  hearts: {
    display: "flex",
    gap: 5,
  },
  heart: {
    fontSize: 24,
    transition: "all 0.3s ease",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
  },
  comboContainer: {
    textAlign: "center",
    marginBottom: 15,
    animation: "pulse 0.5s ease-in-out",
  },
  combo: {
    fontSize: 32,
    fontWeight: "bold",
    textShadow: "0 3px 6px rgba(0,0,0,0.4)",
    transition: "all 0.3s ease",
    marginBottom: 5,
  },
  comboMultiplier: {
    fontSize: 14,
    opacity: 0.8,
    fontWeight: "500",
  },
  revivalContainer: {
    textAlign: "center",
    marginBottom: 20,
    padding: 15,
    background: "rgba(0,0,0,0.2)",
    borderRadius: 10,
  },
  revivalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#ff5050",
  },
  revivalBar: {
    width: "100%",
    height: 8,
    background: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  revivalProgress: {
    height: "100%",
    background: "linear-gradient(90deg, #ff5050, #ff6b35)",
    borderRadius: 4,
    transition: "width 0.3s ease",
  },
  revivalText: {
    fontSize: 14,
    fontWeight: "500",
  },
  controls: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
  },
  dangerButton: {
    padding: "8px 16px",
    background: "#ff5050",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  resetButton: {
    padding: "8px 16px",
    background: "#21c074",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
};