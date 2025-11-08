import React, { useState, useEffect, useRef, useMemo } from 'react';
import './AIInsights.css';
import '../App.css';
import { useResolvedInsights } from '../contexts/ResolvedInsightsContext';

function AIInsights({ insights }) {
  const { resolvedItems, addResolvedItem } = useResolvedInsights();
  const [localHistory, setLocalHistory] = useState([]);
  const [activeInsights, setActiveInsights] = useState(null);
  const prevInsightsRef = useRef(null);
  const insightTimersRef = useRef(new Map());
  
  // Create a Set of resolved item IDs for quick lookup
  const resolvedItemIds = new Set(
    (resolvedItems || []).map(item => `${item.type}-${item.itemId}`)
  );

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      let date;
      if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp?._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return 'just now';
      }

      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (error) {
      return 'just now';
    }
  };

  // Generate unique ID for insight items
  const generateItemId = (type, index, content) => {
    if (typeof content === 'string') {
      return `${type}-${index}-${content.substring(0, 20)}`;
    }
    if (content?.request || content?.question) {
      return `${type}-${index}-${(content.request || content.question).substring(0, 20)}`;
    }
    return `${type}-${index}`;
  };

  // Handle new insights with animation
  useEffect(() => {
    if (!insights || !insights.insights) {
      setActiveInsights(null);
      return;
    }

    const data = insights.insights;
    const insightKey = JSON.stringify(data);
    
    // Check if insights actually changed
    if (prevInsightsRef.current === insightKey) {
      return;
    }

    prevInsightsRef.current = insightKey;

    // Clear existing timers
    insightTimersRef.current.forEach(timer => clearTimeout(timer));
    insightTimersRef.current.clear();

    // Set new insights with animation trigger
    setActiveInsights({ ...data, _timestamp: insights.timestamp || new Date(), _animate: true });

    // Set up auto-hide timers (1 minute = 60000ms)
    const hideTimer = setTimeout(() => {
      // Move current insights to history before hiding
      if (activeInsights) {
        setLocalHistory(prev => [{
          ...activeInsights,
          _resolvedAt: new Date(),
          _autoHidden: true
        }, ...prev].slice(0, 100)); // Keep last 100 in history
      }
      
      setActiveInsights(null);
      insightTimersRef.current.delete('main');
    }, 60000);

    insightTimersRef.current.set('main', hideTimer);

    // Remove animation class after animation completes
    const animationTimer = setTimeout(() => {
      setActiveInsights(prev => prev ? { ...prev, _animate: false } : null);
    }, 500);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(animationTimer);
    };
  }, [insights]);

  // Mark item as resolved
  const markAsResolved = (type, item, index) => {
    console.log('🔵 markAsResolved called:', { type, item, index });
    const itemId = generateItemId(type, index, item);
    console.log('🔵 Generated itemId:', itemId);
    
    try {
      // Add to shared resolved insights context (persisted in localStorage)
      addResolvedItem({
        type,
        item,
        itemId,
        index,
        timestamp: activeInsights?._timestamp
      });
      console.log('✅ Item added to resolved insights context');

      // Also add to local history for immediate UI update
      const historyItem = {
        type,
        item,
        index,
        resolvedAt: new Date(),
        timestamp: activeInsights?._timestamp
      };
      setLocalHistory(prev => [historyItem, ...prev].slice(0, 100));
      console.log('✅ Item added to local history');
    } catch (error) {
      console.error('❌ Error marking item as resolved:', error);
    }
  };

  // Combine resolved items from context with local history
  const allHistory = useMemo(() => {
    console.log('🔄 AIInsights: Combining history, resolvedItems:', resolvedItems.length, 'localHistory:', localHistory.length);
    const combined = [...(resolvedItems || []), ...localHistory]
      .sort((a, b) => {
        const dateA = new Date(a.resolvedAt || a._resolvedAt || a.timestamp || 0);
        const dateB = new Date(b.resolvedAt || b._resolvedAt || b.timestamp || 0);
        return dateB - dateA; // Most recent first
      })
      .slice(0, 100);
    console.log('🔄 AIInsights: Combined history count:', combined.length);
    return combined;
  }, [resolvedItems, localHistory]);

  if (!activeInsights && allHistory.length === 0) {
    return (
      <div className="ai-insights">
        <h2>🧠 AI Insights</h2>
        <div className="no-insights">
          <p>No insights available yet.</p>
          <p className="hint">Insights are generated every 1 minute</p>
        </div>
      </div>
    );
  }

  const data = activeInsights || {};
  const hasActiveInsights = activeInsights && Object.keys(data).filter(k => !k.startsWith('_')).length > 0;

  return (
    <div className={`ai-insights ${activeInsights?._animate ? 'insights-enter' : ''}`}>
      <h2>🧠 AI Insights</h2>

      {/* Active Insights */}
      {hasActiveInsights && (
        <div className="insights-active">
          {/* Actionable Insights */}
          {data.actionable_insights && data.actionable_insights.length > 0 && (
            <div className="insights-section actionable">
              <h3>💡 Action Items</h3>
              <ul className="insight-list">
                {data.actionable_insights.map((insight, index) => {
                  const itemId = generateItemId('actionable', index, insight);
                  const isResolved = resolvedItemIds.has(itemId);
                  
                  if (isResolved) return null;
                  
                  return (
                    <li 
                      key={itemId} 
                      className="insight-item priority clickable"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🖱️ Clicked actionable insight:', { itemId, insight, index });
                        markAsResolved('actionable', insight, index);
                      }}
                      title="Click to mark as resolved"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <span className="icon">⚡</span>
                      <span className="text">{insight}</span>
                      <span className="timestamp">{formatTimestamp(data._timestamp)}</span>
                      <span className="resolve-btn">✓</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Important Questions */}
          {data.important_questions && data.important_questions.length > 0 && (
            <div className="insights-section questions">
              <h3>❓ Missed Questions</h3>
              <ul className="question-list">
                {data.important_questions.map((q, index) => {
                  const itemId = generateItemId('question', index, q);
                  const isResolved = resolvedItemIds.has(itemId);
                  
                  if (isResolved) return null;
                  
                  return (
                    <li 
                      key={itemId} 
                      className="question-item clickable"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🖱️ Clicked question:', { itemId, q, index });
                        markAsResolved('question', q, index);
                      }}
                      title="Click to mark as resolved"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <span className="username">{q.username}:</span>
                      <span className="question">{q.question}</span>
                      <span className="timestamp">{formatTimestamp(data._timestamp)}</span>
                      <span className="resolve-btn">✓</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Content Requests */}
          {data.content_requests && data.content_requests.length > 0 && (
            <div className="insights-section requests">
              <h3>🎮 Viewer Requests</h3>
              <ul className="request-list">
                {data.content_requests.map((req, index) => {
                  const itemId = generateItemId('request', index, req);
                  const isResolved = resolvedItemIds.has(itemId);
                  
                  if (isResolved) return null;
                  
                  return (
                    <li 
                      key={itemId} 
                      className={`request-item ${req.urgency} clickable`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🖱️ Clicked request:', { itemId, req, index });
                        markAsResolved('request', req, index);
                      }}
                      title="Click to mark as resolved"
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <span className="request-text">{req.request}</span>
                      <span className="request-meta">
                        <span className="frequency">{req.frequency}x</span>
                        <span className={`urgency-badge ${req.urgency}`}>{req.urgency}</span>
                        <span className="timestamp">{formatTimestamp(data._timestamp)}</span>
                        <span className="resolve-btn">✓</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Sentiment Analysis */}
          {data.sentiment && (
            <div className="insights-section sentiment">
              <h3>😊 Chat Sentiment</h3>
              <div className="sentiment-card">
                <div className="sentiment-main">
                  <span className={`sentiment-badge ${data.sentiment.overall}`}>
                    {data.sentiment.overall.toUpperCase()}
                  </span>
                  <span className={`sentiment-trend ${data.sentiment.trend}`}>
                    {data.sentiment.trend === 'improving' && '📈'}
                    {data.sentiment.trend === 'declining' && '📉'}
                    {data.sentiment.trend === 'stable' && '➡️'}
                    {data.sentiment.trend}
                  </span>
                  <span className="timestamp">{formatTimestamp(data._timestamp)}</span>
                </div>
                <p className="sentiment-reason">{data.sentiment.reason}</p>
              </div>
            </div>
          )}

          {/* Top Topics */}
          {data.top_topics && data.top_topics.length > 0 && (
            <div className="insights-section topics">
              <h3>🔥 Trending Topics</h3>
              <div className="topic-tags">
                {data.top_topics.map((topic, index) => (
                  <span key={index} className="topic-tag">
                    {topic.topic} ({topic.mentions})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="insights-meta">
            <small>
              Based on {insights?.message_count || 0} messages
              {data._timestamp && ` • Updated: ${formatTimestamp(data._timestamp)}`}
            </small>
          </div>
        </div>
      )}

      {/* History Section */}
      {allHistory.length > 0 && (
        <div className="insights-history">
          <h3>📜 History ({allHistory.length})</h3>
          <div className="history-list">
            {allHistory.slice(0, 20).map((item, index) => (
              <div key={item.id || index} className="history-item">
                <span className="history-type">
                  {item.type === 'actionable' && '💡'}
                  {item.type === 'question' && '❓'}
                  {item.type === 'request' && '🎮'}
                </span>
                <span className="history-content">
                  {typeof item.item === 'string' ? item.item : 
                   item.item?.question ? `${item.item.username}: ${item.item.question}` :
                   item.item?.request || JSON.stringify(item.item)}
                </span>
                <span className="history-time">
                  {formatTimestamp(item.resolvedAt || item._resolvedAt || item.timestamp)}
                  {item._autoHidden && ' (auto-hidden)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AIInsights;
