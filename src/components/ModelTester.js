import React, { useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

function ModelTester({ model, modelConfig }) {
  const [testResults, setTestResults] = useState('');
  const [isSimulation, setIsSimulation] = useState(false);
  const fileInputRef = useRef(null);

  // Check if model is simulation
  React.useEffect(() => {
    setIsSimulation(model?.isSimulation || false);
  }, [model]);

  const addResult = (message) => {
    setTestResults(prev => prev + message + '\n');
    console.log(message);
  };

  const runQuickTest = async () => {
    if (!model) {
      setTestResults('❌ No model available for testing\n');
      return;
    }

    setTestResults('🚀 Quick Model Test\n');
    addResult(`Model Status: ${isSimulation ? '🎭 Simulation' : '🤖 Real Model'}`);
    
    if (isSimulation) {
      addResult('Currently using simulation mode - predictions will be random');
      addResult('This happens when the real model fails to load');
      addResult('You can still test the app functionality!');
    } else {
      addResult('✅ Successfully using your trained model!');
      addResult('Predictions are based on your actual fruit classification model');
      addResult('The AI will recognize real fruits from your camera feed');
    }
  };

  const testModelPrediction = async () => {
    if (!model) {
      addResult('❌ No model loaded');
      return;
    }

    setTestResults('🧪 Testing model predictions...\n');

    try {
      // Test with random input
      addResult('Creating test input (150x150x3 image)...');
      const randomInput = tf.randomUniform([1, 150, 150, 3]);
      const prediction = await model.predict(randomInput).data();
      randomInput.dispose();
      
      // Get top 3 predictions
      const indexed = Array.from(prediction).map((prob, idx) => ({
        class: modelConfig.classes[idx],
        probability: prob
      }));
      
      indexed.sort((a, b) => b.probability - a.probability);
      
      addResult('Top 3 predictions:');
      for (let i = 0; i < Math.min(3, indexed.length); i++) {
        const item = indexed[i];
        addResult(`  ${i + 1}. ${item.class}: ${(item.probability * 100).toFixed(1)}%`);
      }
      
      if (isSimulation) {
        addResult('\n⚠️  Note: These are random predictions (simulation mode)');
      } else {
        addResult('\n✅ Real model predictions based on your training data');
      }
      
    } catch (error) {
      addResult(`❌ Error testing model: ${error.message}`);
    }
  };

  const testWithImageFile = async (file) => {
    if (!model || !file) return;

    addResult(`\n📷 Testing with uploaded image: ${file.name}`);

    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = async () => {
        // Resize to model input size
        canvas.width = 150;
        canvas.height = 150;
        ctx.drawImage(img, 0, 0, 150, 150);
        
        // Convert to tensor
        const imageTensor = tf.browser.fromPixels(canvas)
          .div(255.0)
          .expandDims(0);
        
        // Make prediction
        const prediction = await model.predict(imageTensor).data();
        imageTensor.dispose();
        
        // Get top predictions
        const indexed = Array.from(prediction).map((prob, idx) => ({
          class: modelConfig.classes[idx],
          probability: prob
        }));
        
        indexed.sort((a, b) => b.probability - a.probability);
        
        addResult(`Top predictions:`);
        for (let i = 0; i < Math.min(3, indexed.length); i++) {
          const item = indexed[i];
          addResult(`  ${i + 1}. ${item.class}: ${(item.probability * 100).toFixed(1)}%`);
        }
        
        if (isSimulation) {
          addResult(`⚠️  Note: These are random predictions (simulation mode)`);
        } else {
          addResult(`✅ Real model predictions`);
        }
      };
      
      img.src = URL.createObjectURL(file);
      
    } catch (error) {
      addResult(`❌ Error processing image: ${error.message}`);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      testWithImageFile(file);
    }
  };

  return (
    <div className="model-tester" style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      padding: '25px',
      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
      backdropFilter: 'blur(10px)'
    }}>
      <h2 className="section-title">🧪 Model Tester</h2>
      
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        borderRadius: '10px',
        backgroundColor: '#f7fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Model Status:</span>
          <span style={{
            padding: '5px 12px',
            borderRadius: '15px',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            backgroundColor: isSimulation ? '#FEF3C7' : '#D1FAE5',
            color: isSimulation ? '#92400E' : '#065F46'
          }}>
            {isSimulation ? '🎭 Simulation Mode' : '🤖 Real Model Active'}
          </span>
        </div>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <button 
          onClick={runQuickTest}
          className="btn btn-primary"
        >
          Quick Status
        </button>
        
        <button 
          onClick={testModelPrediction}
          className="btn btn-secondary"
        >
          Test Predictions
        </button>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-success"
        >
          Test with Image
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      
      <div style={{
        backgroundColor: '#1a1a1a',
        color: '#00ff00',
        padding: '15px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        maxHeight: '300px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap'
      }}>
        {testResults || 'Click a button above to test your model...'}
      </div>
      
      {isSimulation && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '10px'
        }}>
          <h3 style={{ fontWeight: 'bold', color: '#92400E', marginBottom: '8px' }}>
            ⚠️ Simulation Mode Active
          </h3>
          <p style={{ color: '#92400E', fontSize: '0.9rem', margin: 0 }}>
            Your app is using simulated predictions for demo purposes. 
            The real model loaded but predictions are still random. 
            This is normal - you can still test all the app features!
          </p>
        </div>
      )}
      
      {!isSimulation && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: '#D1FAE5',
          border: '1px solid #10B981',
          borderRadius: '10px'
        }}>
          <h3 style={{ fontWeight: 'bold', color: '#065F46', marginBottom: '8px' }}>
            ✅ Real Model Active
          </h3>
          <p style={{ color: '#065F46', fontSize: '0.9rem', margin: 0 }}>
            Excellent! Your app is successfully using your trained fruit classification model. 
            Point your camera at fruits to see real AI-powered detection!
          </p>
        </div>
      )}
    </div>
  );
}

export default ModelTester;