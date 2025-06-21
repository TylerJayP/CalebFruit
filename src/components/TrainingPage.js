// src/TrainingPage.js - Adapted for CalebFruit Project
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

const TrainingPage = ({ modelConfig, FRUIT_CLASSES, FRUIT_EMOJIS, onModelTrained }) => {
  // === TRAINING STATE ===
  const [cameraActive, setCameraActive] = useState(false);
  const [currentFruit, setCurrentFruit] = useState(FRUIT_CLASSES[0] || 'apple');
  const [trainingData, setTrainingData] = useState(() => {
    // Initialize training data for all fruit classes
    const initialData = {};
    FRUIT_CLASSES.forEach(fruit => {
      initialData[fruit] = [];
    });
    return initialData;
  });
  const [existingModel, setExistingModel] = useState(null);
  const [modelExists, setModelExists] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [status, setStatus] = useState('🔍 Checking for existing model...');
  const [progress, setProgress] = useState(0);
  const [lossInfo, setLossInfo] = useState('');
  const [modelInfo, setModelInfo] = useState(null);
  
  // === CAMERA REFS ===
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // === CONFIGURATION ===
  const MODEL_CONFIG = {
    inputShape: [64, 64, 3],
    imageSize: 64,
    classes: FRUIT_CLASSES,
    epochs: {
      new: 25,
      continued: 10
    },
    batchSize: 8,
    learningRate: 0.001,
    validationSplit: 0.1
  };

  // Convert FRUIT_CLASSES and FRUIT_EMOJIS to fruits array for rendering
  const fruits = FRUIT_CLASSES.map(fruitKey => ({
    key: fruitKey,
    emoji: FRUIT_EMOJIS[fruitKey] || '🍎',
    name: fruitKey.charAt(0).toUpperCase() + fruitKey.slice(1)
  }));

  // === MODEL MANAGEMENT FUNCTIONS ===

  // Check for existing model
  const checkExistingModel = useCallback(async () => {
    try {
      console.log('🔍 Checking for existing trained model...');
      setStatus('🔍 Checking for existing model...');

      // Try to load from multiple possible locations
      const possiblePaths = [
        '/models/model.json',
        '/trained_model/model.json',
        '/custom_model/model.json'
      ];

      let modelLoaded = false;
      for (const path of possiblePaths) {
        try {
          console.log(`📂 Trying to load model from: ${path}`);
          const model = await tf.loadLayersModel(path);
          
          setExistingModel(model);
          setModelExists(true);
          setModelInfo({
            layers: model.layers.length,
            totalParams: model.countParams()
          });
          setStatus(`✅ Found existing model at ${path} - ready to continue training!`);
          modelLoaded = true;
          break;
        } catch (err) {
          console.log(`❌ No model found at ${path}: ${err.message}`);
        }
      }

      if (!modelLoaded) {
        setModelExists(false);
        setStatus('🆕 No existing model found - ready to train new model');
      }
    } catch (error) {
      console.log('ℹ️ No existing model found:', error.message);
      setModelExists(false);
      setStatus('🆕 No existing model found - ready to train new model');
    }
  }, []);

  // Download model as files
  const downloadModelFiles = useCallback(async (model, modelName = 'trained-fruit-model') => {
    try {
      console.log('📁 Preparing model download...');
      setStatus('📁 Preparing model files for download...');

      // Create save handler that downloads files with proper TensorFlow.js format
      const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts) => {
        console.log('📝 Model artifacts received:', Object.keys(artifacts));
        
        // Create proper TensorFlow.js model.json structure
        const modelJson = {
          format: "layers-model",
          generatedBy: "TensorFlow.js",
          convertedBy: "CalebFruit Custom Training",
          modelTopology: artifacts.modelTopology,
          weightsManifest: [{
            paths: ["weights.bin"],
            weights: artifacts.weightSpecs
          }],
          userDefinedMetadata: {
            name: modelName,
            classes: MODEL_CONFIG.classes,
            inputShape: MODEL_CONFIG.inputShape,
            imageSize: MODEL_CONFIG.imageSize,
            trainedDate: new Date().toISOString()
          }
        };
        
        console.log('📋 Generated model.json structure:', {
          format: modelJson.format,
          hasTopology: !!modelJson.modelTopology,
          hasWeightsManifest: !!modelJson.weightsManifest,
          weightsSize: artifacts.weightData.byteLength
        });
        
        const modelBlob = new Blob([JSON.stringify(modelJson, null, 2)], { type: 'application/json' });
        
        // Create weights file
        const weightsBlob = new Blob([artifacts.weightData], { type: 'application/octet-stream' });
        
        // Create metadata file (separate from model.json)
        const metadata = {
          name: modelName,
          version: '1.0',
          description: 'Custom trained CalebFruit detection model',
          classes: MODEL_CONFIG.classes,
          inputShape: MODEL_CONFIG.inputShape,
          imageSize: MODEL_CONFIG.imageSize,
          architecture: {
            layers: model.layers.length,
            totalParams: model.countParams(),
            layerTypes: model.layers.map(layer => layer.getClassName())
          },
          trainedDate: new Date().toISOString(),
          framework: 'TensorFlow.js',
          format: 'layers-model'
        };
        const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
        
        // Create download links
        const downloads = [
          { blob: modelBlob, filename: 'model.json', description: 'Model architecture' },
          { blob: weightsBlob, filename: 'weights.bin', description: 'Model weights' },
          { blob: metadataBlob, filename: 'metadata.json', description: 'Model metadata' }
        ];
        
        console.log('📥 Starting downloads...');
        downloads.forEach(({ blob, filename, description }, index) => {
          setTimeout(() => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`📁 Downloaded: ${filename} (${description})`);
          }, index * 500); // Stagger downloads by 500ms
        });
        
        return { modelArtifactsInfo: { dateSaved: new Date() } };
      }));
      
      console.log('💾 Model save result:', saveResult);
      return true;
    } catch (error) {
      console.error('❌ Model download failed:', error);
      setStatus(`❌ Download failed: ${error.message}`);
      return false;
    }
  }, [MODEL_CONFIG]);

  // === CAMERA FUNCTIONS ===

  const startCamera = useCallback(async () => {
    try {
      console.log('📷 Starting camera...');
      setStatus('📷 Starting camera...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'environment' // Back camera on mobile
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setStatus('✅ Camera ready! Select a fruit type and start capturing images');
        console.log('✅ Camera started successfully');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      setStatus(`❌ Camera error: ${error.message}`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setStatus('📷 Camera stopped');
    console.log('📷 Camera stopped');
  }, []);

  const captureImage = useCallback(async () => {
    if (!cameraActive || !videoRef.current || !canvasRef.current) {
      setStatus('❌ Camera not active or elements not ready');
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match model requirements
      canvas.width = MODEL_CONFIG.imageSize;
      canvas.height = MODEL_CONFIG.imageSize;
      
      console.log(`📸 Capturing image for ${currentFruit}...`);
      setStatus(`📸 Capturing ${currentFruit}...`);
      
      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Verify the canvas has content
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData.data.some(pixel => pixel !== 0);
      
      if (!hasContent) {
        console.warn('❌ Captured image appears to be empty/black');
        setStatus('⚠️ Captured empty image - ensure camera is working');
        return;
      }
      
      // Convert to tensor
      const tensor = tf.browser.fromPixels(canvas)
        .resizeNearestNeighbor([MODEL_CONFIG.imageSize, MODEL_CONFIG.imageSize])
        .div(255.0);
      
      console.log(`✅ Created tensor with shape: ${tensor.shape}`);
      
      // Add to training data
      setTrainingData(prev => ({
        ...prev,
        [currentFruit]: [...prev[currentFruit], tensor]
      }));
      
      const newCount = trainingData[currentFruit].length + 1;
      setStatus(`✅ Captured ${currentFruit} #${newCount}! ${newCount >= 5 ? 'Ready for training!' : `Need ${5 - newCount} more`}`);
      
      console.log(`📊 Training data updated - ${currentFruit}: ${newCount} images`);
      
    } catch (error) {
      console.error('❌ Capture error:', error);
      setStatus(`❌ Capture failed: ${error.message}`);
    }
  }, [currentFruit, trainingData, cameraActive, MODEL_CONFIG.imageSize]);

  // === TRAINING FUNCTION ===

  const trainModel = useCallback(async () => {
    if (isTraining) return;

    // Validate training data
    const hasEnoughData = Object.keys(trainingData).every(fruit => 
      trainingData[fruit].length >= 5
    );

    if (!hasEnoughData) {
      setStatus('❌ Need at least 5 images per fruit type to train');
      return;
    }

    setIsTraining(true);
    setProgress(0);

    try {
      let model;
      let trainingMode;

      // Use existing model or create new one
      if (existingModel && modelExists) {
        console.log('🔄 Using existing model for continued training');
        model = existingModel;
        trainingMode = 'continued';
        setStatus('🔄 Loading existing model for continued training...');
      } else {
        console.log('🆕 Creating new model architecture');
        trainingMode = 'new';
        setStatus('🆕 Creating new model architecture...');
        
        // Create new sequential model
        model = tf.sequential({
          layers: [
            tf.layers.conv2d({
              inputShape: MODEL_CONFIG.inputShape,
              filters: 32,
              kernelSize: 3,
              activation: 'relu'
            }),
            tf.layers.maxPooling2d({ poolSize: 2 }),
            tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }),
            tf.layers.maxPooling2d({ poolSize: 2 }),
            tf.layers.conv2d({ filters: 128, kernelSize: 3, activation: 'relu' }),
            tf.layers.maxPooling2d({ poolSize: 2 }),
            tf.layers.flatten(),
            tf.layers.dropout({ rate: 0.5 }),
            tf.layers.dense({ units: 128, activation: 'relu' }),
            tf.layers.dropout({ rate: 0.3 }),
            tf.layers.dense({ 
              units: MODEL_CONFIG.classes.length, 
              activation: 'softmax',
              name: 'predictions' 
            })
          ]
        });

        // Compile the model
        model.compile({
          optimizer: tf.train.adam(MODEL_CONFIG.learningRate),
          loss: 'categoricalCrossentropy',
          metrics: ['accuracy']
        });
      }

      console.log('📋 Model summary:');
      model.summary();

      // Prepare training data
      setStatus('📊 Preparing training data...');
      console.log('📊 Preparing training data...');

      const allImages = [];
      const allLabels = [];

      Object.keys(trainingData).forEach((fruit, fruitIndex) => {
        trainingData[fruit].forEach(tensor => {
          allImages.push(tensor);
          
          // Create one-hot encoded label
          const label = new Array(MODEL_CONFIG.classes.length).fill(0);
          label[fruitIndex] = 1;
          allLabels.push(label);
        });
      });

      console.log(`📊 Total training samples: ${allImages.length}`);
      console.log(`📊 Class distribution:`, 
        Object.keys(trainingData).map(fruit => 
          `${fruit}: ${trainingData[fruit].length}`
        ).join(', ')
      );

      // Convert to tensors
      const xs = tf.stack(allImages);
      const ys = tf.tensor2d(allLabels);

      console.log(`🔢 Training tensor shapes - X: ${xs.shape}, Y: ${ys.shape}`);

      // Training configuration
      const epochs = MODEL_CONFIG.epochs[trainingMode];
      
      setStatus(`🧠 Training model (${epochs} epochs)...`);
      console.log(`🧠 Starting training for ${epochs} epochs...`);

      // Train the model
      const history = await model.fit(xs, ys, {
        epochs: epochs,
        batchSize: MODEL_CONFIG.batchSize,
        validationSplit: MODEL_CONFIG.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            const progress = ((epoch + 1) / epochs) * 100;
            setProgress(progress);
            
            const lossText = `Epoch ${epoch + 1}/${epochs} - Loss: ${logs.loss.toFixed(4)} - Accuracy: ${(logs.acc * 100).toFixed(1)}%`;
            setLossInfo(lossText);
            setStatus(`🧠 Training... ${progress.toFixed(0)}% complete`);
            
            console.log(`📊 ${lossText}`);
          }
        }
      });

      console.log('✅ Training completed!');
      console.log('📊 Final training history:', history.history);

      // Update model info
      setModelInfo({
        layers: model.layers.length,
        totalParams: model.countParams()
      });

      // Save the model
      setStatus('💾 Saving trained model...');
      console.log('💾 Saving trained model...');
      
      const downloadSuccess = await downloadModelFiles(model, `calebfruit-model-${Date.now()}`);
      
      if (downloadSuccess) {
        setStatus(`✅ Training complete! Model files downloaded. 
        
Your model files have been downloaded:
• model.json
• weights.bin  
• metadata.json

📋 To use your trained model:

1. Create folder: public/models/
2. Move downloaded files to public/models/
3. Restart your app
4. Your model will load automatically!

🔄 You can now train again to improve the model further.`);
        
        // Update state
        setExistingModel(model);
        setModelExists(true);
        
        // Notify parent
        if (onModelTrained) {
          onModelTrained(model, MODEL_CONFIG.classes);
        }
        
        // Auto-refresh model check after a delay
        setTimeout(() => {
          setStatus('✅ Training completed successfully! 🔄 You can now train again to improve the model further.');
        }, 1000);
      } else {
        setStatus('❌ Training completed but file download failed');
      }
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
    } catch (error) {
      console.error('❌ Training error:', error);
      setStatus(`❌ Training failed: ${error.message}`);
      setLossInfo('Check console for details');
    } finally {
      setIsTraining(false);
    }
  }, [trainingData, existingModel, modelExists, downloadModelFiles, onModelTrained, MODEL_CONFIG]);

  // === LIFECYCLE ===

  useEffect(() => {
    checkExistingModel();
  }, [checkExistingModel]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      console.log('🧹 Cleaning up TrainingPage...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.keys(trainingData).forEach(fruit => {
        trainingData[fruit].forEach(tensor => {
          if (tensor && tensor.dispose) tensor.dispose();
        });
      });
    };
  }, [trainingData]);

  // === COMPUTED VALUES ===
  const totalImages = Object.values(trainingData).reduce((sum, arr) => sum + arr.length, 0);
  const readyToTrain = Object.keys(trainingData).every(fruit => trainingData[fruit].length >= 5);

  // === RENDER ===
  return (
    <div className="training-page">
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Status Bar */}
      <div className="section training-status-section">
        <h2 className="section-title">🧠 AI Training Lab</h2>
        <div className="training-status">
          {status}
        </div>

        {/* Model Info */}
        {modelInfo && (
          <div className="model-info">
            <h3>🤖 Current Model Information</h3>
            <div className="model-stats">
              <div className="stat-card">
                <strong>Layers:</strong> {modelInfo.layers}
              </div>
              <div className="stat-card">
                <strong>Parameters:</strong> {modelInfo.totalParams.toLocaleString()}
              </div>
              <div className="stat-card">
                <strong>Status:</strong> {modelExists ? '✅ Ready for continued training' : '🆕 New model'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Camera Section */}
      <div className="section camera-section">
        <h2 className="section-title">📷 Training Data Capture</h2>
        
        {/* Video Display */}
        <div className="video-container">
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline
            controls={false}
            className={`training-video ${cameraActive ? 'active' : ''}`}
          />
          {!cameraActive && (
            <div className="video-placeholder">
              <span className="camera-icon">📷</span>
              <p>Camera not started</p>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="camera-controls">
          <button 
            className={`btn ${cameraActive ? 'btn-danger' : 'btn-primary'}`}
            onClick={cameraActive ? stopCamera : startCamera}
            disabled={isTraining}
          >
            {cameraActive ? '🛑 Stop Camera' : '📷 Start Camera'}
          </button>
        </div>

        {/* Fruit Selection */}
        {cameraActive && (
          <div className="fruit-selection">
            <h4>Select Fruit Type to Capture:</h4>
            <div className="fruit-buttons">
              {fruits.map(fruit => (
                <button
                  key={fruit.key}
                  onClick={() => setCurrentFruit(fruit.key)}
                  disabled={isTraining}
                  className={`fruit-btn ${currentFruit === fruit.key ? 'active' : ''}`}
                >
                  <span className="fruit-emoji">{fruit.emoji}</span>
                  {fruit.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Capture Button */}
        {cameraActive && (
          <div className="capture-controls">
            <button 
              className="btn btn-capture"
              onClick={captureImage}
              disabled={isTraining}
            >
              📸 Capture {fruits.find(f => f.key === currentFruit)?.name || currentFruit}
            </button>
          </div>
        )}
      </div>

      {/* Dataset Info */}
      <div className="section dataset-section">
        <h2 className="section-title">📊 Training Dataset ({totalImages} total images)</h2>
        <div className="dataset-grid">
          {fruits.map(fruit => {
            const count = trainingData[fruit.key].length;
            const hasEnough = count >= 5;
            
            return (
              <div key={fruit.key} className={`dataset-card ${hasEnough ? 'ready' : 'need-more'}`}>
                <div className="fruit-emoji-large">{fruit.emoji}</div>
                <div className="fruit-name">{fruit.name}</div>
                <div className="image-count">{count} images</div>
                <div className="status-text">
                  {hasEnough ? '✅ Ready' : `❌ Need ${5 - count} more`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Section */}
      <div className="section training-section">
        <h2 className="section-title">🚀 Model Training</h2>
        
        <button 
          onClick={trainModel}
          disabled={!readyToTrain || isTraining}
          className={`btn btn-train ${readyToTrain && !isTraining ? 'ready' : 'disabled'}`}
        >
          {isTraining 
            ? '🧠 Training...' 
            : readyToTrain 
              ? (modelExists ? '🔄 Continue Training' : '🧠 Train New Model')
              : '📊 Need More Images'
          }
        </button>

        {/* Training Progress */}
        {isTraining && (
          <div className="training-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="loss-info">
              {lossInfo}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isTraining && (
          <div className="training-instructions">
            {!readyToTrain && (
              <p>📝 Capture at least 5 images of each fruit type to start training</p>
            )}
            {readyToTrain && !modelExists && (
              <p>🆕 Ready to train a new model! This will take about 2-3 minutes.</p>
            )}
            {readyToTrain && modelExists && (
              <p>🔄 Continue training to improve your existing model performance!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingPage;