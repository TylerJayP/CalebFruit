# 🍎 Smart Fruit Bowl

**AI-Powered Inventory Management System**

> A modern React application that uses artificial intelligence to detect, track, and manage fruit inventory through real-time camera feeds. Features intelligent recipe suggestions, automated shopping lists, and a comprehensive developer toolkit.

![Features](https://img.shields.io/badge/Features-AI%20Detection%20%7C%20Smart%20Inventory%20%7C%20Recipe%20Intelligence-brightgreen)

## ✨ Key Features

### AI-Powered Detection
- **Real-time fruit recognition** using TensorFlow.js machine learning models
- **Automatic inventory updates** based on AI detections with confidence scoring
- **Configurable AI models** with simulation mode for development and testing
- **12+ fruit classifications**: Apple, Banana, Kiwi, Mango, Cantaloupe, Orange, Peach, Pear, Pitaya, Plum, Pomegranate, Tomato

### Smart Inventory Management
- **Visual fruit cards** with emoji representations and real-time counts
- **Intelligent low stock alerts** with customizable threshold monitoring
- **Comprehensive inventory statistics** (total items, low stock, out of stock)
- **Real-time updates** with smooth animations and visual feedback

### Recipe Intelligence
- **10+ built-in smoothie recipes** using available fruits
- **Smart recipe filtering** based on current inventory levels
- **"Ready to Make" vs "Need Ingredients"** categorization with visual indicators
- **Recipe export functionality** for external use and sharing

### Automated Shopping Lists
- **Smart shopping list generation** based on low stock items
- **Recipe-based shopping lists** for missing ingredients
- **Exportable text files** with timestamps and organized formatting
- **Quantity suggestions** based on consumption patterns and thresholds

### Developer Mode
- **Manual inventory adjustment** with intuitive +/- buttons
- **Quick inventory presets** (Demo Mode, Set All to 5, Reset All)
- **Real-time debugging console** with detailed logging and status tracking
- **Developer-friendly controls** for testing, debugging, and demonstration

## Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** (version 14.0.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (version 6.0.0 or higher) or **yarn**
- **Modern web browser** with camera access support (Chrome, Firefox, Safari, Edge)
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

3. **Set up AI model files** (optional for custom models)
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
2. **Grant Permissions**: Allow camera access when prompted by your browser
3. **Enable Developer Mode**: Toggle the "Developer Mode" button for manual controls and debugging
4. **Add Fruits**: Use AI camera detection or manual +/- buttons to manage inventory
5. **Explore Recipes**: Check the "Recipes" section for available smoothie suggestions
6. **Generate Shopping Lists**: Use the "Shopping List" section for automated list creation

### Camera Detection

- **Position fruits clearly** in front of the camera with good lighting
- **Wait for high confidence scores** (>75%) for automatic inventory updates
- **Monitor detection status** through real-time status displays
- **Use simulation mode** when no camera is available for testing

### Developer Mode Features

#### Quick Actions
- **Set Demo Inventory**: Loads realistic test data for demonstration
- **Set All Fruits to 5**: Sets uniform quantities for testing scenarios
- **Reset All to 0**: Clears all inventory for fresh start

#### Manual Controls
- **Individual +/- buttons** for precise inventory adjustment
- **Real-time count updates** with instant visual feedback
- **Smart controls** that prevent negative quantities

### Recipe System

#### Ready to Make Recipes
- **Green highlighting** for recipes you can make with current inventory
- **One-click recipe viewing** with detailed instructions
- **Ingredient availability** clearly marked

#### Need Ingredients Recipes
- **Missing ingredients highlighted in red** for easy identification
- **Available ingredients shown in green** for partial recipe completion
- **Export shopping lists** for missing items with one click

## Project Structure

```
smart-fruit-bowl/
├── public/
│   ├── index.html                    # Main HTML template
│   ├── webapp_model_config.json      # AI model configuration
│   ├── manifest.json                 # PWA manifest
│   └── better_model/                 # TensorFlow.js model files
│       ├── model.json               # Model architecture
│       └── model_weights.bin        # Trained weights
├── src/
│   ├── components/                   # React components
│   │   ├── CameraSection.js         # AI detection & camera controls
│   │   ├── InventorySection.js      # Inventory management & display
│   │   ├── GrocerySection.js        # Shopping list generation
│   │   ├── RecipeSection.js         # Recipe suggestions & filtering
│   │   └── StatusDisplay.js         # Real-time status indicators
│   ├── App.js                       # Main application component
│   ├── App.css                      # Comprehensive styling & animations
│   ├── index.js                     # React DOM entry point
│   └── index.css                    # Global styles & variables
├── package.json                     # Dependencies and build scripts
├── .gitignore                       # Git ignore patterns
└── README.md                        # This documentation
```

## Technology Stack

### Frontend Framework
- **React 18.x** - Modern React with hooks and functional components
- **JavaScript ES6+** - Modern JavaScript features, async/await, modules

### AI & Machine Learning
- **TensorFlow.js** - Client-side machine learning for fruit detection
- **Custom AI Models** - Trained fruit classification models with 224x224 input
- **Real-time Processing** - Live camera feed analysis with confidence scoring

### Styling & UI
- **CSS3** - Modern styling with gradients, animations, and layouts
- **CSS Grid & Flexbox** - Responsive layout systems for all screen sizes
- **CSS Animations** - Smooth transitions, hover effects, and loading states
- **Custom Design System** - Consistent colors, typography, and spacing

### Browser APIs
- **MediaDevices API** - Camera access and video streaming
- **Canvas API** - Image processing and frame capture
- **File API** - Shopping list export and download functionality

### Development Tools
- **Create React App** - Build tooling and development server
- **npm/yarn** - Package management and script execution

## Available Scripts

### Development
```bash
npm start          # Start development server on http://localhost:3000
npm run build      # Create optimized production build in build/ folder
npm test           # Run test suite in interactive watch mode
npm run eject      # Eject from Create React App (one-way operation)
```

### Production
```bash
npm run build      # Build for production with optimizations
npm run serve      # Serve production build locally for testing
```

## Configuration

### AI Model Configuration

Edit `public/webapp_model_config.json` to configure AI detection:

```json
{
  "models": {
    "trained_model": {
      "modelUrl": "./models/model.json",
      "inputShape": [64, 64, 3],
      "imageSize": 64,
      "name": "Our own trained model"
    }
  },
  "defaultModel": "trained_model",
  "classes": [
    "apple", "banana", "orange", "background"
  ]
}
```

### Customizing Fruit Types

To add new fruit types:

1. **Update the classes array** in `webapp_model_config.json`
2. **Add emoji mappings** in `App.js` FRUIT_EMOJIS object
3. **Train and deploy updated AI model** (optional)
4. **Update recipe ingredients** as needed

### Inventory Thresholds

Customize low stock thresholds in `App.js`:

```javascript
const initializeInventory = () => {
  const fruits = ['apple', 'banana', 'orange', /* ... */];
  return fruits.reduce((acc, fruit) => {
    acc[fruit] = {
      count: 0,
      lowStockThreshold: 2 // Customize this value
    };
    return acc;
  }, {});
};
```

## 🌐 Browser Compatibility

| Browser | Version | Camera Support | AI Detection | Notes |
|---------|---------|----------------|--------------|-------|
| Chrome | 90+ | ✅ | ✅ | Recommended for best performance |
| Firefox | 88+ | ✅ | ✅ | Excellent compatibility |
| Safari | 14+ | ✅ | ✅ | iOS Safari requires HTTPS |
| Edge | 90+ | ✅ | ✅ | Full feature support |

**Requirements:**
- JavaScript enabled
- Camera permissions granted
- HTTPS for camera access (production)
- WebGL support for TensorFlow.js

## 🚀 Deployment

### Production Build

```bash
# Create optimized production build
npm run build

# The build folder contains:
# - Minified JavaScript and CSS
# - Optimized images and assets
# - Service worker for caching
```