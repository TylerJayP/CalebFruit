import React from 'react';

function InventorySection({ inventory, FRUIT_CLASSES, updateThreshold }) {
  return (
    <div className="inventory-section">
      <h2 className="section-title">📊 Inventory Management</h2>
      
      <div className="thresholds-content">
        <div className="threshold-intro">
          <p>Set minimum stock levels for each fruit. You'll be alerted when inventory drops below these thresholds.</p>
        </div>
        
        <div className="threshold-grid">
          {FRUIT_CLASSES.map(fruit => {
            const data = inventory[fruit];
            if (!data) return null;
            
            return (
              <div key={fruit} className="threshold-card">
                <span className="threshold-emoji">{data.emoji}</span>
                <div className="threshold-name">
                  {fruit.charAt(0).toUpperCase() + fruit.slice(1)}
                </div>
                <div className="threshold-current">
                  Current: {data.count}
                </div>
                <div className="threshold-input-wrapper">
                  <div className="threshold-input-group">
                    <label className="threshold-input-label">Min:</label>
                    <input
                      type="number"
                      value={data.threshold}
                      min="0"
                      max="20"
                      onChange={(e) => updateThreshold(fruit, e.target.value)}
                      className="threshold-input"
                    />
                  </div>
                  <div className="threshold-status">
                    {data.count <= data.threshold && data.count > 0 ? (
                      <span className="status-warning">⚠️ Low Stock</span>
                    ) : data.count === 0 ? (
                      <span className="status-danger">❌ Out of Stock</span>
                    ) : (
                      <span className="status-ok">✓ In Stock</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="inventory-stats">
          <div className="stat-item">
            <span className="stat-label">Total Items:</span>
            <span className="stat-value">
              {Object.values(inventory).reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Low Stock:</span>
            <span className="stat-value warning">
              {Object.values(inventory).filter(item => item.count <= item.threshold && item.count > 0).length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Out of Stock:</span>
            <span className="stat-value danger">
              {Object.values(inventory).filter(item => item.count === 0).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventorySection;