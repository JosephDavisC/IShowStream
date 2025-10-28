import React from 'react';
import './AgentActivityLog.css';
import { Activity, CheckCircle, Zap, Shield, Target, Database } from 'lucide-react';

function AgentActivityLog({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="agent-activity-log">
        <div className="activity-header">
          <Activity size={20} />
          <h3>Agent Activity Log</h3>
        </div>
        <div className="activity-empty">
          <p>Waiting for agent activity...</p>
          <p className="activity-hint">Agents will appear here when processing messages</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'message_received':
        return <Database size={16} />;
      case 'agent_start':
        return <Zap size={16} />;
      case 'agent_complete':
        return <CheckCircle size={16} />;
      case 'spam_detected':
        return <Shield size={16} />;
      case 'pipeline_complete':
        return <Target size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'complete':
        return 'status-complete';
      case 'processing':
        return 'status-processing';
      case 'blocked':
        return 'status-blocked';
      default:
        return 'status-default';
    }
  };

  const getAgentEmoji = (agent) => {
    switch (agent) {
      case 'SpamFilterAgent':
        return '🔍';
      case 'PriorityAgent':
        return '🎯';
      case 'System':
        return '📋';
      default:
        return '🤖';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatActivityTitle = (activity) => {
    const { activity_type, agent } = activity;

    switch (activity_type) {
      case 'message_received':
        return 'New message received';
      case 'agent_start':
        return `${agent} analyzing...`;
      case 'agent_complete':
        return `${agent} complete`;
      case 'spam_detected':
        return 'SPAM DETECTED';
      case 'pipeline_complete':
        return 'Pipeline complete ✅';
      default:
        return activity_type;
    }
  };

  const renderActivityDetails = (activity) => {
    const { activity_type, message, result } = activity;

    const details = [];

    // Show message info
    if (message) {
      details.push(
        <div key="user" className="activity-detail">
          <span className="detail-label">User:</span>
          <span className="detail-value">{message.username}</span>
        </div>
      );

      if (message.text) {
        details.push(
          <div key="msg" className="activity-detail">
            <span className="detail-label">Message:</span>
            <span className="detail-value message-text">"{message.text}"</span>
          </div>
        );
      }
    }

    // Show result details based on activity type
    if (result) {
      if (activity_type === 'agent_complete' && result.priority !== undefined) {
        const priorityBar = '█'.repeat(result.priority) + '░'.repeat(10 - result.priority);
        details.push(
          <div key="priority" className="activity-detail">
            <span className="detail-label">Priority:</span>
            <span className="detail-value">{result.priority}/10 <code>{priorityBar}</code></span>
          </div>
        );
        if (result.category) {
          details.push(
            <div key="category" className="activity-detail">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{result.category}</span>
            </div>
          );
        }
      }

      if (activity_type === 'spam_detected' && result.confidence !== undefined) {
        details.push(
          <div key="confidence" className="activity-detail">
            <span className="detail-label">Confidence:</span>
            <span className="detail-value">{result.confidence}%</span>
          </div>
        );
        if (result.spam_type) {
          details.push(
            <div key="type" className="activity-detail">
              <span className="detail-label">Type:</span>
              <span className="detail-value spam-type">{result.spam_type}</span>
            </div>
          );
        }
      }

      if (activity_type === 'pipeline_complete' && result.agents_executed) {
        details.push(
          <div key="agents" className="activity-detail">
            <span className="detail-label">Agents:</span>
            <span className="detail-value">{result.agents_executed.join(' → ')}</span>
          </div>
        );
      }
    }

    return details;
  };

  // Show most recent 20 activities
  const recentActivities = activities.slice(0, 20);

  return (
    <div className="agent-activity-log">
      <div className="activity-header">
        <div className="header-left">
          <Activity size={20} />
          <h3>Agent Activity Log</h3>
        </div>
        <div className="activity-count">
          {activities.length} events
        </div>
      </div>

      <div className="activity-list">
        {recentActivities.map((activity, index) => (
          <div
            key={activity.id || index}
            className={`activity-item ${getActivityColor(activity.status)} activity-type-${activity.activity_type}`}
          >
            <div className="activity-timestamp">
              [{formatTime(activity.timestamp)}]
            </div>

            <div className="activity-content">
              <div className="activity-title">
                <span className="activity-icon">
                  {getActivityIcon(activity.activity_type)}
                </span>
                <span className="activity-agent-emoji">
                  {getAgentEmoji(activity.agent)}
                </span>
                <span className="activity-title-text">
                  {formatActivityTitle(activity)}
                </span>
              </div>

              <div className="activity-details">
                {renderActivityDetails(activity)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentActivityLog;
