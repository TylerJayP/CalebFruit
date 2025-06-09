import React, { useRef, useEffect, useCallback } from 'react';
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
  autoDetectionInterval
}) {
  const videoRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  // Start camera function
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        
        setDetectionStatus({
          message: '📹 Camera active - Ready to detect fruit!',
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
        message: '🔄 Auto detection active - Monitoring fruit bowl',
        type: 'active'
      });
      
      // Start continuous detection
      detectionIntervalRef.current = setInterval(() => {
        if (cameraActive && model && videoRef.current) {
          analyzeVideoFrame(videoRef.current);
        }
      }, autoDetectionInterval);
    }
  }, [
    autoDetectionActive,
    cameraActive,
    model,
    setAutoDetectionActive,
    setDetectionStatus,
    analyzeVideoFrame,
    autoDetectionInterval
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
    
    if (videoRef.current) {
      await analyzeVideoFrame(videoRef.current);
    }
  }, [cameraActive, model, setDetectionStatus, analyzeVideoFrame]);

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
      <h2 className="section-title">📹 Live Camera Feed</h2>
      
      <div className="camera-container">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="video-element"
        />
        
        {!cameraActive && (
          <div className="camera-overlay">
            <h3>Camera Not Available</h3>
            <p>Please allow camera access or check your camera settings</p>
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
          Analyze Fruit
        </button>
        
        <button 
          className={`btn ${autoDetectionActive ? 'btn-primary' : 'btn-success'}`}
          onClick={toggleAutoDetection}
          disabled={!cameraActive || !model}
        >
          Auto Detection: {autoDetectionActive ? 'ON' : 'OFF'}
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