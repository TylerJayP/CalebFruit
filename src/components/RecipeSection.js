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
  }
];

function RecipeSection({ inventory }) {
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  
  // Calculate available fruits
  const availableFruits = useMemo(() => {
    return Object.entries(inventory)
      .filter(([fruit, data]) => data.count > 0)
      .map(([fruit]) => fruit);
  }, [inventory]);

  // Find recipes that can be made with available fruits
  const possibleRecipes = useMemo(() => {
    return smoothieRecipes.filter(recipe => 
      recipe.ingredients.some(ingredient => availableFruits.includes(ingredient))
    );
  }, [availableFruits]);

  // Generate new random recipes
  const generateRecipes = () => {
    if (possibleRecipes.length > 1) {
      let newIndex = currentRecipeIndex;
      while (newIndex === currentRecipeIndex) {
        newIndex = Math.floor(Math.random() * possibleRecipes.length);
      }
      setCurrentRecipeIndex(newIndex);
    }
  };

  // Get recipes to display (up to 3)
  const recipesToDisplay = useMemo(() => {
    if (possibleRecipes.length === 0) return [];
    
    const displayRecipes = [];
    for (let i = 0; i < Math.min(3, possibleRecipes.length); i++) {
      const index = (currentRecipeIndex + i) % possibleRecipes.length;
      displayRecipes.push(possibleRecipes[index]);
    }
    return displayRecipes;
  }, [possibleRecipes, currentRecipeIndex]);

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

  if (possibleRecipes.length === 0) {
    return (
      <div className="recipe-section">
        <h2 className="section-title">🥤 Smoothie Recipes</h2>
        <p className="empty-message">
          No recipes match your current fruit selection. Try adding more variety! 🍓
        </p>
      </div>
    );
  }

  return (
    <div className="recipe-section">
      <h2 className="section-title">🥤 Smoothie Recipes</h2>
      
      <div className="recipe-container">
        {recipesToDisplay.map((recipe, index) => {
          const availableIngredients = recipe.ingredients.filter(ing => 
            availableFruits.includes(ing)
          );
          const missingIngredients = recipe.ingredients.filter(ing => 
            !availableFruits.includes(ing)
          );
          const canMake = missingIngredients.length === 0;
          
          return (
            <div key={`${recipe.name}-${index}`} className="recipe-card">
              <div className="recipe-title">{recipe.name}</div>
              
              <div className="recipe-ingredients">
                <div className="available-ingredients">
                  <strong>Available:</strong>{' '}
                  {availableIngredients.length > 0 ? (
                    availableIngredients.map(ing => 
                      `${inventory[ing].emoji} ${ing}`
                    ).join(', ')
                  ) : (
                    'None'
                  )}
                </div>
                
                {missingIngredients.length > 0 ? (
                  <div className="missing-ingredients">
                    <strong>Need:</strong> {missingIngredients.join(', ')}
                  </div>
                ) : (
                  <div className="ready-to-make">
                    ✅ Ready to make!
                  </div>
                )}
              </div>
              
              <div className="recipe-instructions">
                {recipe.instructions}
              </div>
              
              {canMake && (
                <div className="recipe-badge">
                  🌟 Can Make Now!
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <button 
        className="btn btn-secondary full-width" 
        onClick={generateRecipes}
        disabled={possibleRecipes.length <= 1}
      >
        Generate New Recipes
      </button>
    </div>
  );
}

export default RecipeSection;