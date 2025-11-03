import React, { useState, useEffect } from 'react';
import './HypeBar.css';

function HypeBar({ hypeData }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (hypeData && hypeData.score !== undefined) {
      // Much faster, more direct update (like audio visualizer)
      const target = hypeData.score;
      
      // Very fast animation (50ms) for instant response
      const steps = 5;
      const current = displayScore;
      const diff = target - current;
      const stepSize = diff / steps;
      let step = 0;
      
      const interval = setInterval(() => {
        step++;
        const newScore = current + (stepSize * step);
        setDisplayScore(Math.max(0, Math.min(100, newScore)));
        
        if (step >= steps) {
          setDisplayScore(target);
          clearInterval(interval);
        }
      }, 10); // 10ms * 5 = 50ms total (very fast)
      
      // Pulse effect when score is high
      if (target > 70) {
        setIsPulsing(true);
      } else {
        setIsPulsing(false);
      }
      
      return () => clearInterval(interval);
    }
  }, [hypeData]);

  if (!hypeData) {
    return (
      <div className="hype-bar-container">
        <div className="hype-bar-header">
          <span className="hype-icon">🔥</span>
          <span className="hype-label">Hype Meter</span>
        </div>
        <div className="hype-bar-wrapper">
          <div className="hype-bar" style={{ width: '0%' }}></div>
        </div>
        <div className="hype-info">
          <span className="viewer-count">Viewers: --</span>
        </div>
      </div>
    );
  }

  const getBarColor = () => {
    if (displayScore < 30) return '#4CAF50'; // Green
    if (displayScore < 60) return '#FFC107'; // Yellow
    if (displayScore < 80) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const formatViewerCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  return (
    <div className={`hype-bar-container ${isPulsing ? 'pulsing' : ''}`}>
      <div className="hype-bar-header">
        <span className="hype-icon">🔥</span>
        <span className="hype-label">Hype Meter</span>
        <span className="hype-score">{Math.round(displayScore)}%</span>
      </div>
      <div className="hype-bar-wrapper">
        <div 
          className="hype-bar" 
          style={{ 
            width: `${displayScore}%`,
            backgroundColor: getBarColor()
          }}
        >
          {displayScore > 10 && (
            <span className="hype-bar-text">{Math.round(displayScore)}%</span>
          )}
        </div>
      </div>
      <div className="hype-info">
        <span className="viewer-count">👥 {formatViewerCount(hypeData.viewer_count)} viewers</span>
        <span className="message-rate">{Math.round(hypeData.message_rate)} msg/10s</span>
      </div>
    </div>
  );
}

export default HypeBar;
