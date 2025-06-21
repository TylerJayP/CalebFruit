import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  // Core detection functions
  preprocessImage,
  processPrediction,
  // ADD/REMOVE functionality props
  adjustFruitCount,
  inventory,
  fruitEmojis
}) {
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  // State for detected fruit (for ADD/REMOVE buttons)
  const [detectedFruit, setDetectedFruit] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fruit emoji mapping - fallback if not provided via props
  const defaultFruitEmojis = {
    apple: '🍎', banana: '🍌', orange: '🍊'
  };
  const finalFruitEmojis = fruitEmojis || defaultFruitEmojis;

  // Simple fruit detection for ADD/REMOVE functionality
  const analyzeFruit = useCallback(async () => {
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
        console.log('🔍 Starting fruit analysis...');
        
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
        
        // Process prediction
        const result = processPrediction(prediction);
        
        console.log('🔍 Detection result:', result);
        
        // Set detected fruit for ADD/REMOVE buttons
        if (result.confidence > 0.5 && result.fruit && result.fruit !== 'unknown') {
          setDetectedFruit({
            name: result.fruit,
            confidence: result.confidence,
            emoji: finalFruitEmojis[result.fruit.toLowerCase()] || '🍎'
          });
          
          const emoji = finalFruitEmojis[result.fruit.toLowerCase()] || '🍎';
          setDetectionStatus({
            message: `${emoji} Detected: ${result.fruit.charAt(0).toUpperCase() + result.fruit.slice(1)} (${(result.confidence * 100).toFixed(1)}%)`,
            type: 'active'
          });
        } else {
          setDetectedFruit(null);
          if (result.fruit === 'unknown') {
            setDetectionStatus({
              message: '❓ Could not identify object - try adjusting camera angle',
              type: 'active'
            });
          } else {
            setDetectionStatus({
              message: '🔍 No fruit detected with sufficient confidence',
              type: 'active'
            });
          }
        }
      } else {
        console.log('❌ Video not ready, readyState:', video.readyState);
      }
    } catch (error) {
      console.error('❌ Fruit analysis error:', error);
      setDetectionStatus({
        message: `❌ Analysis error: ${error.message}`,
        type: 'error'
      });
      setDetectedFruit(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraActive, model, modelConfig, preprocessImage, processPrediction, setDetectionStatus, finalFruitEmojis]);

  // Real-time detection function (for auto-detect mode - shows detected fruits but doesn't modify inventory)
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
        
        // Update detection status and show ADD/REMOVE buttons
        const emoji = finalFruitEmojis[result.fruit.toLowerCase()] || '🍎';
        const modelType = model.isSimulation ? '🎭' : '🤖';
        
        if (result.confidence > 0.5 && result.fruit && result.fruit !== 'unknown') {
          // Show detected fruit with ADD/REMOVE buttons - NO automatic inventory changes
          setDetectedFruit({
            name: result.fruit,
            confidence: result.confidence,
            emoji: emoji
          });
          
          const confidenceLevel = result.confidence > 0.75 ? 'High' : 'Medium';
          setDetectionStatus({
            message: `${modelType} ${emoji} Detected: ${result.fruit.charAt(0).toUpperCase() + result.fruit.slice(1)} (${confidenceLevel} confidence: ${(result.confidence * 100).toFixed(1)}%)`,
            type: 'active'
          });
        } else {
          // Low confidence or unknown - clear detection
          setDetectedFruit(null);
          if (result.fruit === 'unknown') {
            setDetectionStatus({
              message: `${modelType} ❓ Scanning... (object not recognized)`,
              type: 'active'
            });
          } else {
            setDetectionStatus({
              message: `${modelType} 👁️ Scanning for fruits...`,
              type: 'active'
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Real-time detection error:', error);
      setDetectionStatus({
        message: `❌ Detection error: ${error.message}`,
        type: 'error'
      });
      setDetectedFruit(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraActive, model, modelConfig, setDetectionStatus, preprocessImage, processPrediction, finalFruitEmojis]);

  // Auto-detection toggle (shows detected fruits without modifying inventory)
  const toggleAutoDetection = useCallback(() => {
    if (autoDetectionActive) {
      // Stop auto-detection
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setAutoDetectionActive(false);
      setDetectedFruit(null);
      console.log('⏹️ Stopped automatic fruit detection');
    } else {
      // Start auto-detection
      console.log('🔄 Starting automatic fruit detection...');
      detectionIntervalRef.current = setInterval(async () => {
        await detectFruitsRealTime();
      }, autoDetectionInterval || 2000);
      setAutoDetectionActive(true);
    }
  }, [autoDetectionActive, detectFruitsRealTime, autoDetectionInterval, setAutoDetectionActive]);

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
          message: '📹 Camera active - Ready for fruit detection!',
          type: 'active'
        });
        
        console.log('📹 Camera started successfully');
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      setDetectionStatus({
        message: `❌ Camera error: ${error.message}`,
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
    
    // Stop auto-detection
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setAutoDetectionActive(false);
    setCameraActive(false);
    setDetectedFruit(null);
    
    setDetectionStatus({
      message: 'Camera stopped',
      type: ''
    });
    
    console.log('📹 Camera stopped');
  }, [setCameraActive, setDetectionStatus, setAutoDetectionActive]);

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
      <h2 className="section-title">📹 Smart Fruit Camera</h2>
      
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
            <h3>Smart Fruit Camera Ready</h3>
            <p>Click "Start Camera" to begin fruit detection</p>
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
        
        {/* "Analyze Fruit" button */}
        <button 
          className="btn btn-secondary" 
          onClick={analyzeFruit}
          disabled={!cameraActive || !model || isAnalyzing}
          title="Take a snapshot and analyze fruit"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Fruit'}
        </button>
        
        {/* Auto-detection toggle */}
        <button 
          className={`btn ${autoDetectionActive ? 'btn-primary' : 'btn-success'}`}
          onClick={toggleAutoDetection}
          disabled={!cameraActive || !model}
          title="Continuously detect fruits"
        >
          Auto-Detect: {autoDetectionActive ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Enhanced StatusDisplay with ADD/REMOVE functionality */}
      <StatusDisplay 
        status={detectionStatus.message}
        type={detectionStatus.type}
        detectedFruit={detectedFruit}
        inventory={inventory}
        adjustFruitCount={adjustFruitCount}
        autoDetectionActive={autoDetectionActive}
      />
    </div>
  );
}

export default CameraSection;