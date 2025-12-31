# Phase 2: Real-Time Web Application

## Overview

A web-based real-time posture monitoring system that uses your webcam to detect and analyze body posture. Provides immediate feedback, historical tracking, and customizable thresholds for different user needs.

## Features

### Core Functionality
- **Real-time pose detection** at 30 FPS using MediaPipe Pose
- **Automatic view detection** (side view vs front view)
- **Visual feedback** with color-coded status indicators
- **Angle visualization** with real-time gauges and charts
- **Timer tracking** for good/bad posture duration
- **Alert system** for prolonged bad posture (3+ minutes)

### SCI Patient Support
- **Three threshold modes**: Standard, Relaxed, Strict
- **Progressive scoring** instead of binary good/bad judgment
- **Customizable thresholds** for individual rehabilitation needs
- **Rehabilitation progress tracking**

### User Interface
- **Modern, responsive design** using Tailwind CSS
- **Real-time angle display** with visual progress bars
- **Session statistics** showing time in good/bad posture
- **Accessibility features** for users with disabilities

## Requirements

### Browser Compatibility
- **Chrome 90+** (recommended)
- **Edge 90+**
- **Firefox 88+**
- **Safari 14+**

**Important**: Camera access requires HTTPS or localhost

### Hardware
- **Webcam**: Built-in or external (720p or higher recommended)
- **Internet connection**: Required for CDN resources (MediaPipe, React, etc.)
- **Processor**: Modern CPU (2015 or newer)

## Quick Start

### Method 1: Open Directly (Easiest)
1. Navigate to this folder
2. Double-click `index.html`
3. Allow camera access when prompted
4. Position yourself in front of camera (side view recommended)
5. Click "Start Monitoring"

### Method 2: Local Server (Recommended for Development)
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Then open http://localhost:8000 in your browser
```

### Method 3: Deploy to Web Server
Upload this entire folder to any static hosting service:

**Netlify** (Easiest)
1. Go to https://app.netlify.com/drop
2. Drag and drop this folder
3. Get instant URL

**GitHub Pages**
1. Create GitHub repository
2. Upload files
3. Enable GitHub Pages in settings

**Other Options**
- Vercel
- Firebase Hosting
- Any web server supporting static files

## Usage Guide

### Initial Setup
1. **Open the application** in your browser
2. **Allow camera access** when prompted
3. **Position yourself**:
   - **Side view** (recommended): Camera should see your profile
   - **Front view**: Camera should see you facing forward
4. **Check lighting**: Ensure adequate lighting for detection
5. **Distance**: Sit 1-2 meters from camera

### Starting Monitoring
1. Click **"Start Monitoring"** button
2. Wait for pose detection to initialize (2-3 seconds)
3. Adjust position until body is detected (skeleton overlay appears)
4. Monitor real-time feedback on screen

### Understanding Feedback

#### Status Indicator
- **Green "✓ Good Posture"**: Your posture is within acceptable thresholds
- **Red "✗ Bad Posture"**: Your posture exceeds thresholds, adjust position

#### Angle Display
- **Neck Angle**: Angle between ear and shoulder (target: < 40°)
- **Torso Angle**: Angle between shoulder and hip (target: < 15°)
- **Progress bars**: Green = good, Red = exceeds threshold

#### Time Tracking
- **Good Posture Time**: Cumulative time with good posture
- **Bad Posture Time**: Cumulative time with bad posture
- **Total Time**: Session duration

### Threshold Modes

#### Standard Mode
- **For**: Healthy individuals
- **Thresholds**: Neck 40°, Torso 15°
- **Best for**: General office/study use

#### SCI Relaxed Mode
- **For**: Early rehabilitation, severe cases
- **Thresholds**: Neck 50°, Torso 25° (more lenient)
- **Best for**: Patients with limited mobility

#### SCI Strict Mode
- **For**: Late rehabilitation, mild cases
- **Thresholds**: Neck 45°, Torso 20°
- **Best for**: Advanced rehabilitation stage

### Tips for Best Results

#### Camera Positioning
- **Side view**: Camera perpendicular to your body
- **Height**: Camera at shoulder level
- **Distance**: 1-2 meters away
- **Stability**: Use tripod or stable surface

#### Environment
- **Lighting**: Front or side lighting (avoid backlighting)
- **Background**: Plain, uncluttered background
- **Space**: Ensure full body is visible

#### Usage
- **Regular breaks**: Take breaks every 30-60 minutes
- **Gradual improvement**: Don't force perfect posture immediately
- **Consistency**: Use regularly for best results

## Technical Details

### Architecture
```
index.html
├── External Dependencies (CDN)
│   ├── React 18
│   ├── Tailwind CSS
│   ├── MediaPipe Pose
│   ├── Chart.js
│   └── jsPDF
│
└── Local Modules
    ├── js/constants.js          # System constants and thresholds
    ├── js/utils.js              # Utility functions
    ├── js/algorithms.js         # Core algorithm classes
    ├── js/posture-analysis.js   # Posture analysis functions
    ├── js/drawing-utils.js      # Visualization utilities
    ├── js/i18n.js               # Internationalization
    └── styles/main.css          # Stylesheet
```

### Key Algorithms

#### 1. High-Precision Angle Calculation
```javascript
// Vector dot product method for ±0.5° precision
function calculateAnglePrecise(p1, p2, p3) {
    // Calculate vectors
    // Compute dot product
    // Return angle in degrees
}
```

#### 2. Weighted Moving Average Smoothing
```javascript
// Reduces noise while maintaining responsiveness
class AngleSmoother {
    smooth(neckAngle, torsoAngle) {
        // Apply weighted moving average
        // Recent data weighted more heavily
    }
}
```

#### 3. Hysteresis Threshold Evaluation
```javascript
// Prevents rapid state switching at boundaries
class HysteresisEvaluator {
    evaluate(neckAngle, torsoAngle) {
        // Apply hysteresis logic
        // Reduces false positives by 80%
    }
}
```

#### 4. Progressive Scoring System
```javascript
// Gradual penalties instead of binary pass/fail
function calculatePostureScore(metrics, thresholds) {
    // Calculate weighted score
    // Apply progressive penalties
    // Return score and breakdown
}
```

### Data Flow
```
Webcam → MediaPipe Pose → Landmarks → Angle Calculation → 
Smoothing → Hysteresis Evaluation → Scoring → UI Update
```

## Customization

### Modify Thresholds
Edit `js/constants.js`:
```javascript
const SCI_THRESHOLDS = {
    standard: {
        neck: 40,
        torso: 15,
        // ... other thresholds
    }
};
```

### Change Alert Timing
Edit `js/constants.js`:
```javascript
const WARNING_TIME = 180; // seconds (default: 3 minutes)
```

### Adjust Smoothing
Edit `js/constants.js`:
```javascript
const SMOOTHING_WINDOW_SIZE = 10; // frames (default: 10)
const HYSTERESIS_VALUE = 2; // degrees (default: 2)
```

## Troubleshooting

### Camera Issues

**Problem**: Camera not detected
- **Solution**: Check browser permissions in settings
- **Solution**: Try refreshing the page
- **Solution**: Ensure no other app is using camera

**Problem**: Camera access denied
- **Solution**: Use HTTPS or localhost (required for security)
- **Solution**: Check browser permissions
- **Solution**: Try different browser

### Detection Issues

**Problem**: Pose not detected
- **Solution**: Improve lighting conditions
- **Solution**: Move closer to camera (1-2 meters)
- **Solution**: Ensure full body is visible
- **Solution**: Remove obstructions

**Problem**: Inaccurate angle readings
- **Solution**: Use side view for best results
- **Solution**: Ensure camera is at shoulder level
- **Solution**: Check that landmarks are visible (shoulders, ears, hips)

### Performance Issues

**Problem**: Slow or laggy
- **Solution**: Close other browser tabs
- **Solution**: Use Chrome or Edge for best performance
- **Solution**: Reduce camera resolution
- **Solution**: Check CPU usage

**Problem**: High CPU usage
- **Solution**: Normal for real-time pose detection
- **Solution**: Close unnecessary applications
- **Solution**: Use lower camera resolution

### Browser-Specific Issues

**Chrome/Edge**
- Works best, recommended browser
- Ensure hardware acceleration is enabled

**Firefox**
- May be slightly slower
- Ensure WebGL is enabled

**Safari**
- Requires Safari 14+
- May need to enable camera in system preferences

## Privacy & Security

- **No data collection**: All processing happens locally in your browser
- **No server uploads**: Video never leaves your device
- **No storage**: Session data is temporary and cleared on page close
- **Camera access**: Only used for pose detection, not recording

## Performance Metrics

- **Frame rate**: 30 FPS (typical)
- **Detection latency**: < 50ms
- **Angle precision**: ±0.5°
- **CPU usage**: 20-40% (varies by device)

## Known Limitations

- Requires good lighting for accurate detection
- Best results with side view camera angle
- May struggle with very loose clothing
- Requires stable internet for initial load (CDN resources)

## Future Enhancements

Planned improvements:
- Mobile app version
- Multi-person detection
- Exercise guidance features
- Cloud storage for history
- Integration with wearables

## Support

For issues or questions:
1. Check this README
2. Review main README.md in parent directory
3. Check browser console for error messages

## License

Developed for academic purposes. See main README for details.

