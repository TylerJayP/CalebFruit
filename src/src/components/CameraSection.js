import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import StatusDisplay from './StatusDisplay';

function CameraSection({
  cameraActive,
  setCameraActive,
  autoDetectionActive,
  setAutoDetectionActive,
  detectionStatus,
  setDetectionStatus,
  model,
  autoDetectionInterval,
  modelConfig,
  // Bowl tracking props
  bowlContents,
  updateBowlFromDetection,
  resetBowl,
  processPredictionForBowl,
  // Legacy compatibility props
  determineInventoryChange,
  updateInventoryFromDetection,
  preprocessImage,
  processPrediction
}) {
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  // Real-time prediction state
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fruit emoji mapping
  const fruitEmojis = {
    apple: '🍎', banana: '🍌', kiwi: '🥝',
    mango: '🥭', orange: '🍊', peach: '🍑', pear: '🍐'
  };

  // Enhanced bowl detection function
  const detectFruitsInBowl = useCallback(async () => {
    if (!cameraActive || !videoRef.current || !model || !modelConfig) {
      console.log('❌ Missing requirements for detection:', {
        cameraActive,
        videoReady: !!videoRef.current,
        modelLoaded: !!model,
        configLoaded: !!modelConfig
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        console.log('🔧 Starting bowl detection...');
        
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame
        ctx.drawImage(video, 0, 0);
        
        // Use preprocessImage function from App.js
        const imageTensor = preprocessImage(canvas);
        if (!imageTensor) {
          console.warn('Failed to preprocess image');
          return;
        }
        
        console.log('🔧 Making prediction with tensor shape:', imageTensor.shape);
        console.log('🔧 Model info:', { 
          name: model.name, 
          isSimulation: model.isSimulation,
          predictMethod: typeof model.predict
        });
        
        // Make prediction
        const predictionResult = model.predict(imageTensor);
        const prediction = await predictionResult.data();
        
        // Clean up tensors
        imageTensor.dispose();
        if (predictionResult.dispose) {
          predictionResult.dispose();
        }
        
        console.log('🔧 Prediction received, length:', prediction.length);
        
        // Use bowl-specific prediction processing
        const result = processPredictionForBowl(prediction);
        
        console.log('🔧 Bowl prediction result:', result);
        
        // Update bowl contents based on detection
        updateBowlFromDetection(result);
        
        // Update current prediction for display
        setCurrentPrediction({
          detectedFruits: result.detectedFruits,
          confidence: result.confidence,
          timestamp: Date.now(),
          isSimulation: model.isSimulation || false
        });
        
        // Update detection status based on bowl contents
        updateBowlDetectionStatus(result);
      } else {
        console.log('❌ Video not ready, readyState:', video.readyState);
      }
    } catch (error) {
      console.error('❌ Bowl detection error:', error);
      setDetectionStatus({
        message: `❌ Bowl detection error: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraActive, model, modelConfig, updateBowlFromDetection, processPredictionForBowl, preprocessImage, setDetectionStatus]);

  // Update detection status for bowl tracking
  const updateBowlDetectionStatus = useCallback((result) => {
    const detectedItems = Object.entries(result.detectedFruits);
    const modelType = model.isSimulation ? '🎭' : '🤖';
    
    if (detectedItems.length === 0) {
      setDetectionStatus({
        message: `${modelType} 🍽️ Bowl is empty - Add fruits to start tracking!`,
        type: 'active'
      });
    } else {
      const itemList = detectedItems.map(([fruit, count]) => 
        `${count}x ${fruit.charAt(0).toUpperCase() + fruit.slice(1)}`
      ).join(', ');
      
      const modelTypeStatus = model.isSimulation ? '🎭 DEMO' : '🤖 AI';
      setDetectionStatus({
        message: `${modelTypeStatus} 🍽️ Tracking: ${itemList} (${(result.confidence * 100).toFixed(1)}%)`,
        type: 'active'
      });
    }
  }, [model, setDetectionStatus]);

  // Legacy detection function for backward compatibility
  const detectFruitsRealTime = useCallback(async () => {
    if (!cameraActive || !videoRef.current || !model || !modelConfig) return;
    
    setIsAnalyzing(true);
    
    try {
      const video = videoRef.current;
      if (video.readyState >= 2) {
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame
        ctx.drawImage(video, 0, 0);
        
        // Use preprocessImage function from App.js
        const imageTensor = preprocessImage(canvas);
        if (!imageTensor) {
          console.warn('Failed to preprocess image');
          return;
        }
        
        // Make prediction
        const predictionResult = model.predict(imageTensor);
        const prediction = await predictionResult.data();
        
        // Clean up tensors
        imageTensor.dispose();
        if (predictionResult.dispose) {
          predictionResult.dispose();
        }
        
        // Use processPrediction function from App.js
        const result = processPrediction(prediction);
        
        // Update current prediction for display
        setCurrentPrediction({
          fruit: result.fruit,
          confidence: result.confidence,
          timestamp: Date.now(),
          isSimulation: model.isSimulation || false,
          class: result.fruit
        });
        
        // Update detection status
        const emoji = fruitEmojis[result.fruit.toLowerCase()] || '🍎';
        const modelType = model.isSimulation ? '🎭' : '🤖';
        
        if (result.confidence > 0.75) {
          // High confidence - update inventory using functions from App.js
          const changeType = determineInventoryChange(result.fruit);
          updateInventoryFromDetection(result.fruit, changeType);
          
          const action = changeType === 'added' ? 'added to' : 'removed from';
          const modelTypeStatus = model.isSimulation ? '🎭 DEMO' : '🤖 AI';
          setDetectionStatus({
            message: `${modelTypeStatus} ✅ ${result.fruit.charAt(0).toUpperCase() + result.fruit.slice(1)} ${action} bowl (${(result.confidence * 100).toFixed(1)}%)`,
            type: 'active'
          });
        } else {
          // Low confidence - just show detection
          setDetectionStatus({
            message: `${modelType} ${emoji} Detected: ${result.fruit} (${(result.confidence * 100).toFixed(1)}%)`,
            type: 'active'
          });
        }
      }
    } catch (error) {
      console.error('❌ Real-time detection error:', error);
      setDetectionStatus({
        message: `❌ Detection error: ${error.message}`,
        type: 'error'
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraActive, model, modelConfig, determineInventoryChange, updateInventoryFromDetection, setDetectionStatus, preprocessImage, processPrediction]);

  // Start camera function
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        setDetectionStatus({
          message: '📹 Camera active - Ready for bowl tracking!',
          type: 'active'
        });
        
        console.log('✅ Camera started successfully');
      }
      
    } catch (error) {
      console.error('❌ Camera access denied:', error);
      setDetectionStatus({
        message: '❌ Camera access denied - Check permissions',
        type: 'error'
      });
    }
  }, [setCameraActive, setDetectionStatus]);

  // Stop camera function
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setAutoDetectionActive(false);
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setDetectionStatus({
      message: 'Camera stopped',
      type: ''
    });
  }, [setCameraActive, setAutoDetectionActive, setDetectionStatus]);

  // Toggle automatic bowl tracking
  const toggleBowlTracking = useCallback(() => {
    if (autoDetectionActive) {
      // Stop auto detection
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setAutoDetectionActive(false);
      setDetectionStatus({
        message: '🔄 Bowl tracking stopped',
        type: 'active'
      });
    } else {
      // Start auto detection
      if (!cameraActive) {
        alert('Please start the camera first!');
        return;
      }
      
      if (!model) {
        alert('AI model is still loading. Please wait a moment.');
        return;
      }
      
      setAutoDetectionActive(true);
      setDetectionStatus({
        message: '🔄 Bowl tracking active!',
        type: 'active'
      });
      
      console.log('🔄 Starting bowl tracking with interval:', autoDetectionInterval || 1000, 'ms');
      
      // Start continuous bowl detection
      detectionIntervalRef.current = setInterval(() => {
        detectFruitsInBowl();
      }, autoDetectionInterval || 1000);
    }
  }, [
    autoDetectionActive,
    cameraActive,
    model,
    setAutoDetectionActive,
    setDetectionStatus,
    detectFruitsInBowl,
    autoDetectionInterval
  ]);

  // Manual bowl check
  const checkBowlNow = useCallback(async () => {
    if (!cameraActive) {
      alert('Please start the camera first!');
      return;
    }
    
    if (!model) {
      alert('AI model is still loading. Please wait a moment.');
      return;
    }
    
    setDetectionStatus({
      message: '🔍 Checking bowl contents...',
      type: 'loading'
    });
    
    console.log('🔍 Manual bowl check initiated');
    await detectFruitsInBowl();
  }, [cameraActive, model, setDetectionStatus, detectFruitsInBowl]);

  // Reset bowl with confirmation
  const handleResetBowl = useCallback(() => {
    if (Object.keys(bowlContents || {}).length > 0) {
      if (window.confirm('Are you sure you want to reset the bowl contents? This will clear all tracked items.')) {
        resetBowl();
      }
    } else {
      resetBowl();
    }
  }, [bowlContents, resetBowl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="camera-section">
      <h2 className="section-title">📹 Smart Bowl Camera</h2>
      
      <div className="camera-container" style={{ position: 'relative' }}>
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="video-element"
          style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '15px' }}
        />
             
        {!cameraActive && (
          <div className="camera-overlay" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.7)',
            padding: '20px',
            borderRadius: '10px'
          }}>
            <h3>Smart Bowl Camera Ready</h3>
            <p>Click "Start Camera" to begin tracking fruits on your bowl/tray</p>
          </div>
        )}
      </div>
      
      <div className="camera-controls">
        {!cameraActive ? (
          <button 
            className="btn btn-primary" 
            onClick={startCamera}
          >
            Start Camera
          </button>
        ) : (
          <button 
            className="btn btn-secondary" 
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        )}
        
        {/* UPDATED: Changed from "Analyze Frame" to "Check Bowl Now" */}
        <button 
          className="btn btn-secondary" 
          onClick={checkBowlNow}
          disabled={!cameraActive || !model}
          title="Take a snapshot of current bowl contents"
        >
          Check Bowl Now
        </button>
        
        {/* UPDATED: Changed from "Real-time Detection" to "Keep Track Of Bowl" */}
        <button 
          className={`btn ${autoDetectionActive ? 'btn-primary' : 'btn-success'}`}
          onClick={toggleBowlTracking}
          disabled={!cameraActive || !model}
          title="Continuously monitor bowl contents"
        >
          Keep Track Of Bowl: {autoDetectionActive ? 'ON' : 'OFF'}
        </button>

        {/* NEW: Reset Bowl button */}
        <button 
          className="btn btn-warning" 
          onClick={handleResetBowl}
          disabled={!cameraActive}
          title="Clear current bowl contents and start fresh"
          style={{
            background: 'linear-gradient(45deg, #ff9800, #f57c00)',
            color: 'white'
          }}
        >
          Reset Bowl
        </button>
      </div>

      <StatusDisplay 
        status={detectionStatus.message}
        type={detectionStatus.type}
      />

      {/* Bowl Tracking Info */}
      {autoDetectionActive && (
        <div className="bowl-tracking-info" style={{
          background: 'rgba(102, 126, 234, 0.1)',
          padding: '15px',
          borderRadius: '10px',
          marginTop: '15px',
          border: '1px solid rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5em' }}>🔄</span>
            <div>
              <strong>Bowl Tracking Active</strong>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', opacity: 0.8 }}>
                Continuously monitoring your bowl/tray for fruit changes every {(autoDetectionInterval || 1000) / 1000} second(s)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraSection;