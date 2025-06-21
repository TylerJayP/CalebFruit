import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Import existing components
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
        converted_model: {
          modelUrl: "./tfjs_best_model/model.json",
          inputShape: [150, 150, 3],
          imageSize: 150,
          name: "Converted Model"
        }
      },
      defaultModel: "converted_model",
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
  // State management
  const [inventory, setInventory] = useState({});
  const [bowlContents, setBowlContents] = useState({});
  const [model, setModel] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [currentModelKey, setCurrentModelKey] = useState('converted_model');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  
  // NEW: Add state for current view mode
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'training'
  
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

  // Bowl tracking state
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [bowlHistory, setBowlHistory] = useState([]);
  const [persistentTracking, setPersistentTracking] = useState(true);
  const [detectionSensitivity, setDetectionSensitivity] = useState('medium');
  const [requireConsistentDetection, setRequireConsistentDetection] = useState(true);
  const [motionDetection, setMotionDetection] = useState(false);

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

  // Adjust fruit count manually (Developer Mode)
  const adjustFruitCount = useCallback((fruit, change) => {
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[fruit]) {
        const newCount = Math.max(0, updated[fruit].count + change);
        updated[fruit].count = newCount;
        console.log(`🔧 DEV: ${fruit} count adjusted to ${newCount}`);
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
    setBowlContents({});
    setBowlHistory([]);
  }, []);

  const setDemoInventory = useCallback(() => {
    setInventory(prev => {
      const updated = { ...prev };
      const demoValues = {
        apple: 3, banana: 2, orange: 1, mango: 4, kiwi: 2, 
        pear: 1, peach: 3, plum: 2, tomato: 1
      };
      
      Object.keys(updated).forEach(fruit => {
        updated[fruit].count = demoValues[fruit] || 0;
      });
      console.log('🔧 DEV: Demo inventory set');
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

  // Load model function (simplified for brevity)
  const loadModel = useCallback(async () => {
    if (!modelConfig || isModelLoading) return;

    setIsModelLoading(true);
    try {
      const modelInfo = modelConfig.models[currentModelKey];
      console.log('🤖 Loading model:', modelInfo.name);
      
      // Load the actual model here
      // const loadedModel = await tf.loadLayersModel(modelInfo.modelUrl);
      
      // For demo purposes, we'll create a mock model
      const mockModel = {
        name: modelInfo.name,
        inputShape: modelInfo.inputShape,
        imageSize: modelInfo.imageSize,
        isSimulation: true,
        predict: () => ({}) // Mock predict function
      };
      
      setModel(mockModel);
      console.log('✅ Model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load model:', error);
    } finally {
      setIsModelLoading(false);
    }
  }, [modelConfig, currentModelKey, isModelLoading]);

  // Initialize app
  useEffect(() => {
    const init = async () => {
      console.log('🚀 Initializing Smart Fruit Detector...');
      const config = await loadModelConfig();
      setModelConfig(config);
      
      const initialInventory = initializeInventory(config.classes || []);
      setInventory(initialInventory);
    };
    
    init();
  }, [initializeInventory]);

  // Load model when config is ready
  useEffect(() => {
    if (modelConfig && !model && !isModelLoading) {
      loadModel();
    }
  }, [modelConfig, model, isModelLoading, loadModel]);

  // Get fruit classes for components
  const FRUIT_CLASSES = modelConfig?.classes?.map(c => c.toLowerCase()) || [];

  // NEW: Function to toggle between main view and training mode
  const toggleTrainingMode = () => {
    setCurrentView(currentView === 'training' ? 'main' : 'training');
  };

  // If we're in training mode, render the TrainingPage
  if (currentView === 'training') {
    return (
      <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
        <div className="container">
          <div className="header">
            <h1>Smart Fruit Detector - Training Mode</h1>
            <p>Train and Manage AI Models</p>
            
            {/* Status Indicators Row */}
            <div className="status-row">
              {/* Back to Main Button */}
              <div className="nav-toggle">
                <button 
                  className="nav-toggle-btn"
                  onClick={toggleTrainingMode}
                >
                  <span className="nav-icon">🏠</span>
                  Back to Main
                </button>
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
            </div>
          </div>

          {/* Render Training Page */}
          <TrainingPage 
            modelConfig={modelConfig}
            FRUIT_CLASSES={FRUIT_CLASSES}
            FRUIT_EMOJIS={FRUIT_EMOJIS}
          />
        </div>
      </div>
    );
  }

  // Main application view
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

            {/* NEW: Training Mode Toggle */}
            <div className="training-toggle">
              <button 
                className="training-toggle-btn"
                onClick={toggleTrainingMode}
              >
                <span className="training-icon">🧠</span>
                Training Mode
              </button>
            </div>
          </div>
        </div>

        {/* Developer Mode Panel */}
        {developerMode && (
          <div className="developer-panel">
            <div className="dev-panel-header">
              <h3>🔧 Developer Controls</h3>
              <p>Manual inventory management and debugging tools</p>
            </div>
            
            <div className="dev-controls">
              <div className="dev-quick-actions">
                <button className="dev-btn demo-btn" onClick={setDemoInventory}>
                  📊 Set Demo Inventory
                </button>
                <button className="dev-btn set-five-btn" onClick={setAllFruitsToFive}>
                  🎯 Set All to 5
                </button>
                <button className="dev-btn reset-btn" onClick={resetAllInventory}>
                  🗑️ Reset All to 0
                </button>
              </div>
              
              {/* Fruit Controls */}
              <div className="dev-fruit-controls">
                {FRUIT_CLASSES.map(fruit => {
                  const data = inventory[fruit];
                  if (!data) return null;
                  
                  return (
                    <div key={fruit} className="dev-fruit-item">
                      <div className="dev-fruit-info">
                        <span className="dev-fruit-emoji">{data.emoji}</span>
                        <span className="dev-fruit-name">{fruit}</span>
                        <span className="dev-fruit-count">{data.count}</span>
                      </div>
                      <div className="dev-fruit-buttons">
                        <button 
                          className="dev-adjust-btn minus"
                          onClick={() => adjustFruitCount(fruit, -1)}
                          disabled={data.count <= 0}
                        >
                          −
                        </button>
                        <button 
                          className="dev-adjust-btn plus"
                          onClick={() => adjustFruitCount(fruit, 1)}
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

        {/* Main Application Grid */}
        <div className="main-grid">
          <CameraSection 
            model={model}
            inventory={inventory}
            setInventory={setInventory}
            bowlContents={bowlContents}
            setBowlContents={setBowlContents}
            cameraActive={cameraActive}
            setCameraActive={setCameraActive}
            autoDetectionActive={autoDetectionActive}
            setAutoDetectionActive={setAutoDetectionActive}
            detectionStatus={detectionStatus}
            setDetectionStatus={setDetectionStatus}
            detectionHistory={detectionHistory}
            setDetectionHistory={setDetectionHistory}
            bowlHistory={bowlHistory}
            setBowlHistory={setBowlHistory}
            persistentTracking={persistentTracking}
            setPersistentTracking={setPersistentTracking}
            detectionSensitivity={detectionSensitivity}
            setDetectionSensitivity={setDetectionSensitivity}
            requireConsistentDetection={requireConsistentDetection}
            setRequireConsistentDetection={setRequireConsistentDetection}
            motionDetection={motionDetection}
            setMotionDetection={setMotionDetection}
            FRUIT_CLASSES={FRUIT_CLASSES}
            DETECTION_THRESHOLD={DETECTION_THRESHOLD}
            BOWL_DETECTION_THRESHOLD={BOWL_DETECTION_THRESHOLD}
            EMPTY_SCENE_THRESHOLD={EMPTY_SCENE_THRESHOLD}
            AUTO_DETECTION_INTERVAL={AUTO_DETECTION_INTERVAL}
          />
          
          <InventorySection 
            inventory={inventory}
            setInventory={setInventory}
            adjustFruitCount={adjustFruitCount}
            developerMode={developerMode}
            FRUIT_CLASSES={FRUIT_CLASSES}
          />
        </div>

        <div className="bottom-grid">
          <GrocerySection 
            inventory={inventory}
            FRUIT_CLASSES={FRUIT_CLASSES}
          />
          
          <RecipeSection 
            inventory={inventory}
            FRUIT_CLASSES={FRUIT_CLASSES}
          />
        </div>
      </div>
    </div>
  );
}

export default App;