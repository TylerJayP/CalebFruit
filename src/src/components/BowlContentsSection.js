import React from 'react';

// Fruit emoji mapping for UI display
const FRUIT_EMOJIS = {
  apple: '🍎', banana: '🍌', kiwi: '🥝',
  mango: '🥭', orange: '🍊', peach: '🍑', pear: '🍐'
};

function BowlContentsSection({ 
  bowlContents, 
  persistentTracking, 
  setPersistentTracking,
  resetBowl 
}) {
  const getBowlDisplayItems = () => {
    return Object.entries(bowlContents).map(([fruit, data]) => ({
      fruit,
      count: data.count,
      emoji: FRUIT_EMOJIS[fruit] || '🍎',
      lastSeen: data.lastSeen,
      confidence: data.confidence
    }));
  };

  const bowlItems = getBowlDisplayItems();
  const totalItemsOnBowl = bowlItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bowl-contents-section">
      <div className="bowl-header">
        <h2 className="section-title">🍽️ Smart Bowl Contents</h2>
        <div className="bowl-stats">
          <span className="bowl-stat">
            📊 Items on bowl: <strong>{totalItemsOnBowl}</strong>
          </span>
        </div>
      </div>

      {/* Tracking Mode Toggle */}
      <div className="tracking-mode-control">
        <label className="tracking-toggle">
          <input
            type="checkbox"
            checked={persistentTracking}
            onChange={(e) => setPersistentTracking(e.target.checked)}
          />
          <span className="tracking-label">
            {persistentTracking ? '🔒 Persistent Tracking' : '📱 Live Detection Only'}
          </span>
        </label>
        <p className="tracking-description">
          {persistentTracking 
            ? 'Keep tracking fruits until they\'re removed from view'
            : 'Only show fruits currently detected by camera'
          }
        </p>
      </div>

      {/* Bowl Contents Grid */}
      <div className="bowl-contents-grid">
        {bowlItems.length === 0 ? (
          <div className="empty-bowl-message">
            <div className="empty-bowl-icon">🍽️</div>
            <h3>Bowl is Empty</h3>
            <p>Place fruits on your tray and start tracking!</p>
          </div>
        ) : (
          bowlItems.map(item => (
            <div key={item.fruit} className="bowl-item-card">
              <div className="bowl-item-header">
                <span className="bowl-item-emoji">{item.emoji}</span>
                <span className="bowl-item-count">{item.count}</span>
              </div>
              
              <div className="bowl-item-info">
                <div className="bowl-item-name">
                  {item.fruit.charAt(0).toUpperCase() + item.fruit.slice(1)}
                </div>
                
                <div className="bowl-item-meta">
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill"
                      style={{ 
                        width: `${item.confidence * 100}%`,
                        backgroundColor: item.confidence > 0.8 ? '#4CAF50' : 
                                       item.confidence > 0.6 ? '#FF9800' : '#F44336'
                      }}
                    />
                  </div>
                  <span className="confidence-text">
                    {(item.confidence * 100).toFixed(0)}% confident
                  </span>
                </div>
                
                {persistentTracking && (
                  <div className="last-seen">
                    Last seen: {Math.floor((Date.now() - item.lastSeen) / 1000)}s ago
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bowl Actions */}
      {bowlItems.length > 0 && (
        <div className="bowl-actions">
          <div className="bowl-summary">
            <h4>Current Bowl Summary:</h4>
            <p>
              {bowlItems.map(item => 
                `${item.count}x ${item.fruit.charAt(0).toUpperCase() + item.fruit.slice(1)}`
              ).join(', ')}
            </p>
          </div>
          
          <button 
            className="btn btn-warning bowl-reset-btn"
            onClick={resetBowl}
            title="Clear current bowl contents"
          >
            🗑️ Clear Bowl
          </button>
        </div>
      )}
    </div>
  );
}

export default BowlContentsSection;