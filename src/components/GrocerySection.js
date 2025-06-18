import React, { useMemo } from 'react';
import { FRUIT_STORE_URLS } from '../constants/storeUrls';

function GrocerySection({ inventory }) {
  
  // Calculate low stock items
  const lowStockItems = useMemo(() => {
    return Object.entries(inventory)
      .filter(([fruit, data]) => data.count <= data.threshold);
  }, [inventory]);

  // Export shopping list as text file
  const exportGroceryList = () => {
    if (lowStockItems.length === 0) {
      alert('🎉 No items needed - your fruit bowl is well stocked!');
      return;
    }
    
    const timestamp = new Date().toLocaleDateString();
    let content = `Smart Fruit Bowl - Shopping List\nGenerated: ${timestamp}\n\n`;
    
    lowStockItems.forEach(([fruit, data]) => {
      const needed = Math.max(1, data.threshold - data.count + 2);
      content += `${fruit.charAt(0).toUpperCase() + fruit.slice(1)}: ${needed}\n`;
    });
    
    content += `\nTotal items: ${lowStockItems.length}`;
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fruit-shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 Shopping list exported successfully');
  };

  // Handle clicking on a fruit to open store page
  const handleFruitClick = (fruit) => {
    const url = FRUIT_STORE_URLS[fruit];
    if (url && url !== "https://store.example.com/" + fruit) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="grocery-section">
      <h2 className="section-title">🛒 Shopping List</h2>
      
      <div className="grocery-list bg-theme-light">
        {lowStockItems.length === 0 ? (
          <p className="empty-message">All fruit levels are adequate! 🎉</p>
        ) : (
          lowStockItems.map(([fruit, data]) => {
            const needed = Math.max(1, data.threshold - data.count + 2);
            const hasStoreUrl = FRUIT_STORE_URLS[fruit] && FRUIT_STORE_URLS[fruit] !== "https://store.example.com/" + fruit;
            return (
              <div key={fruit} className="grocery-item">
                <span>
                  {data.emoji} {fruit.charAt(0).toUpperCase() + fruit.slice(1)}
                </span>
                <span 
                  className={`needed-count ${hasStoreUrl ? 'clickable' : ''}`}
                  onClick={() => hasStoreUrl && handleFruitClick(fruit)}
                  style={{ cursor: hasStoreUrl ? 'pointer' : 'default' }}
                >
                  Need: {needed}
                </span>
              </div>
            );
          })
        )}
      </div>
      
      <button 
        className="btn btn-primary full-width" 
        onClick={exportGroceryList}
        disabled={lowStockItems.length === 0}
      >
        Export Shopping List
      </button>
    </div>
  );
}

export default GrocerySection;