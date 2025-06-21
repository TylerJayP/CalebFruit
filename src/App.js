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
          modelUrl: "./public/models/model.json",
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
      classes: [
        'apple', 'banana', 'orange'
      ]
    };
  }
};

// Fruit emoji mapping for UI display
const FRUIT_EMOJIS = {
  apple: '🍎', banana: '🍌', orange: '🍊'
};

// Detection settings
const DETECTION_THRESHOLD = 0.75;
const BOWL_DETECTION_THRESHOLD = 0.7;
const EMPTY_SCENE_THRESHOLD = 0.5;
const AUTO_DETECTION_INTERVAL = 1000;

function App() {
  // Page mode state - 'main' or 'training'
 const [currentView, setCurrentView] = useState('main');

  // State management (your original state)
  const [inventory, setInventory] = useState({});
  const [bowlContents, setBowlContents] = useState({});
  const [model, setModel] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [currentModelKey, setCurrentModelKey] = useState('custom_training');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [detectionStatus, setDetectionStatus] = useState({
    message: 'Click "Start Camera" to begin detecting fruits',
    type: 'info'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [persistentTracking, setPersistentTracking] = useState(true);
  const [bowlHistory, setBowlHistory] = useState([]);
  const [detectionHistory, setDetectionHistory] = useState([]);

  // Your original initialization function
  const initializeInventory = useCallback((fruitClasses = []) => {
    const defaultFruits = fruitClasses.length > 0 ? fruitClasses : [
      'apple', 'banana', 'orange'
    ];
    
    return defaultFruits.reduce((inventory, fruit) => {
      inventory[fruit] = {
        count: 0,
        threshold: 2,
        emoji: FRUIT_EMOJIS[fruit] || '🍎'
      };
      return inventory;
    }, {});
  }, []);

  // Your original dark mode toggle
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Your original inventory management functions
  const updateInventory = useCallback((fruit, change) => {
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[fruit]) {
        updated[fruit].count = Math.max(0, updated[fruit].count + change);
      }
      return updated;
    });
  }, []);

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

 // Fixed model loading function for App.js
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
    
    // Load the TensorFlow.js model
    const loadedModel = await tf.loadLayersModel(modelInfo.modelUrl);
    
    // ✅ FIX: Don't use spread operator - directly add properties to preserve methods
    loadedModel.name = modelInfo.name;
    loadedModel.inputShape = modelInfo.inputShape;
    loadedModel.imageSize = modelInfo.imageSize;
    loadedModel.isSimulation = false;
    
    // ✅ Verify the predict method exists
    if (!loadedModel.predict || typeof loadedModel.predict !== 'function') {
      throw new Error('Loaded model does not have a valid predict method');
    }
    
    console.log('🔍 Model loaded - predict method type:', typeof loadedModel.predict);
    console.log('🔍 Model methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(loadedModel)));
    
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

  // Your original preprocessing and prediction functions
  const preprocessImage = useCallback((canvas) => {
    try {
      // Use the model's expected image size
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
    // Use model's classes if available, otherwise fallback to config
    const classes = model?.classes || modelConfig?.classes || ['apple', 'banana', 'orange'];
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    
    console.log(`🎯 Processing prediction for classes: [${classes.join(', ')}]`);
    console.log(`🎯 Prediction values:`, prediction.slice(0, classes.length));
    
    return {
      fruit: classes[maxIndex] || 'apple',
      confidence: prediction[maxIndex] || 0,
      allPredictions: prediction
    };
  }, [model, modelConfig]);

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

  const updateThreshold = useCallback((fruit, value) => {
    setInventory(prev => ({
      ...prev,
      [fruit]: {
        ...prev[fruit],
        threshold: parseInt(value) || 0
      }
    }));
  }, []);

  const determineInventoryChange = useCallback((detectedFruit) => {
    const recentSameFruit = detectionHistory.filter(
      detection => detection.fruit === detectedFruit && 
      Date.now() - detection.timestamp < 10000
    ).length;
    
    if (recentSameFruit >= 2) {
      return 'added';
    } else {
      return Math.random() > 0.3 ? 'added' : 'removed';
    }
  }, [detectionHistory]);

  // Your original initialization effect
  useEffect(() => {
    console.log('🍎 Initializing Smart Bowl/Tray React App...');
    
    const init = async () => {
      const config = await loadModelConfig();
      setModelConfig(config);
      
      const fruitClasses = config.classes || [];
      const initialInventory = initializeInventory(fruitClasses);
      setInventory(initialInventory);
      
      const defaultModel = config.defaultModel || 'custom_training';
      setCurrentModelKey(defaultModel);
      
      console.log('✅ Smart Bowl/Tray React App initialized successfully!');
    };
    
    init();
  }, [initializeInventory]);

  // Your original model loading effect
  useEffect(() => {
    if (modelConfig && !model && !isModelLoading) {
      loadModel();
    }
  }, [modelConfig, model, isModelLoading, loadModel]);

  // Your original cleanup effect
  useEffect(() => {
    return () => {
      if (typeof tf !== 'undefined') {
        tf.disposeVariables();
      }
      console.log('🧹 React app cleanup completed');
    };
  }, []);

  // Your original dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : '';
  }, [darkMode]);

  // Get fruit classes for components
  const FRUIT_CLASSES = model?.classes || modelConfig?.classes?.map(c => c.toLowerCase()) || ['apple', 'banana', 'orange'];

  const toggleTrainingMode = () => {
    setCurrentView(currentView === 'training' ? 'main' : 'training');
  };

  // Page navigation
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

  // Your original main app layout
  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <div className="container">
        <div className="header">
          <h1>Smart Bowl/Tray</h1>
          <p>AI-Powered Bowl Tracking System</p>
          
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
            
            {/* Training Mode Button */}
            <div className="training-toggle">
              <button 
                className="training-toggle-btn"
                onClick={toggleTrainingMode}
              >
                <span className="training-icon">🧠</span>
                Training Mode
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

        {/* Detection Status */}
        <div className={`detection-status ${detectionStatus.type}`}>
          {detectionStatus.message}
        </div>

        {/* Your original main grid layout */}
        <div className="main-grid">
          <CameraSection
            cameraActive={cameraActive}
            setCameraActive={setCameraActive}
            model={model}
            setModel={setModel}
            modelConfig={modelConfig}
            currentPrediction={currentPrediction}
            setCurrentPrediction={setCurrentPrediction}
            detectionStatus={detectionStatus}
            setDetectionStatus={setDetectionStatus}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
            updateInventoryFromDetection={updateInventoryFromDetection}
            determineInventoryChange={determineInventoryChange}
            processPrediction={processPrediction}
            preprocessImage={preprocessImage}
            fruitEmojis={FRUIT_EMOJIS}
            persistentTracking={persistentTracking}
            bowlContents={bowlContents}
            setBowlContents={setBowlContents}
            detectionHistory={detectionHistory}
            setDetectionHistory={setDetectionHistory}
          />

          <InventorySection
            inventory={inventory}
            FRUIT_CLASSES={FRUIT_CLASSES}
            updateInventory={updateInventory}
            updateThreshold={updateThreshold}
            developerMode={developerMode}
            resetAllInventory={resetAllInventory}
            setDemoInventory={setDemoInventory}
            setAllFruitsToFive={setAllFruitsToFive}
          />
        </div>

        {/* Your original bottom grid layout */}
        <div className="bottom-grid">
          <GrocerySection inventory={inventory} />
          <RecipeSection inventory={inventory} />
        </div>

        {/* Your original developer panel */}
        {developerMode && (
          <div className="developer-panel">
            <h3>🔧 Developer Mode</h3>
            <div className="developer-info">
              <p><strong>Model:</strong> {model?.name || 'Not loaded'}</p>
              <p><strong>Mode:</strong> {model?.isSimulation ? 'Demo/Simulation' : 'Real AI'}</p>
              <p><strong>Fruits Tracked:</strong> {Object.keys(inventory).length}</p>
              <p><strong>Total Items:</strong> {Object.values(inventory).reduce((sum, item) => sum + item.count, 0)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;