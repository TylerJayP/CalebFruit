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
  // State management
  const [inventory, setInventory] = useState({});
  const [model, setModel] = useState(null);
  const [modelConfig, setModelConfig] = useState(null);
  const [currentModelKey, setCurrentModelKey] = useState('better_model');
  const [isModelLoading, setIsModelLoading] = useState(false);
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

  // Load AI model
  const loadModel = useCallback(async (modelKey = null) => {
    const modelToLoad = modelKey || currentModelKey;
    
    if (isModelLoading || !modelConfig) return null;
    
    setIsModelLoading(true);
    setDetectionStatus({
      message: '🧠 Loading AI model...',
      type: 'loading'
    });
    
    try {
      const modelInfo = modelConfig.models[modelToLoad];
      if (!modelInfo) {
        throw new Error(`Model ${modelToLoad} not found in configuration`);
      }

      console.log(`Loading model: ${modelInfo.name}`);
      console.log(`Model URL: ${modelInfo.modelUrl}`);
      
      // Load your converted model
      const loadedModel = await tf.loadGraphModel(modelInfo.modelUrl);
      
      console.log('✅ Model loaded successfully!');
      console.log('Model input shape:', modelInfo.inputShape);
      
      setModel(loadedModel);
      setCurrentModelKey(modelToLoad);
      setDetectionStatus({
        message: `🤖 ${modelInfo.name} ready`,
        type: 'active'
      });
      
      return loadedModel;
    } catch (error) {
      console.error('❌ Error loading model:', error);
      setDetectionStatus({
        message: '⚠️ AI model unavailable - using simulation mode',
        type: 'error'
      });
      
      // Create fallback simulation model for demo
      const simulationModel = createSimulationModel();
      setModel(simulationModel);
      return simulationModel;
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelLoading, modelConfig, currentModelKey]);

  // Create simulation model for demo if real model fails to load
  const createSimulationModel = useCallback(() => {
    console.log('Creating simulation model for demo purposes...');
    const fruitClasses = modelConfig?.classes || [];
    
    return {
      predict: (input) => {
        // Return random but realistic predictions for demo
        const predictions = new Float32Array(fruitClasses.length);
        const randomIndex = Math.floor(Math.random() * fruitClasses.length);
        
        // Create realistic confidence distribution
        for (let i = 0; i < predictions.length; i++) {
          if (i === randomIndex) {
            predictions[i] = 0.7 + Math.random() * 0.25; // High confidence for main prediction
          } else {
            predictions[i] = Math.random() * 0.3; // Lower confidence for others
          }
        }
        
        // Normalize to sum to 1
        const sum = predictions.reduce((a, b) => a + b, 0);
        for (let i = 0; i < predictions.length; i++) {
          predictions[i] /= sum;
        }
        
        return {
          data: () => Promise.resolve(predictions)
        };
      },
      isSimulation: true
    };
  }, [modelConfig]);

  // Preprocess image for AI model
  const preprocessImage = useCallback((canvas) => {
    if (!modelConfig || !modelConfig.models[currentModelKey]) {
      return null;
    }

    const modelInfo = modelConfig.models[currentModelKey];
    const imageSize = modelInfo.imageSize || 224;

    return tf.tidy(() => {
      // Convert canvas to tensor
      let tensor = tf.browser.fromPixels(canvas);
      
      // Resize to model input size
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

  // Core AI analysis function
  const analyzeVideoFrame = useCallback(async (videoElement) => {
    if (!cameraActive || !videoElement.videoWidth || !model || !modelConfig) return;
    
    try {
      // Create canvas to capture current video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(videoElement, 0, 0);
      
      // Preprocess image for model
      const imageTensor = preprocessImage(canvas);
      if (!imageTensor) return;
      
      // Make prediction using your trained model
      const prediction = await model.predict(imageTensor).data();
      
      // Clean up tensor to prevent memory leaks
      imageTensor.dispose();
      
      // Process prediction results
      const result = processPrediction(prediction);
      
      if (result.confidence > DETECTION_THRESHOLD) {
        // High confidence detection - update inventory
        const changeType = determineInventoryChange(result.fruit);
        updateInventoryFromDetection(result.fruit, changeType);
        
        const action = changeType === 'added' ? 'added to' : 'removed from';
        setDetectionStatus({
          message: `✅ ${result.fruit.charAt(0).toUpperCase() + result.fruit.slice(1)} ${action} bowl (${(result.confidence * 100).toFixed(1)}%)`,
          type: 'active'
        });
      } else {
        // Low confidence - continue monitoring
        setDetectionStatus({
          message: '🔍 Monitoring for fruit changes...',
          type: 'active'
        });
      }
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setDetectionStatus({
        message: '⚠️ Analysis error - continuing monitoring',
        type: 'error'
      });
    }
  }, [cameraActive, model, modelConfig, preprocessImage, processPrediction, determineInventoryChange]);

  // Update inventory based on AI detection
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
          <h1>🍎 Smart Fruit Bowl</h1>
          <p>AI-Powered Inventory Management System</p>
          
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

        <div className="main-grid">
          <CameraSection
            cameraActive={cameraActive}
            setCameraActive={setCameraActive}
            autoDetectionActive={autoDetectionActive}
            setAutoDetectionActive={setAutoDetectionActive}
            detectionStatus={detectionStatus}
            setDetectionStatus={setDetectionStatus}
            analyzeVideoFrame={analyzeVideoFrame}
            model={model}
            autoDetectionInterval={AUTO_DETECTION_INTERVAL}
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