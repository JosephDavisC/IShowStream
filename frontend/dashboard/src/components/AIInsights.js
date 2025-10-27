import React from 'react';

function AIInsights({ insights }) {
  if (!insights || !insights.insights) {
    return (
      <div className="ai-insights">
        <h2>🧠 AI Insights</h2>
        <div className="no-insights">
          <p>No insights available yet.</p>
          <p className="hint">Insights are generated every 5 minutes</p>
        </div>
      </div>
    );
  }

  const data = insights.insights;

  return (
    <div className="ai-insights">
      <h2>🧠 AI Insights</h2>

      {/* Actionable Insights - Most Important */}
      {data.actionable_insights && data.actionable_insights.length > 0 && (
        <div className="insights-section actionable">
          <h3>💡 Action Items</h3>
          <ul className="insight-list">
            {data.actionable_insights.map((insight, index) => (
              <li key={index} className="insight-item priority">
                <span className="icon">⚡</span>
                <span className="text">{insight}</span>
              </li>
            ))}
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
            </div>
            <p className="sentiment-reason">{data.sentiment.reason}</p>
          </div>
        </div>
      )}

      {/* Content Requests */}
      {data.content_requests && data.content_requests.length > 0 && (
        <div className="insights-section requests">
          <h3>🎮 Viewer Requests</h3>
          <ul className="request-list">
            {data.content_requests.map((req, index) => (
              <li key={index} className={`request-item ${req.urgency}`}>
                <span className="request-text">{req.request}</span>
                <span className="request-meta">
                  <span className="frequency">{req.frequency}x</span>
                  <span className={`urgency-badge ${req.urgency}`}>{req.urgency}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Important Questions */}
      {data.important_questions && data.important_questions.length > 0 && (
        <div className="insights-section questions">
          <h3>❓ Missed Questions</h3>
          <ul className="question-list">
            {data.important_questions.map((q, index) => (
              <li key={index} className="question-item">
                <span className="username">{q.username}:</span>
                <span className="question">{q.question}</span>
              </li>
            ))}
          </ul>
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
          Based on {insights.message_count || 0} messages
          {insights.timestamp && ` • Last updated: ${new Date(insights.timestamp.seconds * 1000).toLocaleTimeString()}`}
        </small>
      </div>
    </div>
  );
}

export default AIInsights;
