import React, { useEffect, useRef } from 'react';

function RecentMessages({ messages }) {
  const messagesEndRef = useRef(null);
  const prevMessagesRef = useRef([]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMessagesRef.current.length) {
      // Check if a new message was added (not just updated)
      const latestMsg = messages[0];
      const prevLatest = prevMessagesRef.current[0];
      
      if (!prevLatest || latestMsg.id !== prevLatest.id) {
        // New message added, scroll to top (newest messages are at top)
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollTop = 0;
        }
      }
      prevMessagesRef.current = messages;
    }
  }, [messages]);

  return (
    <div className="recent-messages">
      <h2>💬 Recent Messages</h2>
      <div className="messages-scroll" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet. Waiting for chat activity...</div>
        ) : (
          messages.map((msg, index) => {
            const isSpam = msg.agent_analysis?.spam?.is_spam || false;
            const priority = msg.agent_analysis?.priority?.priority || 0;
            const isNew = index === 0; // Highlight newest message
            
            return (
              <div 
                key={msg.id || index} 
                className={`message-row ${isSpam ? 'spam' : ''} ${isNew ? 'message-new' : ''}`}
              >
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })}
                </span>
                <span className="message-username">{msg.username}:</span>
                <span className="message-text">{msg.message}</span>
                {isSpam && <span className="spam-tag">SPAM</span>}
                {priority >= 7 && <span className="priority-tag">{priority}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RecentMessages;