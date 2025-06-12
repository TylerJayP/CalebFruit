import React, { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import './App.css';

import CameraSection from './components/CameraSection';
import InventorySection from './components/InventorySection';
import GrocerySection from './components/GrocerySection';
import RecipeSection from './components/RecipeSection';

// Load model configuration
const loadModelConfig = async () => {
  try {
    const response = await fetch('/webapp_model_config.json');
    return await response.json();
  } catch (error) {
    console.warn('Could not load model config, using defaults');
    return {
      models: {
        better_model: {
          modelUrl: "./better_model/model.json",
          inputShape: [224, 224, 3],
          imageSize: 224,
          name: "Better Fruit Classification Model"
        }
      },
      defaultModel: "better_model",
      classes: [
        'apple', 'banana', 'carambola', 'guava', 'kiwi', 
        'mango', 'muskmelon', 'orange', 'peach', 'pear', 
        'persimmon', 'pitaya', 'plum', 'pomegranate', 'tomato'
      ]
    };
  }
};

// Fruit emoji mapping for UI display
const FRUIT_EMOJIS = {
  apple: '🍎', banana: '🍌', carambola: '⭐', guava: '🟢', kiwi: '🥝',
  mango: '🥭', muskmelon: '🍈', orange: '🍊', peach: '🍑', pear: '🍐',
  persimmon: '🟠', pitaya: '🐉', plum: '🟣', pomegranate: '🔴', tomato: '🍅'
};

// Detection settings
const DETECTION_THRESHOLD = 0.75;
const AUTO_DETECTION_INTERVAL = 4000; // 4 seconds

function App() {
  // State management - CLEANED (removed debounce refs)
  const [inventory, setInventory] = useState({});
  const [model, setModel] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [currentModelKey, setCurrentModelKey] = useState('better_model');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState({
    message: 'Initializing Smart Fruit Bowl...',
    type: 'loading'
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [autoDetectionActive, setAutoDetectionActive] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState([]);

  // Initialize inventory
  const initializeInventory = useCallback((fruitClasses) => {
    const initialInventory = {};
    fruitClasses.forEach(fruit => {
      const fruitKey = fruit.toLowerCase();
      initialInventory[fruitKey] = {
        count: 0,
        emoji: FRUIT_EMOJIS[fruitKey] || '🍎',
        threshold: 2 // Default threshold
      };
    });
    
    // Set some initial inventory for demo
    if (initialInventory.apple) initialInventory.apple.count = 5;
    if (initialInventory.banana) initialInventory.banana.count = 8;
    if (initialInventory.orange) initialInventory.orange.count = 3;
    if (initialInventory.mango) initialInventory.mango.count = 2;
    if (initialInventory.pear) initialInventory.pear.count = 2;
    if (initialInventory.tomato) initialInventory.tomato.count = 4;
    
    return initialInventory;
  }, []);

  const adjustFruitCount = useCallback((fruit, change) => {
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[fruit]) {
        const newCount = Math.max(0, updated[fruit].count + change);
        updated[fruit].count = newCount;
        console.log(`🔧 DEV: ${fruit} count changed to ${newCount}`);
      }
      return updated;
    });
  }, []);

    const resetInventory = useCallback(() => {
    setInventory(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(fruit => {
        updated[fruit].count = 0;
      });
      console.log('🔧 DEV: All inventory reset to 0');
      return updated;
    });
  }, []);

  // ADD THIS: Set demo inventory for testing
  const setDemoInventory = useCallback(() => {
    setInventory(prev => {
      const updated = { ...prev };
      // Set some fruits to test recipes
      if (updated.apple) updated.apple.count = 3;
      if (updated.banana) updated.banana.count = 2;
      if (updated.orange) updated.orange.count = 4;
      if (updated.mango) updated.mango.count = 1;
      if (updated.kiwi) updated.kiwi.count = 2;
      console.log('🔧 DEV: Demo inventory set');
      return updated;
    });
  }, []);

  // Load AI model
  const loadModel = useCallback(async (modelKey = currentModelKey) => {
    if (isModelLoading) return;
    
    setIsModelLoading(true);
    setDetectionStatus({
      message: 'Loading AI model...',
      type: 'loading'
    });
    
    try {
      let loadedModel = null;
      
      if (modelConfig?.models?.[modelKey]) {
        const modelInfo = modelConfig.models[modelKey];
        console.log(`🤖 Loading model: ${modelInfo.name}`);
        
        try {
          loadedModel = await tf.loadLayersModel(modelInfo.modelUrl);
          loadedModel.isSimulation = false;
          console.log('✅ Real AI model loaded successfully!');
        } catch (modelError) {
          console.warn('⚠️ Failed to load real model, using simulation:', modelError);
          loadedModel = {
            predict: () => ({
              data: () => Promise.resolve(Array.from({length: modelConfig.classes.length}, () => Math.random()))
            }),
            isSimulation: true
          };
        }
      } else {
        // Fallback simulation model
        loadedModel = {
          predict: () => ({
            data: () => Promise.resolve(Array.from({length: 15}, () => Math.random()))
          }),
          isSimulation: true
        };
      }
      
      setModel(loadedModel);
      
      setDetectionStatus({
        message: loadedModel.isSimulation ? 
          'Demo mode active (simulation)' : 
          'Running Best Model',
        type: 'active'
      });
      
    } catch (error) {
      console.error('❌ Model loading failed:', error);
      setDetectionStatus({
        message: '❌ Model loading failed',
        type: 'error'
      });
    } finally {
      setIsModelLoading(false);
    }
  }, [currentModelKey, modelConfig, isModelLoading]);

  // Preprocess image for AI model
  const preprocessImage = useCallback((canvas) => {
    if (!modelConfig || !modelConfig.models || !modelConfig.models[currentModelKey]) return null;

    const imageSize = modelConfig.models[currentModelKey].imageSize || 224;

    return tf.tidy(() => {
      let tensor = tf.browser.fromPixels(canvas);
      
      // Resize to model's expected input size
      tensor = tf.image.resizeBilinear(tensor, [imageSize, imageSize]);
      
      // Normalize pixel values to [0, 1] range
      tensor = tensor.div(255.0);
      
      // Add batch dimension [1, imageSize, imageSize, 3]
      tensor = tensor.expandDims(0);
      
      return tensor;
    });
  }, [modelConfig, currentModelKey]);

  // Process model prediction and return structured result
  const processPrediction = useCallback((prediction) => {
    const fruitClasses = modelConfig?.classes?.map(c => c.toLowerCase()) || [];
    
    // Find the class with highest confidence
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const confidence = prediction[maxIndex];
    const fruit = fruitClasses[maxIndex];
    
    // Store prediction in history for stability
    setDetectionHistory(prev => {
      const newHistory = [...prev, {
        fruit: fruit,
        confidence: confidence,
        timestamp: Date.now()
      }];
      
      // Keep only recent history (last 3 detections)
      return newHistory.slice(-3);
    });
    
    return {
      fruit: fruit,
      confidence: confidence,
      allProbabilities: Array.from(prediction).map((prob, index) => ({
        class: fruitClasses[index],
        probability: prob
      }))
    };
  }, [modelConfig]);

  // Determine if fruit is being added or removed
  const determineInventoryChange = useCallback((detectedFruit) => {
    // Simple heuristic: if we have recent detections of the same fruit,
    // assume it's being added. Otherwise, random chance.
    const recentSameFruit = detectionHistory.filter(
      detection => detection.fruit === detectedFruit && 
      Date.now() - detection.timestamp < 10000 // Within last 10 seconds
    ).length;
    
    if (recentSameFruit >= 2) {
      return 'added'; // Consistent detections suggest addition
    } else {
      // Random determination for demo (in production, use computer vision techniques)
      return Math.random() > 0.3 ? 'added' : 'removed';
    }
  }, [detectionHistory]);

  // CLEANED UP: Simple inventory update with no debouncing
  const updateInventoryFromDetection = useCallback((fruit, action) => {
    setInventory(prev => {
      const updated = { ...prev };
      
      if (action === 'added' && updated[fruit]) {
        updated[fruit].count++;
      } else if (action === 'removed' && updated[fruit] && updated[fruit].count > 0) {
        updated[fruit].count--;
      }
      
      console.log(`📊 Inventory updated: ${fruit} ${action} (new count: ${updated[fruit]?.count || 0})`);
      return updated;
    });
  }, []);

  // Update threshold for specific fruit
  const updateThreshold = useCallback((fruit, value) => {
    setInventory(prev => ({
      ...prev,
      [fruit]: {
        ...prev[fruit],
        threshold: parseInt(value) || 0
      }
    }));
  }, []);

  // Switch between models
  const switchModel = useCallback(async (modelKey) => {
    if (modelKey === currentModelKey) return;
    
    console.log(`Switching to model: ${modelKey}`);
    await loadModel(modelKey);
  }, [currentModelKey, loadModel]);

  const setAllFruitsToFive = useCallback(() => {
  setInventory(prev => {
    const updated = { ...prev };
    Object.keys(updated).forEach(fruit => {
      updated[fruit].count = 5;
    });
    console.log('🔧 DEV: All fruits set to 5');
    return updated;
  });
  }, []);
  
  // Initialize application
  useEffect(() => {
    console.log('🍎 Initializing Smart Fruit Bowl React App...');
    
    const init = async () => {
      // Load model configuration
      const config = await loadModelConfig();
      setModelConfig(config);
      
      // Initialize inventory with fruit classes from config
      const fruitClasses = config.classes || [];
      const initialInventory = initializeInventory(fruitClasses);
      setInventory(initialInventory);
      
      // Load AI model
      const defaultModel = config.defaultModel || 'better_model';
      setCurrentModelKey(defaultModel);
      
      console.log('✅ Smart Fruit Bowl React App initialized successfully!');
    };
    
    init();
  }, [initializeInventory]);

  // Load model when config is ready
  useEffect(() => {
    if (modelConfig && !model && !isModelLoading) {
      loadModel();
    }
  }, [modelConfig, model, isModelLoading, loadModel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup TensorFlow tensors
      if (typeof tf !== 'undefined') {
        tf.disposeVariables();
      }
      console.log('🧹 React app cleanup completed');
    };
  }, []);

  // Get fruit classes for components
  const FRUIT_CLASSES = modelConfig?.classes?.map(c => c.toLowerCase()) || [];

   return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>Smart Fruit Bowl</h1>
          <p>AI-Powered Inventory Management System</p>
          
          {/* Status Indicators Row */}
          <div className="status-row">            
            {/* ADD THIS: Developer Mode Toggle */}
            <div className="developer-toggle">
              <button 
                className={`dev-toggle-btn ${developerMode ? 'active' : ''}`}
                onClick={() => setDeveloperMode(!developerMode)}
              >
                <span className="dev-icon">🔧</span>
                Developer Mode: {developerMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          
          {/* Model Selector */}
          {modelConfig && Object.keys(modelConfig.models).length > 1 && (
            <div className="model-selector">
              <label>AI Model: </label>
              <select 
                value={currentModelKey} 
                onChange={(e) => switchModel(e.target.value)}
                disabled={isModelLoading}
              >
                {Object.entries(modelConfig.models).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Developer Panel - UPDATED WITH NEW BUTTON */}
{developerMode && (
  <div className="developer-panel">
    <div className="dev-panel-header">
      <h3>🔧 Developer Controls</h3>
      <p>Manually adjust fruit inventory for testing recipes and features</p>
    </div>
    
    <div className="dev-controls">
      <div className="dev-quick-actions">
        <button className="dev-btn demo-btn" onClick={setDemoInventory}>
          🎯 Set Demo Inventory
        </button>
        <button className="dev-btn set-five-btn" onClick={setAllFruitsToFive}>
          🍎 Set All Fruits to 5
        </button>
        <button className="dev-btn reset-btn" onClick={resetInventory}>
          🗑️ Reset All to 0
        </button>
      </div>
      
      <div className="dev-fruit-controls">
        {FRUIT_CLASSES.map(fruit => {
          const data = inventory[fruit];
          if (!data) return null;
          
          return (
            <div key={fruit} className="dev-fruit-item">
              <div className="dev-fruit-info">
                <span className="dev-fruit-emoji">{data.emoji}</span>
                <span className="dev-fruit-name">
                  {fruit.charAt(0).toUpperCase() + fruit.slice(1)}
                </span>
                <span className="dev-fruit-count">{data.count}</span>
              </div>
              <div className="dev-fruit-buttons">
                <button 
                  className="dev-adjust-btn minus"
                  onClick={() => adjustFruitCount(fruit, -1)}
                  disabled={data.count <= 0}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    visibility: 'visible'
                  }}
                >
                  -
                </button>
                <button 
                  className="dev-adjust-btn plus"
                  onClick={() => adjustFruitCount(fruit, 1)}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    visibility: 'visible'
                  }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
)}

        <div className="main-grid">
          <CameraSection
            cameraActive={cameraActive}
            setCameraActive={setCameraActive}
            autoDetectionActive={autoDetectionActive}
            setAutoDetectionActive={setAutoDetectionActive}
            detectionStatus={detectionStatus}
            setDetectionStatus={setDetectionStatus}
            model={model}
            autoDetectionInterval={AUTO_DETECTION_INTERVAL}
            modelConfig={modelConfig}
            // Pass processing functions directly to CameraSection
            determineInventoryChange={determineInventoryChange}
            updateInventoryFromDetection={updateInventoryFromDetection}
            preprocessImage={preprocessImage}
            processPrediction={processPrediction}
          />
          
          <InventorySection
            inventory={inventory}
            FRUIT_CLASSES={FRUIT_CLASSES}
            updateThreshold={updateThreshold}
          />
        </div>

        <div className="bottom-grid">
          <GrocerySection inventory={inventory} />
          <RecipeSection inventory={inventory} />
        </div>
      </div>
    </div>
  );
}

export default App;