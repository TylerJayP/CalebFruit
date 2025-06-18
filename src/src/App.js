import React, { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import './App.css';

import CameraSection from './components/CameraSection';
import InventorySection from './components/InventorySection';
import GrocerySection from './components/GrocerySection';
import RecipeSection from './components/RecipeSection';
import BowlContentsSection from './components/BowlContentsSection';

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
const DETECTION_THRESHOLD = 0.75; // Higher threshold for more confident detections
const BOWL_DETECTION_THRESHOLD = 0.7; // Even higher threshold for bowl tracking
const EMPTY_SCENE_THRESHOLD = 0.5; // If all predictions are below this, consider scene empty
const AUTO_DETECTION_INTERVAL = 1000; // 1 second for bowl tracking

function App() {
  // State management
  const [inventory, setInventory] = useState({}); // Total inventory (cumulative)
  const [bowlContents, setBowlContents] = useState({}); // What's currently on the bowl/tray
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

  // Bowl tracking state
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [bowlHistory, setBowlHistory] = useState([]);
  const [persistentTracking, setPersistentTracking] = useState(true);
  const [detectionSensitivity, setDetectionSensitivity] = useState('medium'); // low, medium, high
  const [requireConsistentDetection, setRequireConsistentDetection] = useState(true); // Require multiple consistent detections
  const [motionDetection, setMotionDetection] = useState(false); // Only detect when there's motion

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
    // Also reset bowl contents
    setBowlContents({});
    setBowlHistory([]);
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
      
      // Validate that the model has the predict method
      if (!loadedModel || typeof loadedModel.predict !== 'function') {
        throw new Error('Loaded model does not have a predict method');
      }
      
      // Test the model with a dummy input to ensure it works
      const testInput = tf.zeros([1, modelInfo.imageSize, modelInfo.imageSize, 3]);
      try {
        console.log('🔧 Testing model with dummy input...');
        const testOutput = loadedModel.predict(testInput);
        
        if (testOutput && typeof testOutput.data === 'function') {
          const testData = await testOutput.data();
          console.log('✅ Model test successful, output shape:', testData.length);
          testOutput.dispose();
        } else {
          throw new Error('Model predict output is invalid');
        }
        
        testInput.dispose();
      } catch (testError) {
        testInput.dispose();
        throw new Error(`Model validation failed: ${testError.message}`);
      }
      
      // Create enhanced model object
      const enhancedModel = {
        ...loadedModel,
        predict: (tensor) => {
          try {
            return loadedModel.predict(tensor);
          } catch (error) {
            console.error('Prediction error:', error);
            throw error;
          }
        },
        isSimulation: false,
        name: modelInfo.name,
        inputShape: modelInfo.inputShape,
        imageSize: modelInfo.imageSize
      };
      
      setModel(enhancedModel);
      
      setDetectionStatus({
        message: `✅ Model loaded: ${modelInfo.name}`,
        type: 'active'
      });
      
      console.log('✅ Model loaded successfully');
      
    } catch (error) {
      console.error('❌ Model loading failed:', error);
      
      // Automatically fallback to demo mode
      console.log('🎭 Automatically falling back to demo simulation mode');
      
      const fallbackModel = {
        predict: (tensor) => {
          console.log('🎭 Demo prediction called');
          // Simulate prediction returning TensorFlow-like object
          const mockData = () => new Array(15).fill(0).map(() => Math.random());
          return {
            data: () => Promise.resolve(mockData()),
            dataSync: () => mockData(),
            dispose: () => {}
          };
        },
        isSimulation: true,
        name: 'Demo Simulation Mode (Auto-Fallback)',
        inputShape: [150, 150, 3],
        imageSize: 150
      };
      
      setModel(fallbackModel);
      
      setDetectionStatus({
        message: `⚠️ Using demo mode - Model failed: ${error.message}`,
        type: 'error'
      });
      
      console.log('✅ Fallback demo mode activated');
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
      tensor = tf.image.resizeBilinear(tensor, [imageSize, imageSize]);
      tensor = tensor.div(255.0);
      tensor = tensor.expandDims(0);
      return tensor;
    });
  }, [modelConfig, currentModelKey]);

  // Get detection thresholds based on sensitivity
  const getDetectionThresholds = useCallback(() => {
    switch (detectionSensitivity) {
      case 'low':
        return {
          bowl: 0.85, // Very high confidence required
          empty: 0.6,
          legacy: 0.8
        };
      case 'high':
        return {
          bowl: 0.6, // Lower confidence acceptable
          empty: 0.4,
          legacy: 0.7
        };
      default: // medium
        return {
          bowl: 0.75, // Balanced confidence
          empty: 0.5,
          legacy: 0.75
        };
    }
  }, [detectionSensitivity]);

  // Process model prediction for bowl tracking with adjustable sensitivity
  const processPredictionForBowl = useCallback((prediction) => {
    const fruitClasses = modelConfig?.classes?.map(c => c.toLowerCase()) || [];
    const thresholds = getDetectionThresholds();
    
    // Find the highest confidence prediction
    const maxConfidence = Math.max(...prediction);
    
    console.log('🔧 Detection sensitivity:', detectionSensitivity);
    console.log('🔧 Using thresholds:', thresholds);
    console.log('🔧 Max confidence:', (maxConfidence * 100).toFixed(1) + '%');
    
    // Show top 3 predictions for debugging
    const topPredictions = Array.from(prediction)
      .map((conf, i) => ({ fruit: fruitClasses[i], confidence: conf }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    
    console.log('🔧 Top 3 predictions:', topPredictions.map(p => 
      `${p.fruit}: ${(p.confidence * 100).toFixed(1)}%`
    ));
    
    // Check if scene appears empty
    if (maxConfidence < thresholds.empty) {
      console.log('🔧 Scene appears empty - max confidence below', thresholds.empty);
      return {
        detectedFruits: {},
        confidence: maxConfidence,
        timestamp: Date.now(),
        isEmpty: true
      };
    }
    
    // Find fruits with confidence above bowl detection threshold
    const detectedFruits = {};
    
    prediction.forEach((confidence, index) => {
      if (confidence > thresholds.bowl && fruitClasses[index]) {
        const fruit = fruitClasses[index];
        detectedFruits[fruit] = 1;
        console.log(`🔧 Detected ${fruit} with confidence ${(confidence * 100).toFixed(1)}%`);
      }
    });
    
    // If no fruits meet the threshold, return empty
    if (Object.keys(detectedFruits).length === 0) {
      console.log('🔧 No fruits above confidence threshold of', thresholds.bowl);
      return {
        detectedFruits: {},
        confidence: maxConfidence,
        timestamp: Date.now(),
        isEmpty: true
      };
    }
    
    return {
      detectedFruits: detectedFruits,
      confidence: maxConfidence,
      timestamp: Date.now(),
      isEmpty: false
    };
  }, [modelConfig, getDetectionThresholds, detectionSensitivity]);

  // Process prediction and return structured result (legacy method for compatibility)
  const processPrediction = useCallback((prediction) => {
    const fruitClasses = modelConfig?.classes?.map(c => c.toLowerCase()) || [];
    const thresholds = getDetectionThresholds();
    
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const confidence = prediction[maxIndex];
    const fruit = fruitClasses[maxIndex];
    
    // Only add to history if confidence is reasonable
    if (confidence > thresholds.empty) {
      setDetectionHistory(prev => {
        const newHistory = [...prev, {
          fruit: fruit,
          confidence: confidence,
          timestamp: Date.now()
        }];
        return newHistory.slice(-3);
      });
    }
    
    return {
      fruit: fruit,
      confidence: confidence,
      allProbabilities: Array.from(prediction).map((prob, index) => ({
        class: fruitClasses[index],
        probability: prob
      }))
    };
  }, [modelConfig, getDetectionThresholds]);

  // Update bowl contents with persistent tracking and empty scene handling
  const updateBowlFromDetection = useCallback((detectionResult) => {
    setBowlContents(prev => {
      // If scene is empty and we're not in persistent tracking mode, clear everything
      if (detectionResult.isEmpty && !persistentTracking) {
        if (Object.keys(prev).length > 0) {
          console.log('🔧 Clearing bowl - empty scene detected');
        }
        return {};
      }
      
      // If scene is empty but we're in persistent tracking mode, keep existing items
      if (detectionResult.isEmpty && persistentTracking) {
        console.log('🔧 Empty scene - maintaining persistent tracking');
        return prev; // Keep existing items
      }
      
      // Scene has fruits detected
      if (!persistentTracking) {
        // Direct replacement - only show what's currently detected
        return Object.fromEntries(
          Object.entries(detectionResult.detectedFruits).map(([fruit, count]) => [
            fruit,
            {
              count: count,
              lastSeen: Date.now(),
              confidence: detectionResult.confidence
            }
          ])
        );
      }
      
      // Persistent tracking - keep items until they're consistently absent
      const updated = { ...prev };
      
      // Add newly detected fruits
      Object.entries(detectionResult.detectedFruits).forEach(([fruit, count]) => {
        updated[fruit] = {
          count: count,
          lastSeen: Date.now(),
          confidence: detectionResult.confidence
        };
      });
      
      // Remove fruits that haven't been seen for a while (only in persistent mode)
      const removalThreshold = 8000; // 8 seconds - longer for less aggressive removal
      Object.keys(updated).forEach(fruit => {
        if (Date.now() - updated[fruit].lastSeen > removalThreshold) {
          console.log(`🔧 Removing ${fruit} - not seen for ${removalThreshold/1000}s`);
          delete updated[fruit];
        }
      });
      
      return updated;
    });
  }, [persistentTracking]);

  // Reset bowl function
  const resetBowl = useCallback(() => {
    setBowlContents({});
    setBowlHistory([]);
    setDetectionStatus({
      message: '🍽️ Bowl reset - Ready to track new fruits!',
      type: 'active'
    });
    console.log('🔄 Bowl contents reset');
  }, [setDetectionStatus]);

  // Manual override for false positives
  const removeFalsePositive = useCallback((fruit) => {
    setBowlContents(prev => {
      const updated = { ...prev };
      delete updated[fruit];
      console.log(`🔧 Manually removed false positive: ${fruit}`);
      return updated;
    });
    
    // Also update total inventory if needed
    setInventory(prev => {
      const updated = { ...prev };
      if (updated[fruit] && updated[fruit].count > 0) {
        updated[fruit].count--;
        console.log(`📊 Inventory decreased: ${fruit} count now ${updated[fruit].count}`);
      }
      return updated;
    });
  }, []);

  // Clear all false positives
  const clearAllFalsePositives = useCallback(() => {
    if (window.confirm('Clear all detected items? This will remove everything from the bowl tracking.')) {
      setBowlContents({});
      setBowlHistory([]);
      console.log('🔧 All false positives cleared');
    }
  }, []);

  // Legacy compatibility functions
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

  // Update total inventory when bowl contents change significantly
  useEffect(() => {
    const bowlItems = Object.entries(bowlContents);
    
    if (bowlItems.length > 0) {
      setInventory(prev => {
        const updated = { ...prev };
        
        bowlItems.forEach(([fruit, data]) => {
          if (updated[fruit]) {
            // Update total inventory if bowl shows more than we've tracked
            const currentTotal = updated[fruit].count;
            const bowlCount = data.count;
            
            if (bowlCount > currentTotal) {
              updated[fruit].count = bowlCount;
              console.log(`📊 Total inventory updated: ${fruit} count increased to ${bowlCount}`);
            }
          }
        });
        
        return updated;
      });
    }
  }, [bowlContents]);

  // Initialize application
  useEffect(() => {
    console.log('🍎 Initializing Smart Bowl/Tray React App...');
    
    const init = async () => {
      const config = await loadModelConfig();
      setModelConfig(config);
      
      const fruitClasses = config.classes || [];
      const initialInventory = initializeInventory(fruitClasses);
      setInventory(initialInventory);
      
      const defaultModel = config.defaultModel || 'converted_model';
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof tf !== 'undefined') {
        tf.disposeVariables();
      }
      console.log('🧹 React app cleanup completed');
    };
  }, []);

  // Get fruit classes for components
  const FRUIT_CLASSES = modelConfig?.classes?.map(c => c.toLowerCase()) || [];

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

        {/* Developer Mode Controls */}
        {developerMode && (
          <div className="developer-section">
            <h3>🔧 Developer Controls</h3>
            
            <div className="dev-quick-actions">
              <button 
                className="dev-action-btn"
                onClick={setDemoInventory}
              >
                Set Demo Inventory
              </button>
              <button 
                className="dev-action-btn"
                onClick={setAllFruitsToFive}
              >
                Set All to 5
              </button>
              <button 
                className="dev-action-btn"
                onClick={resetAllInventory}
              >
                Reset All to 0
              </button>
              <button 
                className="dev-action-btn"
                onClick={model?.isSimulation ? switchToRealModel : switchToDemoMode}
                style={{
                  background: model?.isSimulation ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 193, 7, 0.3)',
                  borderColor: model?.isSimulation ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 193, 7, 0.5)'
                }}
              >
                {model?.isSimulation ? '🤖 Switch to Real Model' : '🎭 Switch to Demo Mode'}
              </button>
            </div>
            
            {/* Detection Sensitivity Control */}
            <div className="dev-sensitivity-control">
              <h4>🎯 Detection Settings</h4>
              
              {/* Sensitivity Level */}
              <div className="sensitivity-section">
                <label>Confidence Threshold:</label>
                <div className="sensitivity-buttons">
                  {['low', 'medium', 'high'].map(level => (
                    <button
                      key={level}
                      className={`sensitivity-btn ${detectionSensitivity === level ? 'active' : ''}`}
                      onClick={() => setDetectionSensitivity(level)}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                      {level === 'low' && ' (85%+)'}
                      {level === 'medium' && ' (75%+)'}
                      {level === 'high' && ' (60%+)'}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Consistency Requirement */}
              <div className="consistency-section">
                <label className="tracking-toggle">
                  <input
                    type="checkbox"
                    checked={requireConsistentDetection}
                    onChange={(e) => setRequireConsistentDetection(e.target.checked)}
                  />
                  <span className="tracking-label">
                    🔄 Require Consistent Detection (Recommended)
                  </span>
                </label>
                <p className="sensitivity-description">
                  When enabled, fruits must be detected multiple times in a row before being added to the bowl. This significantly reduces false positives like paper towels being detected as apples.
                </p>
              </div>
              
              {/* Manual Override Buttons */}
              <div className="manual-override-section">
                <label>Manual Override:</label>
                <div className="override-buttons">
                  <button 
                    className="dev-action-btn override-btn"
                    onClick={clearAllFalsePositives}
                    style={{ background: 'rgba(255, 107, 107, 0.3)', borderColor: 'rgba(255, 107, 107, 0.5)' }}
                  >
                    🗑️ Clear All False Positives
                  </button>
                </div>
              </div>
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
        )}

        {/* Bowl Contents Display */}
        <BowlContentsSection
          bowlContents={bowlContents}
          persistentTracking={persistentTracking}
          setPersistentTracking={setPersistentTracking}
          resetBowl={resetBowl}
          detectionSensitivity={detectionSensitivity}
          requireConsistentDetection={requireConsistentDetection}
          removeFalsePositive={removeFalsePositive}
        />

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
            // Pass sensitivity and bowl tracking functions
            bowlContents={bowlContents}
            updateBowlFromDetection={updateBowlFromDetection}
            resetBowl={resetBowl}
            processPredictionForBowl={processPredictionForBowl}
            detectionSensitivity={detectionSensitivity}
            // Legacy compatibility
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