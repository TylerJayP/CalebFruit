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
        converted_model: {
          modelUrl: "./tfjs_best_model/model.json",
          inputShape: [150, 150, 3],
          imageSize: 150,
          name: "Kaggle Fruit Recognition"
        }
      },
      defaultModel: "converted_model",
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
const AUTO_DETECTION_INTERVAL = 2000; // 2 seconds for auto-detection scanning

function App() {
  // State management
  const [inventory, setInventory] = useState({}); // Total inventory (cumulative)
  const [model, setModel] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [currentModelKey, setCurrentModelKey] = useState('converted_model');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [autoDetectionActive, setAutoDetectionActive] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState({
    message: 'Camera not started',
    type: ''
  });

  // Initialize inventory for a specific fruit class
  const initializeInventory = useCallback((fruitClasses) => {
    const inventory = {};
    
    fruitClasses.forEach(fruit => {
      inventory[fruit.toLowerCase()] = {
        count: 0,
        threshold: 2,
        emoji: FRUIT_EMOJIS[fruit.toLowerCase()] || '🍎'
      };
    });
    
    console.log('🔧 Inventory initialized with fruit classes:', fruitClasses);
    return inventory;
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  }, []);

  // Adjust fruit count manually (Developer Mode) - ENHANCED for ADD/REMOVE buttons
  const adjustFruitCount = useCallback((fruit, change) => {
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[fruit]) {
        const newCount = Math.max(0, updated[fruit].count + change);
        updated[fruit].count = newCount;
        console.log(`🔧 ${fruit} count adjusted to ${newCount} (${change > 0 ? '+' : ''}${change})`);
      }
      return updated;
    });
  }, []);

  // Developer mode helpers
  const resetAllInventory = useCallback(() => {
    setInventory(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(fruit => {
        updated[fruit].count = 0;
      });
      console.log('🔧 DEV: All inventory reset to 0');
      return updated;
    });
  }, []);

  const setDemoInventory = useCallback(() => {
    setInventory(prev => {
      const updated = { ...prev };
      const demoData = {
        apple: 3, banana: 2, orange: 4, mango: 1, kiwi: 5,
        pear: 2, peach: 3, plum: 1, guava: 2
      };
      
      Object.entries(demoData).forEach(([fruit, count]) => {
        if (updated[fruit]) {
          updated[fruit].count = count;
        }
      });
      
      console.log('🔧 DEV: Demo inventory loaded');
      return updated;
    });
  }, []);

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

  // Load TensorFlow model with better error handling
  const loadModel = useCallback(async (modelKey = currentModelKey) => {
    if (isModelLoading) return;
    
    setIsModelLoading(true);
    
    try {
      console.log(`🤖 Loading AI model: ${modelKey}`);
      
      if (modelKey === 'demo') {
        // Demo simulation mode
        const demoModel = {
          predict: (tensor) => {
            // Simulate prediction returning TensorFlow-like object
            const mockData = () => new Array(15).fill(0).map(() => Math.random());
            return {
              data: () => Promise.resolve(mockData()),
              dataSync: () => mockData(),
              dispose: () => {}
            };
          },
          isSimulation: true,
          name: 'Demo Simulation Mode',
          inputShape: [150, 150, 3],
          imageSize: 150
        };
        
        setModel(demoModel);
        
        setDetectionStatus({
          message: '🎭 Demo mode active (simulation)',
          type: 'active'
        });
        
        console.log('✅ Demo mode activated');
        return;
      }

      const modelInfo = modelConfig.models[modelKey];
      if (!modelInfo) {
        throw new Error(`Model ${modelKey} not found in config`);
      }

      console.log(`🔧 Loading model from: ${modelInfo.modelUrl}`);
      console.log(`🔧 Expected input shape: ${modelInfo.inputShape}`);
      
      const loadedModel = await tf.loadLayersModel(modelInfo.modelUrl);
      
      console.log('🔧 Loaded model object:', loadedModel);
      console.log('🔧 Model predict method:', typeof loadedModel.predict);
      
      // Attach model metadata
      loadedModel.inputShape = modelInfo.inputShape;
      loadedModel.imageSize = modelInfo.imageSize;
      loadedModel.name = modelInfo.name;
      loadedModel.isSimulation = false;
      
      setModel(loadedModel);
      
      setDetectionStatus({
        message: `🤖 AI Model loaded: ${modelInfo.name}`,
        type: 'active'
      });
      
      console.log(`✅ Model ${modelKey} loaded successfully!`);
      
    } catch (error) {
      console.error(`❌ Error loading model ${modelKey}:`, error);
      
      setDetectionStatus({
        message: `❌ Model loading failed: ${error.message}`,
        type: 'error'
      });
      
      // Fallback to demo mode
      console.log('🎭 Falling back to demo mode');
      await loadModel('demo');
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelLoading, currentModelKey, modelConfig]);

  // Preprocess image for AI model
  const preprocessImage = useCallback((canvas) => {
    if (!model) return null;
    
    try {
      const imageSize = model.imageSize || 150;
      
      // Create tensor from canvas
      const tensor = tf.browser.fromPixels(canvas)
        .resizeNearestNeighbor([imageSize, imageSize])
        .toFloat()
        .div(255.0)
        .expandDims(0);
      
      console.log('🔧 Preprocessed image tensor shape:', tensor.shape);
      return tensor;
    } catch (error) {
      console.error('❌ Error preprocessing image:', error);
      return null;
    }
  }, [model]);

  // Process AI prediction results
  const processPrediction = useCallback((prediction) => {
    if (!modelConfig || !modelConfig.classes || !prediction || prediction.length === 0) {
      console.warn('Invalid prediction data or missing model config');
      return { fruit: 'unknown', confidence: 0 };
    }
    
    const classes = modelConfig.classes;
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const confidence = prediction[maxIndex] || 0;
    const fruit = classes[maxIndex];
    
    // Safety check: ensure we have a valid fruit name
    if (!fruit || typeof fruit !== 'string') {
      console.warn('Invalid fruit detected:', { fruit, maxIndex, classesLength: classes.length, predictionLength: prediction.length });
      return { fruit: 'unknown', confidence: 0 };
    }
    
    console.log('🔧 Processing prediction:', { fruit, confidence, maxIndex, classesLength: classes.length });
    
    return {
      fruit: fruit.toLowerCase(),
      confidence: confidence,
      class: fruit,
      allPredictions: prediction
    };
  }, [modelConfig]);

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

  // Switch to demo mode manually
  const switchToDemoMode = useCallback(async () => {
    console.log('🎭 Manually switching to demo mode');
    setCurrentModelKey('demo');
    await loadModel('demo');
  }, [loadModel]);

  // Switch back to real model
  const switchToRealModel = useCallback(async () => {
    console.log('🤖 Switching back to real model');
    const realModelKey = modelConfig?.defaultModel || 'converted_model';
    setCurrentModelKey(realModelKey);
    await loadModel(realModelKey);
  }, [loadModel, modelConfig]);

  // Initialize application
  useEffect(() => {
    console.log('🍎 Initializing Smart Fruit Detector App...');
    
    const init = async () => {
      const config = await loadModelConfig();
      setModelConfig(config);
      
      console.log('🔧 Model config loaded:', config);
      console.log('🔧 Available fruit classes:', config.classes);
      
      const fruitClasses = config.classes || [];
      const initialInventory = initializeInventory(fruitClasses);
      setInventory(initialInventory);
      
      const defaultModel = config.defaultModel || 'converted_model';
      setCurrentModelKey(defaultModel);
      
      console.log('✅ Smart Fruit Detector App initialized successfully!');
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
      if (typeof tf !== 'undefined') {
        tf.disposeVariables();
      }
      console.log('🧹 Smart Fruit Detector cleanup completed');
    };
  }, []);

  // Get fruit classes for components
  const FRUIT_CLASSES = modelConfig?.classes?.map(c => c.toLowerCase()) || [];

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <div className="container">
        <div className="header">
          <h1>Smart Fruit Detector</h1>
          <p>AI-Powered Fruit Detection with Manual Inventory Control</p>
          
          {/* Status Indicators Row */}
          <div className="status-row">
            {/* Model Status */}
            <div className="model-status-indicator">
              <span className={`model-status-badge ${model?.isSimulation ? 'demo' : 'real'}`}>
                {model?.isSimulation ? '🎭 Demo Mode' : model ? '🤖 AI Model' : '⏳ Loading...'}
              </span>
              {model && (
                <span className="model-name">{model.name}</span>
              )}
            </div>
            
            {/* Dark Mode Toggle */}
            <div className="theme-toggle">
              <button 
                className={`theme-toggle-btn ${darkMode ? 'active' : ''}`}
                onClick={toggleDarkMode}
                aria-label="Toggle dark mode"
              >
                <span className="theme-icon">{darkMode ? '☀️' : '🌙'}</span>
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
            
            {/* Developer Mode Toggle */}
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
        </div>

        {/* Developer Mode Panel */}
        {developerMode && (
          <div className="developer-panel">
            <div className="dev-section">
              <h3>🔧 Developer Controls</h3>
              <div className="dev-actions">
                <button className="dev-btn demo" onClick={setDemoInventory}>
                  Set Demo Inventory
                </button>
                <button className="dev-btn reset" onClick={resetAllInventory}>
                  Reset All to 0
                </button>
                <button className="dev-btn set-five" onClick={setAllFruitsToFive}>
                  Set All to 5
                </button>
                <button className="dev-btn switch-demo" onClick={switchToDemoMode}>
                  Switch to Demo Mode
                </button>
                <button className="dev-btn switch-real" onClick={switchToRealModel}>
                  Switch to Real Model
                </button>
              </div>
            </div>
            
            <div className="dev-inventory-controls">
              <h4>Manual Inventory Adjustment</h4>
              <div className="dev-fruit-grid">
                {FRUIT_CLASSES.map(fruit => {
                  const data = inventory[fruit];
                  if (!data) return null;
                  
                  return (
                    <div key={fruit} className="dev-fruit-item">
                      <span className="dev-fruit-emoji">{data.emoji}</span>
                      <span className="dev-fruit-name">{fruit}</span>
                      <span className="dev-fruit-count">{data.count}</span>
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
          {/* Camera Section with ADD/REMOVE functionality */}
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
            // Core detection functions
            preprocessImage={preprocessImage}
            processPrediction={processPrediction}
            // ADD/REMOVE functionality
            adjustFruitCount={adjustFruitCount}
            inventory={inventory}
            fruitEmojis={FRUIT_EMOJIS}
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