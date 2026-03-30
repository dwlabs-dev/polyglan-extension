import React, { useEffect, useState } from 'react';

interface FeedbackMessage {
  id: string;
  text: string;
  level: 'info' | 'warning' | 'success';
  timestamp: number;
}

interface FeedbackPanelProps {
  messages: FeedbackMessage[];
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ messages }) => {
  const [displayedMessages, setDisplayedMessages] = useState<FeedbackMessage[]>([]);

  useEffect(() => {
    // Keep only the last 3 messages
    setDisplayedMessages(messages.slice(-3));
  }, [messages]);

  const containerStyle: React.CSSProperties = {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '150px',
    overflow: 'hidden',
  };

  const messageStyle = (level: string): React.CSSProperties => {
    let backgroundColor = '#E8F5E9';
    let borderColor = '#4CAF50';

    if (level === 'warning') {
      backgroundColor = '#FFF3E0';
      borderColor = '#C1666B';
    } else if (level === 'success') {
      backgroundColor = '#E8F5E9';
      borderColor = '#4CAF50';
    }

    return {
      padding: '8px 12px',
      borderRadius: '8px',
      backgroundColor,
      borderLeft: `3px solid ${borderColor}`,
      fontSize: '12px',
      color: '#4A403A',
      animation: 'fadeIn 0.25s ease-in',
      opacity: 1,
    };
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      {displayedMessages.map((msg) => (
        <div key={msg.id} style={messageStyle(msg.level)}>
          {msg.text}
        </div>
      ))}
    </div>
  );
};

export default FeedbackPanel;
