import React, { useState } from 'react';

function InventorySection({ inventory, FRUIT_CLASSES, updateThreshold }) {
  const [activeTab, setActiveTab] = useState('inventory');
  
  return (
    <div className="inventory-section">
      <h2 className="section-title">📊 Inventory Management</h2>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <span className="tab-icon">📦</span>
          Current Inventory
        </button>
        <button 
          className={`tab-button ${activeTab === 'thresholds' ? 'active' : ''}`}
          onClick={() => setActiveTab('thresholds')}
        >
          <span className="tab-icon">⚙️</span>
          Threshold Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'inventory' && (
          <div className="inventory-tab">
            <div className="inventory-grid">
              {FRUIT_CLASSES.map(fruit => {
                const data = inventory[fruit];
                if (!data) return null;
                
                const isLowStock = data.count <= data.threshold && data.count > 0;
                const isOutOfStock = data.count === 0;
                
                return (
                  <div 
                    key={fruit}
                    className={`fruit-card ${isLowStock ? 'low-stock' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`}
                  >
                    <span className="fruit-emoji">{data.emoji}</span>
                    <div className="fruit-name">
                      {fruit.charAt(0).toUpperCase() + fruit.slice(1)}
                    </div>
                    <div className={`fruit-count ${isOutOfStock ? 'out-of-stock-text' : ''}`}>
                      {data.count}
                    </div>
                    <div className="fruit-threshold">
                      Min: {data.threshold}
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
        )}

        {activeTab === 'thresholds' && (
          <div className="thresholds-tab">
            <div className="threshold-intro">
              <p>Set minimum stock levels for each fruit. You'll be alerted when inventory drops below these thresholds.</p>
            </div>
            
            <div className="threshold-grid">
              {FRUIT_CLASSES.map(fruit => {
                const data = inventory[fruit];
                if (!data) return null;
                
                return (
                  <div key={fruit} className="threshold-control">
                    <div className="threshold-item">
                      <span className="threshold-emoji">{data.emoji}</span>
                      <div className="threshold-info">
                        <label className="threshold-label">
                          {fruit.charAt(0).toUpperCase() + fruit.slice(1)}
                        </label>
                        <div className="current-count">Current: {data.count}</div>
                      </div>
                      <div className="threshold-input-group">
                        <label className="input-label">Min:</label>
                        <input
                          type="number"
                          value={data.threshold}
                          min="0"
                          max="20"
                          onChange={(e) => updateThreshold(fruit, e.target.value)}
                          className="threshold-input"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventorySection;