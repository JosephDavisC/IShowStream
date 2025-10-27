import React from 'react';

function RecentMessages({ messages }) {
  return (
    <div className="recent-messages">
      <h2>💬 Recent Messages</h2>
      <div className="messages-scroll">
        {messages.map((msg, index) => {
          const isSpam = msg.agent_analysis?.spam?.is_spam || false;
          const priority = msg.agent_analysis?.priority?.priority || 0;
          
          return (
            <div 
              key={msg.id || index} 
              className={`message-row ${isSpam ? 'spam' : ''}`}
            >
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              <span className="message-username">{msg.username}:</span>
              <span className="message-text">{msg.message}</span>
              {isSpam && <span className="spam-tag">SPAM</span>}
              {priority >= 7 && <span className="priority-tag">{priority}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentMessages;