import React, { useState, useEffect } from 'react';

const FeedbackCollectionSystem = ({ 
  lastPrediction, 
  lastImageData, 
  isVisible,
  fruitClasses,
  onFeedbackSubmitted 
}) => {
  const [feedbackHistory, setFeedbackHistory] = useState([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [selectedCorrectFruit, setSelectedCorrectFruit] = useState('');
  const [feedbackStats, setFeedbackStats] = useState({});

  // Fruit emoji mapping
  const FRUIT_EMOJIS = {
    apple: '🍎', banana: '🍌', carambola: '⭐', guava: '🟢', kiwi: '🥝',
    mango: '🥭', muskmelon: '🍈', orange: '🍊', peach: '🍑', pear: '🍐',
    persimmon: '🟠', pitaya: '🐉', plum: '🟣', pomegranate: '🔴', tomato: '🍅'
  };

  // Load feedback data on component mount
  useEffect(() => {
    // Note: In Claude.ai artifacts, localStorage isn't available
    // In your real app, use: JSON.parse(localStorage.getItem('fruitAIFeedback') || '[]')
    const savedFeedback = []; // Replace with localStorage.getItem
    setFeedbackHistory(savedFeedback);
    calculateStats(savedFeedback);
  }, []);

  // Show feedback form when new prediction comes in
  useEffect(() => {
    if (lastPrediction && lastPrediction.confidence > 0.5) {
      setShowFeedbackForm(true);
      setSelectedCorrectFruit('');
    }
  }, [lastPrediction]);

  // Calculate accuracy statistics
  const calculateStats = (history) => {
    const stats = {
      totalFeedback: history.length,
      correctPredictions: history.filter(f => f.correct).length,
      overallAccuracy: 0,
      fruitAccuracy: {},
      commonMistakes: {}
    };

    if (history.length > 0) {
      stats.overallAccuracy = (stats.correctPredictions / stats.totalFeedback * 100).toFixed(1);

      // Per-fruit accuracy
      fruitClasses.forEach(fruit => {
        const fruitFeedback = history.filter(f => f.actual === fruit);
        if (fruitFeedback.length > 0) {
          const correct = fruitFeedback.filter(f => f.correct).length;
          stats.fruitAccuracy[fruit] = {
            accuracy: (correct / fruitFeedback.length * 100).toFixed(1),
            samples: fruitFeedback.length,
            avgConfidence: (fruitFeedback.reduce((sum, f) => sum + f.confidence, 0) / fruitFeedback.length).toFixed(2)
          };
        }
      });

      // Common mistakes
      history.filter(f => !f.correct).forEach(feedback => {
        const mistake = `${feedback.predicted} → ${feedback.actual}`;
        stats.commonMistakes[mistake] = (stats.commonMistakes[mistake] || 0) + 1;
      });
    }

    setFeedbackStats(stats);
  };

  // Submit feedback
  const submitFeedback = (isCorrect, correctFruit = null) => {
    if (!lastPrediction) return;

    const feedback = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      predicted: lastPrediction.fruit,
      actual: isCorrect ? lastPrediction.fruit : correctFruit,
      confidence: lastPrediction.confidence,
      correct: isCorrect,
      imageDataUrl: lastImageData,
      allProbabilities: lastPrediction.allProbabilities
    };

    const newHistory = [...feedbackHistory, feedback];
    setFeedbackHistory(newHistory);
    calculateStats(newHistory);
    
    // Save to localStorage in your real app
    // localStorage.setItem('fruitAIFeedback', JSON.stringify(newHistory));
    
    console.log('💾 Feedback saved:', feedback);
    
    // Notify parent component
    if (onFeedbackSubmitted) {
      onFeedbackSubmitted(feedback);
    }
    
    setShowFeedbackForm(false);
    setSelectedCorrectFruit('');
  };

  // Get worst performing fruits
  const getWorstPerformingFruits = () => {
    return Object.entries(feedbackStats.fruitAccuracy || {})
      .filter(([_, data]) => data.samples >= 3)
      .sort(([_, a], [__, b]) => parseFloat(a.accuracy) - parseFloat(b.accuracy))
      .slice(0, 3);
  };

  // Get most common mistakes
  const getTopMistakes = () => {
    return Object.entries(feedbackStats.commonMistakes || {})
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5);
  };

  if (!isVisible) return null;

  return (
    <div className="feedback-system">
      {/* Feedback Form Modal */}
      {showFeedbackForm && lastPrediction && (
        <div className="feedback-modal">
          <div className="feedback-modal-content">
            <h3>🤖 AI Prediction Feedback</h3>
            <div className="prediction-display">
              <div className="predicted-fruit">
                <span className="fruit-emoji">
                  {FRUIT_EMOJIS[lastPrediction.fruit] || '🍎'}
                </span>
                <div className="prediction-details">
                  <strong>{lastPrediction.fruit}</strong>
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill"
                      style={{ width: `${lastPrediction.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="confidence-text">
                    {(lastPrediction.confidence * 100).toFixed(1)}% confident
                  </span>
                </div>
              </div>
            </div>

            <div className="feedback-question">
              <p>Is this prediction correct?</p>
              <div className="feedback-buttons">
                <button 
                  className="btn-correct"
                  onClick={() => submitFeedback(true)}
                >
                  ✅ Correct
                </button>
                <button 
                  className="btn-incorrect"
                  onClick={() => setSelectedCorrectFruit('selecting')}
                >
                  ❌ Incorrect
                </button>
                <button 
                  className="btn-skip"
                  onClick={() => setShowFeedbackForm(false)}
                >
                  ⏭️ Skip
                </button>
              </div>
            </div>

            {/* Correct fruit selector */}
            {selectedCorrectFruit === 'selecting' && (
              <div className="correct-fruit-selector">
                <p>What fruit was it actually?</p>
                <div className="fruit-grid">
                  {fruitClasses.map(fruit => (
                    <button
                      key={fruit}
                      className="fruit-option"
                      onClick={() => submitFeedback(false, fruit)}
                    >
                      <span className="fruit-emoji">
                        {FRUIT_EMOJIS[fruit] || '🍎'}
                      </span>
                      <span className="fruit-name">{fruit}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Statistics Dashboard */}
      <div className="feedback-dashboard">
        <h3>📊 AI Performance Analytics</h3>
        
        {/* Overall Stats */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-number">{feedbackStats.totalFeedback || 0}</div>
            <div className="stat-label">Total Feedback</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{feedbackStats.overallAccuracy || 0}%</div>
            <div className="stat-label">Overall Accuracy</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{feedbackStats.correctPredictions || 0}</div>
            <div className="stat-label">Correct Predictions</div>
          </div>
        </div>

        {/* Fruit-Specific Performance */}
        {Object.keys(feedbackStats.fruitAccuracy || {}).length > 0 && (
          <div className="fruit-performance">
            <h4>🍎 Fruit-Specific Performance</h4>
            <div className="fruit-stats-grid">
              {Object.entries(feedbackStats.fruitAccuracy).map(([fruit, data]) => (
                <div key={fruit} className="fruit-stat-card">
                  <div className="fruit-header">
                    <span className="fruit-emoji">{FRUIT_EMOJIS[fruit] || '🍎'}</span>
                    <span className="fruit-name">{fruit}</span>
                  </div>
                  <div className="fruit-metrics">
                    <div className="metric">
                      <span className="metric-value">{data.accuracy}%</span>
                      <span className="metric-label">Accuracy</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{data.samples}</span>
                      <span className="metric-label">Samples</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{data.avgConfidence}</span>
                      <span className="metric-label">Avg Confidence</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Problem Areas */}
        {getWorstPerformingFruits().length > 0 && (
          <div className="problem-areas">
            <h4>⚠️ Needs Improvement</h4>
            <div className="problem-list">
              {getWorstPerformingFruits().map(([fruit, data]) => (
                <div key={fruit} className="problem-item">
                  <span className="fruit-emoji">{FRUIT_EMOJIS[fruit] || '🍎'}</span>
                  <span className="problem-text">
                    <strong>{fruit}</strong>: {data.accuracy}% accuracy ({data.samples} samples)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Mistakes */}
        {getTopMistakes().length > 0 && (
          <div className="common-mistakes">
            <h4>🔄 Most Common Mistakes</h4>
            <div className="mistakes-list">
              {getTopMistakes().map(([mistake, count]) => (
                <div key={mistake} className="mistake-item">
                  <span className="mistake-text">{mistake}</span>
                  <span className="mistake-count">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        {feedbackHistory.length > 0 && (
          <div className="recent-feedback">
            <h4>📝 Recent Feedback</h4>
            <div className="feedback-log">
              {feedbackHistory.slice(-5).reverse().map(feedback => (
                <div key={feedback.id} className={`feedback-entry ${feedback.correct ? 'correct' : 'incorrect'}`}>
                  <div className="feedback-info">
                    <span className="prediction">
                      {FRUIT_EMOJIS[feedback.predicted]} {feedback.predicted}
                    </span>
                    {!feedback.correct && (
                      <span className="actual">
                        → {FRUIT_EMOJIS[feedback.actual]} {feedback.actual}
                      </span>
                    )}
                    <span className="confidence">
                      {(feedback.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="feedback-time">
                    {new Date(feedback.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackCollectionSystem;