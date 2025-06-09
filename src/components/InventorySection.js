import React from 'react';

function InventorySection({ inventory, FRUIT_CLASSES, updateThreshold }) {
  
  return (
    <div className="inventory-section">
      <h2 className="section-title">📊 Current Inventory</h2>
      
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
      
      <div className="threshold-controls">
        <h3>Set Low Stock Thresholds:</h3>
        <div className="threshold-grid">
          {FRUIT_CLASSES.map(fruit => {
            const data = inventory[fruit];
            if (!data) return null;
            
            return (
              <div key={fruit} className="threshold-control">
                <label>
                  {fruit.charAt(0).toUpperCase() + fruit.slice(1)}:
                </label>
                <input
                  type="number"
                  value={data.threshold}
                  min="0"
                  max="10"
                  onChange={(e) => updateThreshold(fruit, e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default InventorySection;