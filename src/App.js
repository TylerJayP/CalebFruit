import React, { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import './App.css';

import CameraSection from './components/CameraSection';
import InventorySection from './components/InventorySection';
import GrocerySection from './components/GrocerySection';
import RecipeSection from './components/RecipeSection';
import TrainingPage from './components/TrainingPage';

// Load model configuration
const loadModelConfig = async () => {
  try {
    const response = await fetch('/webapp_model_config.json');
    return await response.json();
  } catch (error) {
    console.warn('Could not load model config, using defaults');
    return {
      models: {
        trained_model: {
          modelUrl: "./models/model.json",
          inputShape: [64, 64, 3],
          imageSize: 64,
          name: "My Trained Fruit Model"
        },
        demo: {
          modelUrl: "demo",
          inputShape: [64, 64, 3],
          imageSize: 64,
          name: "Demo Simulation Mode"
        }
      },
      defaultModel: "trained_model",
      classes: ['apple', 'banana', 'orange', 'background']
    };
  }
};

// Fruit emoji mapping for UI display
const FRUIT_EMOJIS = {
  apple: '🍎', 
  banana: '🍌', 
  orange: '🍊',
  background: '🚫'  // For training only
};

// Detection settings
const AUTO_DETECTION_INTERVAL = 1000;

function App() {
  // Page navigation state
  const [currentView, setCurrentView] = useState('main');

  // Core state
  const [inventory, setInventory] = useState({});
  const [model, setModel] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [currentModelKey, setCurrentModelKey] = useState('trained_model');
  const [isModelLoading, setIsModelLoading] = useState(false);
  
  // UI state
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  
  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [autoDetectionActive, setAutoDetectionActive] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState({
    message: 'Click "Start Camera" to begin detecting fruits',
    type: 'info'
  });

  // === FRUIT CLASS DEFINITIONS ===
  // Get all classes from model/config (includes background for training)
  const ALL_CLASSES = model?.classes || modelConfig?.classes?.map(c => c.toLowerCase()) || ['apple', 'banana', 'orange', 'background'];

  // Separate lists for different purposes
  const TRAINING_CLASSES = ALL_CLASSES; // For training (includes background) 
  const INVENTORY_CLASSES = ALL_CLASSES.filter(fruit => fruit !== 'background'); // For inventory (no background)

  // Initialize inventory (only actual fruits, no background)
  const initializeInventory = useCallback((fruitClasses = []) => {
    // Only use actual fruits for inventory, not background
    const inventoryFruits = fruitClasses.filter(fruit => fruit !== 'background');
    const defaultFruits = inventoryFruits.length > 0 ? inventoryFruits : ['apple', 'banana', 'orange'];
    
    return defaultFruits.reduce((inventory, fruit) => {
      inventory[fruit] = {
        count: 0,
        threshold: 2,
        emoji: FRUIT_EMOJIS[fruit] || '🍎'
      };
      return inventory;
    }, {});
  }, []);

  // Dark mode toggle
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Inventory management (filtered to exclude background)
  const adjustFruitCount = useCallback((fruit, change) => {
    // Don't allow adjusting background "inventory"
    if (fruit === 'background') {
      console.log('🚫 Background is not an inventory item');
      return;
    }
    
    setInventory(prev => {
      const updated = { ...prev };
      const fruitKey = fruit.toLowerCase();
      if (updated[fruitKey]) {
        const newCount = Math.max(0, updated[fruitKey].count + change);
        updated[fruitKey].count = newCount;
        console.log(`🔧 ${fruit} count adjusted to ${newCount}`);
      } else {
        console.warn(`⚠️ Fruit '${fruit}' not found in inventory. Available fruits:`, Object.keys(updated));
      }
      return updated;
    });
  }, []);

  const updateThreshold = useCallback((fruit, value) => {
    setInventory(prev => ({
      ...prev,
      [fruit]: {
        ...prev[fruit],
        threshold: parseInt(value) || 0
      }
    }));
  }, []);

  // Model loading
  const loadModel = useCallback(async (modelKey = currentModelKey) => {
    if (isModelLoading) return;
    
    setIsModelLoading(true);
    
    try {
      console.log(`🤖 Loading AI model: ${modelKey}`);
      
      if (modelKey === 'demo') {
        const demoModel = {
          predict: (tensor) => {
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
      
      const loadedModel = await tf.loadLayersModel(modelInfo.modelUrl);
      
      loadedModel.name = modelInfo.name;
      loadedModel.inputShape = modelInfo.inputShape;
      loadedModel.imageSize = modelInfo.imageSize;
      loadedModel.isSimulation = false;
      
      if (!loadedModel.predict || typeof loadedModel.predict !== 'function') {
        throw new Error('Loaded model does not have a valid predict method');
      }
      
      console.log('🔍 Model loaded - predict method type:', typeof loadedModel.predict);
      
      setModel(loadedModel);
      
      setDetectionStatus({
        message: `🤖 AI model loaded: ${modelInfo.name}`,
        type: 'active'
      });
      
      console.log('✅ Model loaded successfully:', modelInfo.name);
      
    } catch (error) {
      console.error('❌ Error loading model:', error);
      setDetectionStatus({
        message: `❌ Error loading model: ${error.message}`,
        type: 'error'
      });
      
      console.log('🎭 Falling back to demo mode...');
      await loadModel('demo');
    } finally {
      setIsModelLoading(false);
    }
  }, [currentModelKey, modelConfig]);

  // Image processing functions
  const preprocessImage = useCallback((canvas) => {
    try {
      const imageSize = model?.imageSize || 150;
      console.log(`🖼️ Preprocessing image to ${imageSize}x${imageSize} for model: ${model?.name}`);
      
      return tf.browser.fromPixels(canvas)
        .resizeNearestNeighbor([imageSize, imageSize])
        .div(255.0)
        .expandDims(0);
    } catch (error) {
      console.error('Error preprocessing image:', error);
      return null;
    }
  }, [model]);

  const processPrediction = useCallback((prediction) => {
    const classes = model?.classes || modelConfig?.classes || ['apple', 'banana', 'orange', 'background'];
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const maxConfidence = prediction[maxIndex];
    const predictedClass = classes[maxIndex];
    
    console.log(`🎯 Processing prediction for classes: [${classes.join(', ')}]`);
    console.log(`🎯 Prediction values:`, prediction.slice(0, classes.length).map((p, i) => 
      `${classes[i]}: ${(p * 100).toFixed(1)}%`
    ));
    
    // If background is predicted with high confidence, return no fruit detected
    if (predictedClass === 'background' && maxConfidence > 0.5) {
      console.log(`🚫 Background detected with ${(maxConfidence * 100).toFixed(1)}% confidence`);
      return {
        fruit: 'background',
        confidence: maxConfidence,
        allPredictions: prediction,
        message: 'No fruit detected'
      };
    }
    
    // For fruit predictions, require higher confidence
    const FRUIT_CONFIDENCE_THRESHOLD = 0.6;
    
    if (predictedClass !== 'background' && maxConfidence < FRUIT_CONFIDENCE_THRESHOLD) {
      console.log(`🤔 Low confidence fruit prediction: ${predictedClass} at ${(maxConfidence * 100).toFixed(1)}%`);
      return {
        fruit: 'unknown',
        confidence: maxConfidence,
        allPredictions: prediction,
        message: 'Object detected but not recognized as fruit'
      };
    }
    
    // Valid fruit detection
    return {
      fruit: predictedClass === 'background' ? 'unknown' : predictedClass,
      confidence: maxConfidence,
      allPredictions: prediction,
      message: predictedClass === 'background' ? 'No fruit detected' : 'Fruit detected'
    };
  }, [model, modelConfig]);

  // Initialize app
  useEffect(() => {
    console.log('🍎 Initializing Smart Bowl/Tray React App...');
    
    const init = async () => {
      const config = await loadModelConfig();
      setModelConfig(config);
      
      const fruitClasses = config.classes || [];
      const initialInventory = initializeInventory(fruitClasses);
      setInventory(initialInventory);
      
      const defaultModel = config.defaultModel || 'trained_model';
      setCurrentModelKey(defaultModel);
      
      console.log('✅ Smart Bowl/Tray React App initialized successfully!');
    };
    
    init();
  }, [initializeInventory]);

  // Load model when config is ready
  useEffect(() => {
    if (modelConfig && !model && !isModelLoading) {
      loadModel();
    }
  }, [modelConfig, model, isModelLoading, loadModel]);

  // Dark mode persistence
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof tf !== 'undefined') {
        tf.disposeVariables();
      }
      console.log('🧹 React app cleanup completed');
    };
  }, []);

  // Training mode page
  if (currentView === 'training') {
    return (
      <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
        <div className="container">
          <div className="header">
            <h1>🧠 AI Training Lab</h1>
            <p>Train Your Custom Fruit Detection Model</p>
            
            <div className="status-row">
              <button 
                className="theme-toggle-btn"
                onClick={() => setCurrentView('main')}
              >
                ← Back to Smart Bowl
              </button>
            </div>
          </div>
          
          <TrainingPage 
            modelConfig={modelConfig}
            FRUIT_CLASSES={TRAINING_CLASSES}  // Includes background for training
            FRUIT_EMOJIS={FRUIT_EMOJIS}
            onModelTrained={(trainedModel, classes) => {
              console.log('Custom model trained successfully!');
              setDetectionStatus({
                message: '🎉 Custom model trained! Return to Smart Bowl to test it.',
                type: 'success'
              });
            }}
          />
        </div>
      </div>
    );
  }

  // Main app page
  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <div className="container">
        <div className="header">
          <h1>Smart Bowl/Tray</h1>
          <p>AI-Powered Fruit Detection System</p>
          
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
            
            {/* Training Mode Button */}
            <div className="training-toggle">
              <button 
                className="training-toggle-btn"
                onClick={() => setCurrentView('training')}
              >
                <span className="training-icon">🧠</span>
                Training Mode
              </button>
            </div>
          </div>
        </div>

        {/* Detection Status */}
        <div className={`detection-status ${detectionStatus.type}`}>
          {detectionStatus.message}
        </div>

        {/* Main content grid */}
        <div className="main-grid">
          <CameraSection
            cameraActive={cameraActive}
            setCameraActive={setCameraActive}
            autoDetectionActive={autoDetectionActive}
            setAutoDetectionActive={setAutoDetectionActive}
            detectionStatus={detectionStatus}
            setDetectionStatus={setDetectionStatus}
            model={model}
            modelConfig={modelConfig}
            autoDetectionInterval={AUTO_DETECTION_INTERVAL}
            preprocessImage={preprocessImage}
            processPrediction={processPrediction}
            adjustFruitCount={adjustFruitCount}
            inventory={inventory}
            fruitEmojis={FRUIT_EMOJIS}
          />

          <InventorySection
            inventory={inventory}
            FRUIT_CLASSES={INVENTORY_CLASSES}  // No background in inventory
            updateThreshold={updateThreshold}
          />
        </div>

        {/* Bottom content grid */}
        <div className="bottom-grid">
          <GrocerySection inventory={inventory} />
          <RecipeSection inventory={inventory} />
        </div>
      </div>
    </div>
  );
}

export default App;