import React from 'react';

function StatusDisplay({ 
  status, 
  type, 
  detectedFruit, 
  inventory, 
  adjustFruitCount, 
  autoDetectionActive 
}) {
  const getStatusClass = () => {
    let baseClass = 'detection-status';
    
    switch (type) {
      case 'active':
        return `${baseClass} status-active`;
      case 'loading':
        return `${baseClass} status-loading pulse`;
      case 'error':
        return `${baseClass} status-error`;
      default:
        return baseClass;
    }
  };

  // Handle ADD button click
  const handleAddFruit = () => {
    if (detectedFruit && adjustFruitCount) {
      adjustFruitCount(detectedFruit.name, 1);
      console.log(`➕ Added 1 ${detectedFruit.name} to inventory`);
    }
  };

  // Handle REMOVE button click
  const handleRemoveFruit = () => {
    if (detectedFruit && adjustFruitCount) {
      adjustFruitCount(detectedFruit.name, -1);
      console.log(`➖ Removed 1 ${detectedFruit.name} from inventory`);
    }
  };

  // Get current inventory count for the detected fruit
  const getCurrentCount = () => {
    if (!detectedFruit || !inventory) return 0;
    const fruitData = inventory[detectedFruit.name.toLowerCase()];
    return fruitData ? fruitData.count : 0;
  };

  return (
    <div className="status-display-container">
      <div className={getStatusClass()}>
        <strong>Status:</strong> {status}
      </div>

      {/* Show ADD/REMOVE controls when fruit is detected and camera is analyzing */}
      {detectedFruit && (type === 'active' || autoDetectionActive) && (
        <div className="fruit-controls" style={{
          background: 'rgba(74, 144, 226, 0.1)',
          border: '1px solid rgba(74, 144, 226, 0.3)',
          borderRadius: '10px',
          padding: '15px',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          justifyContent: 'space-between'
        }}>
          {/* Detected Fruit Info */}
          <div className="detected-fruit-info" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1
          }}>
            <span style={{ fontSize: '2em' }}>{detectedFruit.emoji}</span>
            <div>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '1.1em',
                textTransform: 'capitalize'
              }}>
                {detectedFruit.name}
              </div>
              <div style={{ 
                fontSize: '0.9em', 
                opacity: 0.8,
                color: '#666'
              }}>
                Confidence: {(detectedFruit.confidence * 100).toFixed(1)}%
              </div>
              <div style={{ 
                fontSize: '0.9em', 
                color: '#4a90e2',
                fontWeight: 'bold'
              }}>
                Current: {getCurrentCount()} in inventory
              </div>
            </div>
          </div>

          {/* ADD/REMOVE Buttons */}
          <div className="inventory-controls" style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              onClick={handleRemoveFruit}
              disabled={getCurrentCount() <= 0}
              className="inventory-btn remove-btn"
              style={{
                background: getCurrentCount() <= 0 ? '#ccc' : 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '1em',
                fontWeight: 'bold',
                cursor: getCurrentCount() <= 0 ? 'not-allowed' : 'pointer',
                opacity: getCurrentCount() <= 0 ? 0.5 : 1,
                transition: 'all 0.2s ease',
                minWidth: '80px'
              }}
              title={getCurrentCount() <= 0 ? 'No items to remove' : `Remove 1 ${detectedFruit.name}`}
            >
              ➖ REMOVE
            </button>

            <button
              onClick={handleAddFruit}
              className="inventory-btn add-btn"
              style={{
                background: 'linear-gradient(45deg, #51cf66, #40c057)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '1em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '80px'
              }}
              title={`Add 1 ${detectedFruit.name} to inventory`}
            >
              ➕ ADD
            </button>
          </div>
        </div>
      )}

      {/* Show helper text when real-time detection is active but no fruit detected */}
      {autoDetectionActive && !detectedFruit && type === 'active' && (
        <div className="detection-helper" style={{
          background: 'rgba(102, 126, 234, 0.1)',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          borderRadius: '10px',
          padding: '12px',
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '0.9em',
          color: '#666'
        }}>
          <span style={{ fontSize: '1.2em', marginRight: '8px' }}>👁️</span>
          Place fruits in view to see ADD/REMOVE controls
        </div>
      )}
    </div>
  );
}

export default StatusDisplay;