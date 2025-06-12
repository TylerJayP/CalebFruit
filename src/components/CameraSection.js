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
  analyzeVideoFrame,
  model,
  autoDetectionInterval,
  modelConfig
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  
  // Real-time prediction state
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fruit emoji mapping (matching your HTML version)
  const fruitEmojis = {
    apple: '🍎', banana: '🍌', carambola: '⭐', guava: '🟢', kiwi: '🥝',
    mango: '🥭', muskmelon: '🍈', orange: '🍊', peach: '🍑', pear: '🍐',
    persimmon: '🟠', pitaya: '🐉', plum: '🟣', pomegranate: '🔴', tomatoes: '🍅'
  };

  // Real-time detection function (like your HTML version)
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
        
        // Preprocess image for model
        const imageTensor = preprocessImage(canvas);
        if (!imageTensor) return;
        
        // Make prediction
        const prediction = await model.predict(imageTensor).data();
        imageTensor.dispose();
        
        // Process prediction results
        const result = processPrediction(prediction);
        
        // Update current prediction for display
        setCurrentPrediction({
          fruit: result.fruit,
          confidence: result.confidence,
          timestamp: Date.now(),
          isSimulation: model.isSimulation || false,
          class: result.fruit
        });
        
        // Show detection overlay (like your HTML version)
        showDetectionOverlay(result);
        
        // Update detection status
        const emoji = fruitEmojis[result.fruit.toLowerCase()] || '🍎';
        const modelType = model.isSimulation ? '🎭' : '🤖';
        setDetectionStatus({
          message: `${modelType} ${emoji} Detected: ${result.fruit} (${(result.confidence * 100).toFixed(1)}%)`,
          type: 'active'
        });
        
        // Call original analyze function for inventory updates if confidence is high
        if (result.confidence > 0.75) {
          await analyzeVideoFrame(video);
        }
      }
    } catch (error) {
      console.error('❌ Real-time detection error:', error);
      clearDetectionOverlay();
    } finally {
      setIsAnalyzing(false);
    }
  }, [cameraActive, model, modelConfig, analyzeVideoFrame]);

  // Show detection overlay (matching your HTML drawDetectionBox function)
  const showDetectionOverlay = useCallback((prediction) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create gradient for the bounding box (like your HTML version)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#4facfe');
    gradient.addColorStop(1, '#00f2fe');
    
    // Set drawing styles
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    
    // Draw bounding box (centered like your HTML version)
    const boxWidth = canvas.width * 0.6;
    const boxHeight = canvas.height * 0.6;
    const x = (canvas.width - boxWidth) / 2;
    const y = (canvas.height - boxHeight) / 2;
    
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    
    // Draw label with emoji and confidence
    const emoji = fruitEmojis[prediction.fruit.toLowerCase()] || '🍎';
    const label = `${emoji} ${prediction.fruit} (${Math.round(prediction.confidence * 100)}%)`;
    ctx.fillText(label, x, y - 15);
    
    // Draw confidence bar
    const barWidth = boxWidth;
    const barHeight = 6;
    const barX = x;
    const barY = y + boxHeight + 10;
    
    // Background bar
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Confidence bar
    ctx.fillStyle = prediction.confidence > 0.8 ? '#4facfe' : prediction.confidence > 0.6 ? '#ffd93d' : '#ff6b6b';
    ctx.fillRect(barX, barY, barWidth * prediction.confidence, barHeight);
    
  }, [fruitEmojis]);

  // Clear detection overlay
  const clearDetectionOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setCurrentPrediction(null);
  }, []);

  // Preprocess image for AI model
  const preprocessImage = useCallback((canvas) => {
    if (!modelConfig) return null;

    const imageSize = 150; // Based on your model config

    return tf.tidy(() => {
      let tensor = tf.browser.fromPixels(canvas);
      tensor = tf.image.resizeBilinear(tensor, [imageSize, imageSize]);
      tensor = tensor.div(255.0);
      tensor = tensor.expandDims(0);
      return tensor;
    });
  }, [modelConfig]);

  // Process prediction results
  const processPrediction = useCallback((prediction) => {
    const fruitClasses = modelConfig?.classes?.map(c => c.toLowerCase()) || [];
    
    const maxIndex = prediction.indexOf(Math.max(...prediction));
    const confidence = prediction[maxIndex];
    const fruit = fruitClasses[maxIndex];
    
    return {
      fruit: fruit,
      confidence: confidence,
      class: fruit
    };
  }, [modelConfig]);

  // Start camera function
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera like your HTML version
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
    clearDetectionOverlay();
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    setDetectionStatus({
      message: 'Camera stopped',
      type: ''
    });
  }, [setCameraActive, setAutoDetectionActive, setDetectionStatus, clearDetectionOverlay]);

  // Toggle automatic detection (like your HTML version)
  const toggleAutoDetection = useCallback(() => {
    if (autoDetectionActive) {
      // Stop auto detection
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      setAutoDetectionActive(false);
      clearDetectionOverlay();
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
      
      // Start continuous detection (like your HTML version)
      detectionIntervalRef.current = setInterval(() => {
        detectFruitsRealTime();
      }, 1000); // 1 second intervals like your HTML version
    }
  }, [
    autoDetectionActive,
    cameraActive,
    model,
    setAutoDetectionActive,
    setDetectionStatus,
    detectFruitsRealTime,
    clearDetectionOverlay
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
      
      <div className="camera-container" style={{ position: 'relative' }}>
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="video-element"
          style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '15px' }}
        />
        
        {/* Canvas overlay for detection graphics (like your HTML version) */}
        <canvas 
          ref={canvasRef}
          className="detection-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            borderRadius: '15px'
          }}
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