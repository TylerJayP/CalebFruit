# Smart Fruit Bowl

**AI-Powered Inventory Management System**

A modern React application that uses artificial intelligence to detect, track, and manage fruit inventory through real-time camera feeds. Features intelligent recipe suggestions, automated shopping lists, and a comprehensive developer toolkit.

## ✨ Features

### AI-Powered Detection
- **Real-time fruit recognition** using TensorFlow.js machine learning models
- **Automatic inventory updates** based on AI detections
- **Configurable AI models** with simulation mode for testing
- **High accuracy detection** with confidence scoring

### Smart Inventory Management
- **Visual fruit cards** with emoji representations
- **Low stock alerts** and automatic threshold monitoring
- **Real-time inventory statistics** (total items, low stock, out of stock)
- **Customizable stock thresholds** for each fruit type

### Recipe Intelligence
- **10+ built-in smoothie recipes** using available fruits
- **Smart recipe filtering** based on current inventory
- **"Ready to Make" vs "Need Ingredients"** categorization
- **Recipe export functionality** for shopping lists

### Automated Shopping Lists
- **Smart shopping list generation** based on low stock items
- **Recipe-based shopping lists** for missing ingredients
- **Exportable text files** with timestamps
- **Quantity suggestions** based on consumption patterns

### Developer Mode
- **Manual inventory adjustment** with +/- buttons
- **Quick inventory presets** (Demo Mode, Set All to 5, Reset All)
- **Real-time debugging console** with detailed logging
- **Developer-friendly controls** for testing and debugging

## Quick Start

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (version 14.0.0 or higher)
- **npm** (version 6.0.0 or higher) or **yarn**
- **Modern web browser** with camera access support
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/smart-fruit-bowl.git
   cd smart-fruit-bowl
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   or with yarn:
   ```bash
   yarn install
   ```

3. **Set up AI model files** (optional)
   ```bash
   # Place your TensorFlow.js model files in the public folder:
   # public/better_model/model.json
   # public/better_model/model_weights.bin
   # public/webapp_model_config.json
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### Getting Started

1. **Enable Camera Access**: Click "Start Camera" to begin real-time fruit detection
2. **Enable Developer Mode**: Toggle the "Developer Mode" button for manual controls
3. **Add Fruits**: Use the camera detection or manual +/- buttons to add fruits
4. **Explore Recipes**: Check the "Recipes" section for available smoothie suggestions
5. **Generate Shopping Lists**: Use the "Shopping List" section for automated lists

### Camera Detection

- **Position fruits** clearly in front of the camera
- **Ensure good lighting** for optimal AI detection
- **Wait for high confidence** scores (>75%) for automatic inventory updates
- **Check detection status** in the real-time status display

### Developer Mode Features

#### Quick Actions
- **Set Demo Inventory**: Loads realistic test data
- **Set All Fruits to 5**: Sets uniform quantities for testing
- **Reset All to 0**: Clears all inventory

#### Manual Controls
- **Individual +/- buttons** for precise inventory adjustment
- **Real-time count updates** with instant visual feedback
- **Disabled state handling** (can't go below 0)

### Recipe System

#### Ready to Make Recipes
- Recipes you can make with current inventory
- Green highlighting for available recipes
- One-click recipe viewing with instructions

#### Need Ingredients Recipes
- Shows missing ingredients in red
- Available ingredients in green
- Export shopping list for missing items

## 📁 Project Structure

```
smart-fruit-bowl/
├── public/
│   ├── index.html
│   ├── webapp_model_config.json      # AI model configuration
│   └── better_model/                 # TensorFlow.js model files
│       ├── model.json
│       └── model_weights.bin
├── src/
│   ├── components/                   # React components
│   │   ├── CameraSection.js         # AI detection & camera
│   │   ├── InventorySection.js      # Inventory management
│   │   ├── GrocerySection.js        # Shopping lists
│   │   ├── RecipeSection.js         # Recipe suggestions
│   │   └── StatusDisplay.js         # Status indicators
│   ├── App.js                       # Main application component
│   ├── App.css                      # Styling and animations
│   ├── index.js                     # React DOM entry point
│   └── index.css                    # Global styles
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🛠️ Technologies Used

### Frontend Framework
- **React 18.x** - Modern React with hooks and functional components
- **JavaScript ES6+** - Modern JavaScript features and syntax

### AI & Machine Learning
- **TensorFlow.js** - Client-side machine learning for fruit detection
- **Custom AI Models** - Trained fruit classification models
- **Real-time Processing** - Live camera feed analysis

### Styling & UI
- **CSS3** - Modern styling with gradients, animations, and layouts
- **CSS Grid & Flexbox** - Responsive layout systems
- **CSS Animations** - Smooth transitions and interactive effects

### Browser APIs
- **MediaDevices API** - Camera access and video streaming
- **Canvas API** - Image processing and manipulation
- **File API** - Shopping list export functionality

## ⚙️ Available Scripts

### Development
```bash
npm start          # Start development server on http://localhost:3000
npm run build      # Create production build in build/ folder
npm test           # Run test suite in interactive watch mode
npm run eject      # Eject from Create React App (one-way operation)
```

### Debugging
```bash
npm run build      # Test production build locally
npm run analyze    # Analyze bundle size and dependencies
```

## 🔧 Configuration

### AI Model Configuration

Edit `public/webapp_model_config.json` to configure AI models:

```json
{
  "models": {
    "better_model": {
      "modelUrl": "./better_model/model.json",
      "inputShape": [224, 224, 3],
      "imageSize": 224,
      "name": "Better Fruit Classification Model"
    }
  },
  "defaultModel": "better_model",
  "classes": [
    "apple", "banana", "kiwi",
    "mango", "cantaloupe", "orange", "peach", "pear",
    "pitaya", "plum", "pomegranate", "tomato"
  ]
}
```

### Customizing Fruit Types

To add new fruit types:

1. Update the `classes` array in `webapp_model_config.json`
2. Add emoji mappings in `App.js` FRUIT_EMOJIS object
3. Train and deploy updated AI model (optional)

### Threshold Settings

Default stock thresholds can be modified in the `initializeInventory` function in `App.js`.