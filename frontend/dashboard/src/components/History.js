import React, { useState, useEffect, useMemo } from 'react';
import './History.css';
import { useResolvedInsights } from '../contexts/ResolvedInsightsContext';

function History() {
  const { resolvedItems } = useResolvedInsights();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = 'http://localhost:8082';

  useEffect(() => {
    fetchHistory();
  }, []);

  // Force re-render when resolved items change
  useEffect(() => {
    console.log('📊 History: Resolved items updated, count:', resolvedItems.length);
    // This will trigger a re-render when resolved items are updated
  }, [resolvedItems]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // Fetch recent insights (last 50)
      const response = await fetch(`${API_URL}/api/insights/latest`);
      const data = await response.json();
      
      // For now, we'll show the latest insight
      // In the future, you might want to fetch from a history endpoint
      if (data && !data.message) {
        setInsights([data]);
      } else {
        setInsights([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group resolved items by type for better organization
  // MUST be before any conditional returns (React Hooks rules)
  const groupedResolved = useMemo(() => {
    const items = Array.isArray(resolvedItems) ? resolvedItems : [];
    console.log('📊 History: Grouping resolved items, total:', items.length);
    return {
      actionable: items.filter(item => item.type === 'actionable'),
      question: items.filter(item => item.type === 'question'),
      request: items.filter(item => item.type === 'request')
    };
  }, [resolvedItems]);

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-container">
          <div className="loading-state">Loading history...</div>
        </div>
      </div>
    );
  }

  const hasResolvedItems = Array.isArray(resolvedItems) && resolvedItems.length > 0;
  const hasInsights = insights.length > 0;
  
  console.log('📊 History: hasResolvedItems:', hasResolvedItems, 'resolvedItems count:', (Array.isArray(resolvedItems) ? resolvedItems.length : 0));

  if (!hasResolvedItems && !hasInsights) {
    return (
      <div className="history-page">
        <div className="history-container">
          <h1 className="history-title">Insights History</h1>
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <h3>No History Yet</h3>
            <p>Your resolved insights and history will appear here.</p>
            <p className="history-hint">Resolve items in the dashboard to see them here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-container">
        <h1 className="history-title">Insights History</h1>
        <p className="history-subtitle">
          View resolved insights and past AI analysis from your stream
        </p>

        {/* Resolved Items Section */}
        {hasResolvedItems && (
          <div className="resolved-section">
            <div className="resolved-section-header">
              <span className="resolved-section-icon">✅</span>
              <h2 className="resolved-section-title">Resolved Items ({resolvedItems.length})</h2>
            </div>
            
            {groupedResolved.actionable.length > 0 && (
              <div className="history-category-card">
                <div className="category-header">
                  <span className="category-icon">💡</span>
                  <h3 className="category-title">Resolved Action Items</h3>
                </div>
                <div className="category-items">
                  {groupedResolved.actionable.map((item, i) => {
                    const itemContent = typeof item.item === 'string' ? item.item : JSON.stringify(item.item);
                    return (
                      <div key={item.id || i} className="category-item resolved-item">
                        <span className="resolved-content">{itemContent}</span>
                        <span className="resolved-time">
                          Resolved: {item.resolvedAt ? new Date(item.resolvedAt).toLocaleString() : 'Unknown'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {groupedResolved.question.length > 0 && (
              <div className="history-category-card">
                <div className="category-header">
                  <span className="category-icon">❓</span>
                  <h3 className="category-title">Resolved Questions</h3>
                </div>
                <div className="category-items">
                  {groupedResolved.question.map((item, i) => (
                    <div key={item.id || i} className="category-item question-item resolved-item">
                      <span className="question-user">{item.item.username}:</span>
                      <span className="question-text">{item.item.question}</span>
                      <span className="resolved-time">
                        Resolved: {new Date(item.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupedResolved.request.length > 0 && (
              <div className="history-category-card">
                <div className="category-header">
                  <span className="category-icon">🎮</span>
                  <h3 className="category-title">Resolved Content Requests</h3>
                </div>
                <div className="category-items">
                  {groupedResolved.request.map((item, i) => (
                    <div key={item.id || i} className="category-item request-item resolved-item">
                      <span className="request-text">{item.item.request}</span>
                      <span className="request-frequency">({item.item.frequency}x)</span>
                      <span className="resolved-time">
                        Resolved: {new Date(item.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past Insights from API */}
        {hasInsights && insights.map((insight, index) => (
          <div key={index} className="history-insight-card">
            <div className="history-card-header">
              <span className="history-date">
                {formatDate(insight.timestamp)}
              </span>
              <span className="history-badge">
                {insight.message_count || 0} messages analyzed
              </span>
            </div>

            <div className="history-categories">
              {insight.insights?.actionable_insights && insight.insights.actionable_insights.length > 0 && (
                <div className="history-category-card">
                  <div className="category-header">
                    <span className="category-icon">💡</span>
                    <h3 className="category-title">Actionable Insights</h3>
                  </div>
                  <div className="category-items">
                    {insight.insights.actionable_insights.map((item, i) => (
                      <div key={i} className="category-item">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.insights?.important_questions && insight.insights.important_questions.length > 0 && (
                <div className="history-category-card">
                  <div className="category-header">
                    <span className="category-icon">❓</span>
                    <h3 className="category-title">Important Questions</h3>
                  </div>
                  <div className="category-items">
                    {insight.insights.important_questions.map((q, i) => (
                      <div key={i} className="category-item question-item">
                        <span className="question-user">{q.username}:</span>
                        <span className="question-text">{q.question}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.insights?.content_requests && insight.insights.content_requests.length > 0 && (
                <div className="history-category-card">
                  <div className="category-header">
                    <span className="category-icon">🎮</span>
                    <h3 className="category-title">Content Requests</h3>
                  </div>
                  <div className="category-items">
                    {insight.insights.content_requests.map((req, i) => (
                      <div key={i} className="category-item request-item">
                        <span className="request-text">{req.request}</span>
                        <span className="request-frequency">({req.frequency}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.insights?.sentiment && (
                <div className="history-category-card">
                  <div className="category-header">
                    <span className="category-icon">😊</span>
                    <h3 className="category-title">Chat Sentiment</h3>
                  </div>
                  <div className="sentiment-content">
                    <div className="sentiment-main">
                      <span className="sentiment-value">{insight.insights.sentiment.overall}</span>
                      <span className="sentiment-trend">{insight.insights.sentiment.trend}</span>
                    </div>
                    {insight.insights.sentiment.reason && (
                      <p className="sentiment-reason">{insight.insights.sentiment.reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
