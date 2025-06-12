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
  // UPDATED: These props now come from the cleaned App.js
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
    apple: '🍎', banana: '🍌', carambola: '⭐', guava: '🟢', kiwi: '🥝',
    mango: '🥭', muskmelon: '🍈', orange: '🍊', peach: '🍑', pear: '🍐',
    persimmon: '🟠', pitaya: '🐉', plum: '🟣', pomegranate: '🔴', tomato: '🍅'
  };

  // CLEANED: Detection function with no overlay, no debouncing
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
        if (!imageTensor) return;
        
        // Make prediction
        const prediction = await model.predict(imageTensor).data();
        imageTensor.dispose();
        
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
          message: '📹 Camera active - Ready for real-time AI detection!',
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

  // Toggle automatic detection
  const toggleAutoDetection = useCallback(() => {
    if (autoDetectionActive) {
      // Stop auto detection
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setAutoDetectionActive(false);
      setDetectionStatus({
        message: '🔄 Auto detection stopped',
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
        message: '🔄 Real-time AI detection active!',
        type: 'active'
      });
      
      // Start continuous detection
      detectionIntervalRef.current = setInterval(() => {
        detectFruitsRealTime();
      }, 1000);
    }
  }, [
    autoDetectionActive,
    cameraActive,
    model,
    setAutoDetectionActive,
    setDetectionStatus,
    detectFruitsRealTime
  ]);

  // Manual fruit detection
  const captureFrame = useCallback(async () => {
    if (!cameraActive) {
      alert('Please start the camera first!');
      return;
    }
    
    if (!model) {
      alert('AI model is still loading. Please wait a moment.');
      return;
    }
    
    setDetectionStatus({
      message: '📸 Analyzing fruit...',
      type: 'loading'
    });
    
    await detectFruitsRealTime();
  }, [cameraActive, model, setDetectionStatus, detectFruitsRealTime]);

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
      <h2 className="section-title">📹 Live AI Camera Feed</h2>
      
      {/* CLEANED: Removed canvas overlay completely */}
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
            <h3>Camera Ready</h3>
            <p>Click "Start Camera" to begin real-time AI fruit detection</p>
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
        
        <button 
          className="btn btn-secondary" 
          onClick={captureFrame}
          disabled={!cameraActive || !model}
        >
          Analyze Frame
        </button>
        
        <button 
          className={`btn ${autoDetectionActive ? 'btn-primary' : 'btn-success'}`}
          onClick={toggleAutoDetection}
          disabled={!cameraActive || !model}
        >
          Real-time Detection: {autoDetectionActive ? 'ON' : 'OFF'}
        </button>
      </div>

      <StatusDisplay 
        status={detectionStatus.message}
        type={detectionStatus.type}
      />
    </div>
  );
}

export default CameraSection;