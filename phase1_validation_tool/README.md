# Phase 1: Offline Validation Tool

## Overview

This tool evaluates the posture detection algorithm's performance on labeled image datasets. It calculates standard machine learning metrics (accuracy, precision, recall, F1-score) and provides detailed analysis of detection performance.

## Features

- **Multiple detection modes**: Basic (side view) and Enhanced (front view)
- **SCI patient support**: Three threshold configurations (Standard, Relaxed, Strict)
- **Comprehensive metrics**: Accuracy, precision, recall, F1-score, confusion matrix
- **Issue analysis**: Identifies common posture problems in dataset
- **Comparison reports**: Compare different detection modes

## Requirements

Install dependencies using:
```bash
pip install -r requirements.txt
```

Required libraries:
- `mediapipe==0.8.9.1` - Pose estimation
- `opencv-python>=4.5.0` - Image processing
- `scikit-learn>=1.0.0` - Performance metrics
- `numpy>=1.21.0` - Numerical computations

## Dataset Structure

Organize your dataset as follows:
```
data/
├── good_posture/
│   ├── 1/              # Sample 1
│   │   ├── 0.jpg
│   │   ├── 1.jpg
│   │   └── ...
│   ├── 2/              # Sample 2
│   └── ...
└── bad_posture/
    ├── 1/
    ├── 2/
    └── ...
```

**Notes:**
- Supports nested folder structure
- Accepts `.jpg`, `.jpeg`, `.png`, `.bmp` formats
- Images should be clear and well-lit
- Person should be fully visible in frame

## Usage

### Basic Evaluation
```bash
# Basic detection mode (side view: neck + torso angles)
python evaluate_dataset.py --basic

# Enhanced detection mode (front view: multiple indicators)
python evaluate_dataset.py --enhanced
```

### SCI Patient Modes
```bash
# Relaxed thresholds (for early rehabilitation/severe patients)
python evaluate_dataset.py --sci-relaxed

# Strict thresholds (for late rehabilitation/mild patients)
python evaluate_dataset.py --sci-strict
```

### Comparison Reports
```bash
# Compare basic vs enhanced detection
python evaluate_dataset.py --compare

# Generate comprehensive report with all modes
python evaluate_dataset.py --comprehensive

# Compare all threshold modes
python evaluate_dataset.py --compare-modes
```

## Output Explanation

### Classification Metrics

```
              precision    recall    f1-score    support
good          0.99         0.96      0.97        347
bad           0.95         0.98      0.96        291
accuracy      0.97                               638
macro avg     0.97         0.97      0.97        638
weighted avg  0.97         0.97      0.97        638
```

- **Precision**: Of all predicted "good" postures, how many were actually good?
- **Recall**: Of all actual "good" postures, how many did we detect?
- **F1-Score**: Harmonic mean of precision and recall
- **Support**: Number of samples in each class

### Confusion Matrix

```
                      Predicted good    Predicted bad
Actual good           333               14
Actual bad            6                 285
```

- **True Positives (TP)**: Correctly identified good postures
- **True Negatives (TN)**: Correctly identified bad postures
- **False Positives (FP)**: Bad postures incorrectly labeled as good
- **False Negatives (FN)**: Good postures incorrectly labeled as bad

### Issue Distribution

Shows the most common posture problems detected:
```
Issue Distribution:
  neck_forward: 245 images
  torso_forward: 189 images
  shoulder_tilt: 67 images
  ...
```

## Algorithm Details

### Basic Detection Mode (Side View)
- **Metrics**: Neck angle, Torso angle
- **Thresholds**: Neck < 40°, Torso < 15°
- **Best for**: Side-view camera setups
- **Accuracy**: ~97% on side-view datasets

### Enhanced Detection Mode (Front View)
- **Metrics**: Shoulder symmetry, Hip alignment, Head tilt, Spinal curvature
- **Scoring**: Weighted progressive scoring system
- **Best for**: Front-view camera setups
- **Accuracy**: ~96% on front-view datasets

### SCI Patient Thresholds

#### Standard Mode (Healthy Individuals)
- Neck: 40°, Torso: 15°
- Shoulder: 30px, Hip: 25px, Head: 25px
- Score threshold: 70%

#### Relaxed Mode (Early Rehabilitation)
- Neck: 50°, Torso: 25°
- Shoulder: 40px, Hip: 35px, Head: 35px
- Score threshold: 60%

#### Strict Mode (Late Rehabilitation)
- Neck: 45°, Torso: 20°
- Shoulder: 35px, Hip: 30px, Head: 30px
- Score threshold: 65%

## Customization

### Modify Thresholds
Edit the `SCI_THRESHOLDS` dictionary in `evaluate_dataset.py`:

```python
SCI_THRESHOLDS = {
    'standard': {
        'neck': 40,
        'torso': 15,
        'shoulder': 30,
        'hip': 25,
        'head': 25,
        'spinal': 20,
        'weighted_score_threshold': 0.70
    },
    # Add custom modes here
}
```

### Change Detection Mode
Modify `CURRENT_THRESHOLD_MODE` variable:
```python
CURRENT_THRESHOLD_MODE = 'standard'  # or 'sciRelaxed', 'sciStrict'
```

### Toggle Scoring System
```python
USE_WEIGHTED_SCORING = True  # True for progressive scoring, False for strict binary
```

## Troubleshooting

### No landmarks detected
- Check image quality and lighting
- Ensure person is fully visible
- Verify camera angle (side view vs front view)

### Low accuracy
- Verify dataset labels are correct
- Ensure consistent camera angle across dataset
- Check if using appropriate mode (side vs front view)
- Consider adjusting thresholds for your specific use case

### Import errors
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version (requires Python 3.7+)

## Performance Tips

- **Large datasets**: Processing time is approximately 0.5-1 second per image
- **Batch processing**: The script processes all images automatically
- **Memory usage**: Minimal, processes one image at a time

## Example Output

```
Dataset Statistics
======================================================================
Good Posture:
  Number of samples (folders): 3
  Total images: 347
  Average per sample: 115.7 images

Bad Posture:
  Number of samples (folders): 2
  Total images: 291
  Average per sample: 145.5 images

Total: 638 images

Starting evaluation...
======================================================================

Processing good posture images (Enhanced mode [standard])...
  Processed 50/347 images...
  Processed 100/347 images...
  ...

📊 Quick Summary:
   Total Samples: 638
   Overall Accuracy: 96.88%
   Good Class: Precision=0.99, Recall=0.96, F1=0.97
   Bad Class: Precision=0.95, Recall=0.98, F1=0.96
   Confusion: TP=333, TN=285, FP=6, FN=14
======================================================================
```

## Notes

- This tool is designed for **offline evaluation** of algorithm performance
- For **real-time monitoring**, use Phase 2 (Web Application)
- Results may vary based on dataset quality and camera setup
- SCI patient modes are optimized for rehabilitation scenarios

## Support

For issues or questions, please refer to the main README.md in the parent directory.

