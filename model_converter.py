#!/usr/bin/env python3
"""
Model converter for React Smart Fruit Bowl
Converts Kaggle model to TensorFlow.js format
"""

import os
import sys
import json
import tensorflow as tf
import tensorflowjs as tfjs

def convert_model():
    """Convert Kaggle model to TensorFlow.js format for React app"""
    
    input_path = "models/fruit_classifier.h5"
    output_path = "public/web_model"  # React public folder
    
    print("🍎 Smart Fruit Bowl - React Model Converter")
    print("=" * 50)
    
    # Check if model exists
    if not os.path.exists(input_path):
        print(f"❌ Model not found: {input_path}")
        print("Please place your Kaggle model (.h5 file) in the models/ folder")
        print("and rename it to 'fruit_classifier.h5'")
        return False
    
    try:
        # Load model to verify
        print(f"🔄 Loading model: {input_path}")
        model = tf.keras.models.load_model(input_path)
        
        print(f"✅ Model loaded successfully")
        print(f"   - Input shape: {model.input_shape}")
        print(f"   - Output shape: {model.output_shape}")
        print(f"   - Parameters: {model.count_params():,}")
        
        # Create output directory in React public folder
        os.makedirs(output_path, exist_ok=True)
        
        # Convert with optimization for web
        print(f"🔄 Converting to TensorFlow.js format...")
        tfjs.converters.save_keras_model(
            model, 
            output_path,
            quantization_bytes=2,  # Float16 quantization
            strip_debug_ops=True
        )
        
        # Create metadata for React app
        metadata = {
            "model_name": "Smart Fruit Bowl Classifier",
            "version": "1.0.0",
            "accuracy": "99.6%",
            "framework": "React + TensorFlow.js",
            "classes": [
                "apple", "banana", "carambola", "guava", "kiwi",
                "mango", "muskmelon", "orange", "peach", "pear",
                "persimmon", "pitaya", "plum", "pomegranate", "tomato"
            ],
            "input_shape": [224, 224, 3],
            "preprocessing": {
                "resize": [224, 224],
                "normalize": [0, 1]
            }
        }
        
        with open(os.path.join(output_path, "model_metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        
        # Calculate size
        total_size = sum(
            os.path.getsize(os.path.join(output_path, f))
            for f in os.listdir(output_path)
        )
        
        print(f"✅ Conversion completed!")
        print(f"   - Output: {output_path}/")
        print(f"   - Size: {total_size / (1024*1024):.1f} MB")
        print(f"   - Files: {len(os.listdir(output_path))}")
        print(f"   - Ready for React: ✅")
        
        return True
        
    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return False

if __name__ == "__main__":
    success = convert_model()
    if success:
        print("\n🎉 Ready for React! Run: npm start")
    else:
        print("\n❌ Fix the errors above and try again")
        sys.exit(1)