import React, { useMemo, useState } from 'react';

// Smoothie recipes based on available fruits
const smoothieRecipes = [
  {
    name: "Tropical Paradise",
    ingredients: ["mango", "carambola", "guava"],
    instructions: "Blend 1 mango, 2 carambola, and 1 guava with coconut water until smooth. Perfect tropical treat!"
  },
  {
    name: "Classic Orange Delight",
    ingredients: ["orange", "banana", "peach"],
    instructions: "Blend 2 oranges, 1 banana, and 2 peaches. Add yogurt for creaminess!"
  },
  {
    name: "Exotic Dragon Bowl",
    ingredients: ["pitaya", "kiwi", "mango"],
    instructions: "Blend dragon fruit, 3 kiwis, and 1 mango. A colorful antioxidant powerhouse!"
  },
  {
    name: "Sweet & Tangy Mix",
    ingredients: ["apple", "pomegranate", "pear"],
    instructions: "Blend 2 apples, pomegranate seeds, and 2 pears. Add lime juice for extra zing!"
  },
  {
    name: "Melon Madness",
    ingredients: ["muskmelon", "peach", "banana"],
    instructions: "Blend cantaloupe chunks, 2 peaches, and 1 banana. Summer in a glass!"
  },
  {
    name: "Antioxidant Power",
    ingredients: ["plum", "persimmon", "apple"],
    instructions: "Blend 3 plums, 1 persimmon, and 2 apples. Rich in vitamins and antioxidants!"
  },
  {
    name: "Tomato Surprise",
    ingredients: ["tomato", "apple", "carambola"],
    instructions: "Blend 2 tomatoes, 1 apple, and 1 carambola. Unexpectedly refreshing savory-sweet blend!"
  },
  {
    name: "Green Power",
    ingredients: ["kiwi", "apple", "pear"],
    instructions: "Blend 3 kiwis, 2 apples, and 1 pear for a vitamin C boost!"
  },
  {
    name: "Sunset Blend",
    ingredients: ["orange", "mango", "peach"],
    instructions: "Blend 2 oranges, 1 mango, and 2 peaches. Like drinking a beautiful sunset!"
  },
  {
    name: "Berry Alternative",
    ingredients: ["pomegranate", "plum", "apple"],
    instructions: "Blend pomegranate seeds, 3 plums, and 2 apples for antioxidant power!"
  }
];

function RecipeSection({ inventory }) {
  const [activeTab, setActiveTab] = useState('ready');
  const [currentReadyIndex, setCurrentReadyIndex] = useState(0);
  const [currentNeedIndex, setCurrentNeedIndex] = useState(0);
  
  // Calculate available fruits
  const availableFruits = useMemo(() => {
    return Object.entries(inventory)
      .filter(([fruit, data]) => data.count > 0)
      .map(([fruit]) => fruit);
  }, [inventory]);

  // Categorize recipes
  const { readyRecipes, needIngredientsRecipes } = useMemo(() => {
    const ready = [];
    const needIngredients = [];
    
    smoothieRecipes.forEach(recipe => {
      const missingIngredients = recipe.ingredients.filter(ing => 
        !availableFruits.includes(ing)
      );
      
      if (missingIngredients.length === 0) {
        ready.push(recipe);
      } else {
        needIngredients.push({
          ...recipe,
          missingIngredients,
          availableIngredients: recipe.ingredients.filter(ing => 
            availableFruits.includes(ing)
          )
        });
      }
    });
    
    return { readyRecipes: ready, needIngredientsRecipes: needIngredients };
  }, [availableFruits]);

  // Export recipe shopping list
  const exportRecipeShoppingList = () => {
    if (needIngredientsRecipes.length === 0) {
      alert('🎉 Amazing! You already have everything needed for all recipes!');
      return;
    }
    
    const timestamp = new Date().toLocaleDateString();
    let content = `🥤 Smart Fruit Bowl - Recipe Shopping List\nGenerated: ${timestamp}\n`;
    content += `═══════════════════════════════════════════════\n\n`;
    
    // Create a consolidated shopping list
    const shoppingMap = new Map();
    
    needIngredientsRecipes.forEach(recipe => {
      recipe.missingIngredients.forEach(ingredient => {
        if (!shoppingMap.has(ingredient)) {
          shoppingMap.set(ingredient, {
            count: 1,
            recipes: [recipe.name]
          });
        } else {
          const existing = shoppingMap.get(ingredient);
          existing.count += 1;
          existing.recipes.push(recipe.name);
        }
      });
    });
    
    // Add shopping summary
    content += `📋 SHOPPING SUMMARY\n`;
    content += `───────────────────────────────────────────────\n`;
    Array.from(shoppingMap.entries()).forEach(([ingredient, data]) => {
      const emoji = inventory[ingredient]?.emoji || '🍎';
      content += `${emoji} ${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)}\n`;
      content += `   Needed for: ${data.recipes.join(', ')}\n`;
      content += `   Suggested quantity: ${Math.max(2, data.count * 2)}\n\n`;
    });
    
    // Add recipe details
    content += `\n🍳 RECIPE DETAILS\n`;
    content += `───────────────────────────────────────────────\n`;
    needIngredientsRecipes.forEach((recipe, index) => {
      content += `\n${index + 1}. ${recipe.name}\n`;
      content += `   ✅ You have: ${recipe.availableIngredients.length > 0 ? recipe.availableIngredients.join(', ') : 'none'}\n`;
      content += `   🛒 Need to buy: ${recipe.missingIngredients.join(', ')}\n`;
      content += `   📝 Instructions: ${recipe.instructions}\n`;
      content += `   📊 Progress: ${recipe.availableIngredients.length}/${recipe.ingredients.length} ingredients\n`;
    });
    
    // Add helpful tips
    content += `\n\n💡 SHOPPING TIPS\n`;
    content += `───────────────────────────────────────────────\n`;
    content += `• Buy extra quantities to enable more recipe combinations\n`;
    content += `• Fresh fruits work best for smoothies\n`;
    content += `• Consider seasonal availability and prices\n`;
    content += `• Store properly to maintain freshness\n\n`;
    
    content += `Total recipes you can unlock: ${needIngredientsRecipes.length}\n`;
    content += `Total unique ingredients to buy: ${shoppingMap.size}\n`;
    content += `\nGenerated by Smart Fruit Bowl 🍎✨`;
    
    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recipe-shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📥 Recipe shopping list exported successfully');
  };

  // Get recipes to display for each tab
  const recipesToDisplay = useMemo(() => {
    if (activeTab === 'ready') {
      if (readyRecipes.length === 0) return [];
      const displayRecipes = [];
      for (let i = 0; i < Math.min(3, readyRecipes.length); i++) {
        const index = (currentReadyIndex + i) % readyRecipes.length;
        displayRecipes.push(readyRecipes[index]);
      }
      return displayRecipes;
    } else {
      if (needIngredientsRecipes.length === 0) return [];
      const displayRecipes = [];
      for (let i = 0; i < Math.min(3, needIngredientsRecipes.length); i++) {
        const index = (currentNeedIndex + i) % needIngredientsRecipes.length;
        displayRecipes.push(needIngredientsRecipes[index]);
      }
      return displayRecipes;
    }
  }, [activeTab, readyRecipes, needIngredientsRecipes, currentReadyIndex, currentNeedIndex]);

  // Generate new recipes for current tab
  const generateRecipes = () => {
    if (activeTab === 'ready' && readyRecipes.length > 1) {
      let newIndex = currentReadyIndex;
      while (newIndex === currentReadyIndex) {
        newIndex = Math.floor(Math.random() * readyRecipes.length);
      }
      setCurrentReadyIndex(newIndex);
    } else if (activeTab === 'need' && needIngredientsRecipes.length > 1) {
      let newIndex = currentNeedIndex;
      while (newIndex === currentNeedIndex) {
        newIndex = Math.floor(Math.random() * needIngredientsRecipes.length);
      }
      setCurrentNeedIndex(newIndex);
    }
  };

  // If no fruits at all
  if (availableFruits.length === 0) {
    return (
      <div className="recipe-section">
        <h2 className="section-title">🥤 Smoothie Recipes</h2>
        <p className="empty-message">
          Add some fruit to your bowl to see recipe suggestions! 🍓
        </p>
      </div>
    );
  }

  return (
    <div className="recipe-section">
      <h2 className="section-title">🥤 Smoothie Recipes</h2>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'ready' ? 'active' : ''}`}
          onClick={() => setActiveTab('ready')}
        >
          <span className="tab-icon">🍳</span>
          Ready to Make
          {readyRecipes.length > 0 && (
            <span className="tab-count">{readyRecipes.length}</span>
          )}
        </button>
        <button 
          className={`tab-button ${activeTab === 'need' ? 'active' : ''}`}
          onClick={() => setActiveTab('need')}
        >
          <span className="tab-icon">🛒</span>
          Need Ingredients
          {needIngredientsRecipes.length > 0 && (
            <span className="tab-count">{needIngredientsRecipes.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'ready' && (
          <div className="ready-tab">
            {readyRecipes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🥤</div>
                <h3>No Complete Recipes Yet</h3>
                <p>You need more fruit variety to complete any recipes. Try adding different fruits to unlock delicious smoothie combinations!</p>
              </div>
            ) : (
              <>
                <div className="tab-header">
                  <p className="tab-description">
                    🌟 Great! You can make {readyRecipes.length} recipe{readyRecipes.length !== 1 ? 's' : ''} with your current fruits.
                  </p>
                </div>
                
                <div className="recipe-container">
                  {recipesToDisplay.map((recipe, index) => (
                    <div key={`ready-${recipe.name}-${index}`} className="recipe-card ready-card">
                      <div className="recipe-title">{recipe.name}</div>
                      
                      <div className="recipe-ingredients">
                        <div className="all-available">
                          <strong>🎉 All Available:</strong>{' '}
                          {recipe.ingredients.map(ing => 
                            `${inventory[ing].emoji} ${ing}`
                          ).join(', ')}
                        </div>
                      </div>
                      
                      <div className="recipe-instructions">
                        {recipe.instructions}
                      </div>
                      
                      <div className="recipe-badge ready-badge">
                        ✨ Make Now!
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'need' && (
          <div className="need-tab">
            {needIngredientsRecipes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎊</div>
                <h3>Amazing! You Can Make Everything!</h3>
                <p>You have all the ingredients needed for every recipe. Your fruit bowl is perfectly stocked!</p>
              </div>
            ) : (
              <>
                <div className="tab-header">
                  <p className="tab-description">
                    🛒 {needIngredientsRecipes.length} recipe{needIngredientsRecipes.length !== 1 ? 's' : ''} waiting for you to shop for missing ingredients.
                  </p>
                </div>
                
                <div className="recipe-container">
                  {recipesToDisplay.map((recipe, index) => (
                    <div key={`need-${recipe.name}-${index}`} className="recipe-card need-card">
                      <div className="recipe-title">{recipe.name}</div>
                      
                      <div className="recipe-ingredients">
                        {recipe.availableIngredients.length > 0 && (
                          <div className="available-ingredients">
                            <strong>✅ You Have:</strong>{' '}
                            {recipe.availableIngredients.map(ing => 
                              `${inventory[ing].emoji} ${ing}`
                            ).join(', ')}
                          </div>
                        )}
                        
                        <div className="missing-ingredients">
                          <strong>🛒 Need to Buy:</strong> {recipe.missingIngredients.join(', ')}
                        </div>
                        
                        <div className="shopping-progress">
                          <span className="progress-text">
                            Progress: {recipe.availableIngredients.length}/{recipe.ingredients.length} ingredients
                          </span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ 
                                width: `${(recipe.availableIngredients.length / recipe.ingredients.length) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="recipe-instructions">
                        {recipe.instructions}
                      </div>
                      
                      <div className="recipe-badge need-badge">
                        🛒 Shop for {recipe.missingIngredients.length} more
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Export Shopping List Button */}
                <div className="export-section">
                  <button 
                    className="btn btn-primary full-width export-btn" 
                    onClick={exportRecipeShoppingList}
                  >
                    📱 Export Recipe Shopping List
                  </button>
                  <p className="export-description">
                    Get a detailed shopping list with all missing ingredients, quantities, and recipe details to take with you to the store!
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Generate Button */}
        {recipesToDisplay.length > 0 && (
          <button 
            className="btn btn-secondary full-width" 
            onClick={generateRecipes}
            disabled={
              (activeTab === 'ready' && readyRecipes.length <= 1) ||
              (activeTab === 'need' && needIngredientsRecipes.length <= 1)
            }
          >
            🔄 Show Different Recipes
          </button>
        )}
      </div>
    </div>
  );
}

export default RecipeSection;