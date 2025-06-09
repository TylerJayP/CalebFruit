import React, { useState, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import './App.css';

import CameraSection from './components/CameraSection';
import InventorySection from './components/InventorySection';
import GrocerySection from './components/GrocerySection';
import RecipeSection from './components/RecipeSection';

// Fruit classes matching your Kaggle model (15 fruits with 99.6% accuracy)
const FRUIT_CLASSES = [
  'apple', 'banana', 'carambola', 'guava', 'kiwi', 
  'mango', 'muskmelon', 'orange', 'peach', 'pear', 
  'persimmon', 'pitaya', 'plum', 'pomegranate', 'tomato'
];

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
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState({
    message: 'Initializing Smart Fruit Bowl...',
    type: 'loading'
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [autoDetectionActive, setAutoDetectionActive] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState([]);

  // Initialize inventory
  const initializeInventory = useCallback(() => {
    const initialInventory = {};
    FRUIT_CLASSES.forEach(fruit => {
      initialInventory[fruit] = {
        count: 0,
        emoji: FRUIT_EMOJIS[fruit],
        threshold: 2 // Default threshold
      };
    });
    
    // Set some initial inventory for demo
    initialInventory.apple.count = 5;
    initialInventory.banana.count = 8;
    initialInventory.orange.count = 3;
    initialInventory.mango.count = 2;
    initialInventory.pear.count = 2;
    initialInventory.tomato.count = 4;
    
    return initialInventory;
  }, []);

  // Load AI model automatically
  const loadModel = useCallback(async () => {
    if (isModelLoading || model) return model;
    
    setIsModelLoading(true);
    setDetectionStatus({
      message: '🧠 Loading AI model...',
      type: 'loading'
    });
    
    try {
      console.log('Loading your trained fruit classification model...');
      
      // Load your converted model
      const loadedModel = await tf.loadGraphModel('/web_model/model.json');
      
      console.log('✅ Model loaded successfully!');
      setModel(loadedModel);
      setDetectionStatus({
        message: '🤖 AI model ready - 99.6% accuracy',
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
  }, [isModelLoading, model]);

  // Create simulation model for demo if real model fails to load
  const createSimulationModel = useCallback(() => {
    console.log('Creating simulation model for demo purposes...');
    return {
      predict: (input) => {
        // Return random but realistic predictions for demo
        const predictions = new Float32Array(FRUIT_CLASSES.length);
        const randomIndex = Math.floor(Math.random() * FRUIT_CLASSES.length);
        
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
  }, []);

  // Preprocess image for AI model
  const preprocessImage = useCallback((canvas) => {
    return tf.tidy(() => {
      // Convert canvas to tensor
      let tensor = tf.browser.fromPixels(canvas);
      
      // Resize to model input size (224x224 for most fruit classification models)
      tensor = tf.image.resizeBilinear(tensor, [224, 224]);
      
      // Normalize pixel values to [0, 1] range
      tensor = tensor.div(255.0);
      
      // Add batch dimension [1, 224, 224, 3]
      tensor = tensor.expandDims(0);
      
      return tensor;
    });
  }, []);

  // Process model prediction and return structured result
  const processPrediction = useCallback((prediction) => {
    // Find the class with highest confidence
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const confidence = prediction[maxIndex];
    const fruit = FRUIT_CLASSES[maxIndex];
    
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
        class: FRUIT_CLASSES[index],
        probability: prob
      }))
    };
  }, []);

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
    if (!cameraActive || !videoElement.videoWidth || !model) return;
    
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
  }, [cameraActive, model, preprocessImage, processPrediction, determineInventoryChange]);

  // Update inventory based on AI detection
  const updateInventoryFromDetection = useCallback((fruit, action) => {
    setInventory(prev => {
      const updated = { ...prev };
      
      if (action === 'added') {
        updated[fruit].count++;
      } else if (action === 'removed' && updated[fruit].count > 0) {
        updated[fruit].count--;
      }
      
      console.log(`📊 Inventory updated: ${fruit} ${action} (new count: ${updated[fruit].count})`);
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

  // Initialize application
  useEffect(() => {
    console.log('🍎 Initializing Smart Fruit Bowl React App...');
    
    const init = async () => {
      // Initialize inventory
      const initialInventory = initializeInventory();
      setInventory(initialInventory);
      
      // Load AI model
      await loadModel();
      
      console.log('✅ Smart Fruit Bowl React App initialized successfully!');
    };
    
    init();
  }, [initializeInventory, loadModel]);

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

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>🍎 Smart Fruit Bowl</h1>
          <p>AI-Powered Inventory Management System</p>
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