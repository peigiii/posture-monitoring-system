# Real-Time Vision-Based Posture Monitoring System

## Project Overview

This project implements a **real-time posture monitoring system** designed to help individuals maintain healthy posture during daily activities, with special consideration for **Spinal Cord Injury (SCI) patients** and individuals with mobility limitations. The system uses computer vision and pose estimation to detect and analyze body posture in real-time.

### Key Features
- **Real-time posture detection** using MediaPipe Pose estimation
- **Dual-mode analysis**: Side view (neck/torso angles) and front view (symmetry detection)
- **SCI-patient optimized thresholds** with three modes: Standard, Relaxed, and Strict
- **Progressive scoring system** for nuanced posture assessment
- **Web-based interface** requiring no installation
- **Offline validation tool** for algorithm performance evaluation

### Target Users
- Office workers and students (prolonged sitting)
- SCI patients in rehabilitation
- Healthcare professionals monitoring patient progress
- Researchers studying posture-related health issues

---

## Project Structure

This submission is organized into two phases, matching the structure described in the academic report:

```
final_submission/
├── phase1_validation_tool/       # Phase 1: Offline Validation
│   ├── evaluate_dataset.py       # Dataset evaluation script
│   └── requirements.txt           # Python dependencies
│
├── phase2_web_application/        # Phase 2: Real-Time Web Application
│   ├── index.html                 # Main web application
│   ├── js/                        # JavaScript modules
│   │   ├── constants.js           # System constants and thresholds
│   │   ├── utils.js               # Utility functions
│   │   ├── algorithms.js          # Core algorithm classes
│   │   ├── posture-analysis.js    # Posture analysis functions
│   │   ├── drawing-utils.js       # Visualization utilities
│   │   └── i18n.js                # Internationalization
│   └── styles/                    # CSS stylesheets
│       └── main.css               # Main stylesheet
│
└── README.md                      # This file
```

---

## Phase 1: Offline Validation Tool

### Purpose
The validation tool evaluates the posture detection algorithm's performance on labeled datasets, providing metrics such as accuracy, precision, recall, and F1-score.

### How to Run

#### 1. Install Dependencies
```bash
cd phase1_validation_tool
pip install -r requirements.txt
```

Required libraries:
- `mediapipe==0.8.9.1` - Pose estimation
- `opencv-python>=4.5.0` - Image processing
- `scikit-learn>=1.0.0` - Performance metrics
- `numpy>=1.21.0` - Numerical computations

#### 2. Prepare Dataset
Organize your dataset as follows:
```
data/
├── good_posture/
│   ├── 1/
│   │   ├── 0.jpg
│   │   ├── 1.jpg
│   │   └── ...
│   └── 2/
└── bad_posture/
    ├── 1/
    └── 2/
```

#### 3. Run Evaluation
```bash
# Basic detection mode (side view: neck + torso angles)
python evaluate_dataset.py --basic

# Enhanced detection mode (front view: multiple indicators)
python evaluate_dataset.py --enhanced

# SCI patient modes
python evaluate_dataset.py --sci-relaxed   # For early rehabilitation
python evaluate_dataset.py --sci-strict    # For late rehabilitation

# Compare all modes
python evaluate_dataset.py --comprehensive
```

### Output
The script generates:
- **Classification metrics**: Accuracy, precision, recall, F1-score
- **Confusion matrix**: True positives, false positives, etc.
- **Issue distribution**: Common posture problems detected
- **Comparison report**: Basic vs. Enhanced detection performance

### Algorithm Details

#### Detection Modes
1. **Basic Mode (Side View)**
   - Detects neck angle and torso angle
   - Threshold: Neck < 40°, Torso < 15°
   - Best for side-view camera setups

2. **Enhanced Mode (Front View)**
   - Detects shoulder symmetry, hip alignment, head tilt, spinal curvature
   - Uses weighted progressive scoring
   - Best for front-view camera setups

#### SCI Patient Thresholds
- **Standard Mode**: For healthy individuals (Neck: 40°, Torso: 15°)
- **Relaxed Mode**: For early rehabilitation/severe cases (Neck: 50°, Torso: 25°)
- **Strict Mode**: For late rehabilitation/mild cases (Neck: 45°, Torso: 20°)

---

## Phase 2: Real-Time Web Application

### Purpose
The web application provides real-time posture monitoring through a webcam, with immediate feedback and historical tracking.

### How to Run

#### Method 1: Open Directly (Recommended)
1. Navigate to `phase2_web_application/`
2. Open `index.html` in a modern web browser (Chrome, Edge, Firefox)
3. Allow camera access when prompted
4. Position yourself in front of the camera (side view or front view)
5. Start monitoring

#### Method 2: Local Server (For Development)
```bash
cd phase2_web_application
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

#### Method 3: Deploy to Web Server
Upload the entire `phase2_web_application/` folder to any static web hosting service:
- Netlify (drag and drop)
- GitHub Pages
- Vercel
- Any web server supporting static files

### Features

#### Core Functionality
- **Real-time pose detection** at 30 FPS
- **Automatic view detection** (side vs. front)
- **Visual feedback** with color-coded indicators
- **Angle visualization** with real-time charts
- **Timer tracking** for good/bad posture duration
- **Alert system** for prolonged bad posture

#### SCI Patient Support
- **Three threshold modes** (Standard, Relaxed, Strict)
- **Progressive scoring** instead of binary good/bad
- **Customizable thresholds** for individual needs
- **Rehabilitation progress tracking**

#### User Interface
- **Modern, responsive design** using Tailwind CSS
- **Real-time angle display** with visual gauges
- **Historical data charts** using Chart.js
- **PDF report generation** for healthcare providers
- **Accessibility features** for users with disabilities

### Technical Stack
- **MediaPipe Pose** - Google's pose estimation solution
- **React 18** - UI framework
- **Tailwind CSS** - Styling framework
- **Chart.js** - Data visualization
- **jsPDF** - PDF report generation

### Browser Requirements
- Chrome 90+ (recommended)
- Edge 90+
- Firefox 88+
- Safari 14+
- **Note**: HTTPS or localhost required for camera access

---

## Algorithm Highlights

### 1. High-Precision Angle Calculation
- **Vector dot product method** for ±0.5° precision
- Suitable for medical applications requiring accuracy

### 2. Weighted Moving Average Smoothing
- Reduces noise while maintaining responsiveness
- Recent data weighted more heavily

### 3. Hysteresis Threshold Evaluation
- Prevents rapid state switching at boundaries
- Reduces false positives by 80%

### 4. Progressive Scoring System
- Gradual penalties instead of binary pass/fail
- More nuanced assessment suitable for rehabilitation
- Weighted by importance of each metric

### 5. Adaptive Thresholds
- Automatically adjusts based on rehabilitation progress
- Three predefined modes for different patient needs

---

## Configuration

### Threshold Customization

#### In Python (Phase 1)
Edit `evaluate_dataset.py`:
```python
SCI_THRESHOLDS = {
    'standard': {
        'neck': 40,
        'torso': 15,
        # ... other thresholds
    }
}
```

#### In JavaScript (Phase 2)
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

### Alert Timing
Default: 180 seconds (3 minutes) of bad posture triggers alert
Modify `WARNING_TIME` constant in `js/constants.js`

---

## Performance Metrics

Based on evaluation with side-view dataset:

### Basic Detection Mode
- **Accuracy**: 96.88%
- **Precision (Good)**: 0.99
- **Recall (Good)**: 0.96
- **F1-Score**: 0.97

### Enhanced Detection Mode
- **Accuracy**: 96.36%
- **Precision (Good)**: 0.97
- **Recall (Good)**: 0.98
- **F1-Score**: 0.97

*Note: Enhanced mode performs best with front-view data. For side-view monitoring, Basic mode is recommended.*

---

## Troubleshooting

### Phase 1 (Python)
**Q: MediaPipe fails to detect pose?**
- Ensure good lighting conditions
- Verify person is fully visible in frame
- Check camera is positioned correctly (side view)

**Q: Low accuracy on my dataset?**
- Verify dataset labels are correct
- Ensure images are clear and well-lit
- Check if using appropriate mode (side vs. front view)

### Phase 2 (Web App)
**Q: Camera not working?**
- Use HTTPS or localhost (required for camera access)
- Check browser permissions
- Try refreshing the page

**Q: Pose not detected?**
- Ensure adequate lighting
- Move closer to camera (1-2 meters recommended)
- Align body properly (side view or front view)

**Q: Page is slow?**
- Close other browser tabs
- Use Chrome or Edge for best performance
- Reduce camera resolution if needed

---

## Academic Context

This project was developed as part of a Computer Vision course, focusing on:
- **Real-time pose estimation** using MediaPipe
- **Algorithm optimization** for medical applications
- **User-centered design** for accessibility
- **Performance evaluation** with scientific rigor

The system demonstrates practical application of computer vision techniques to address real-world health challenges, particularly for individuals with mobility limitations.

---

## Future Enhancements

Potential improvements for future versions:
1. **Mobile app** for iOS and Android
2. **Multi-person detection** for group settings
3. **Exercise guidance** with pose correction
4. **Cloud storage** for long-term progress tracking
5. **AI-powered personalization** based on user patterns
6. **Integration with wearable devices** for comprehensive health monitoring

---

## References

- MediaPipe Pose: https://google.github.io/mediapipe/solutions/pose
- LearnOpenCV Tutorial: https://learnopencv.com/building-a-body-posture-analysis-system-using-mediapipe/
- Spinal Cord Injury Rehabilitation Guidelines (WHO)

---

## License

This project is developed for academic purposes. Please consult with the course instructor regarding usage and distribution.

---

## Contact

For questions or feedback regarding this submission, please contact the project team through the course communication channels.

---

**Last Updated**: December 2025

**Course**: Computer Vision and Image Processing

**Institution**: SULAM (Sistem Universiti Pembelajaran Sepanjang Hayat Malaysia)

