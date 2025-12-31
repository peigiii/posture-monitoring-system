// ============================================================================
// CONSTANTS DEFINITION AREA
// ============================================================================
// Defines all constants used in the system, including landmark indices, colors, thresholds, etc.
// ============================================================================

const POSE_LANDMARKS = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    NOSE: 0,
    LEFT_EYE: 2,
    RIGHT_EYE: 5
};

// Colors (BGR to RGB conversion from Python)
const COLORS = {
    blue: 'rgb(255, 127, 0)',
    red: 'rgb(50, 50, 255)',
    green: 'rgb(127, 255, 0)',
    lightGreen: 'rgb(127, 233, 100)',
    yellow: 'rgb(0, 255, 255)',
    pink: 'rgb(255, 0, 255)'
};

const FPS = 30;
const ALIGNMENT_THRESHOLD = 250; // Relaxed threshold, changed from 100 to 250
const ALIGNMENT_THRESHOLD_PERFECT = 150; // Perfect alignment threshold
const DEFAULT_NECK_THRESHOLD = 40;
const DEFAULT_TORSO_THRESHOLD = 15; // Updated to 15°, more reasonable default value
const WARNING_TIME = 180; // 3 minutes
const MIN_LANDMARK_VISIBILITY = 0.5; // Minimum landmark confidence
const DEPTH_DIFF_THRESHOLD = 0.1; // Depth difference threshold (for view detection)

// View angle detection thresholds (pixels)
const VIEW_ANGLE_SIDE_THRESHOLD = 80;      // Side view threshold (shoulder distance < 80px)
const VIEW_ANGLE_FRONT_THRESHOLD = 150;    // Front view threshold (shoulder distance > 150px)

// Front view detection thresholds (pixels) - synchronized with evaluation script
const FRONT_SHOULDER_THRESHOLD_DEFAULT = 30;  // Default shoulder height difference threshold (adjusted from 50 to 30, synchronized with evaluation script)
const FRONT_HEAD_THRESHOLD_DEFAULT = 25;      // Default head height difference threshold (adjusted from 40 to 25, synchronized with evaluation script)
const FRONT_HIP_THRESHOLD = 25;                // Hip height difference threshold (adjusted from 15 to 25, synchronized with evaluation script)

// Angle judgment thresholds (degrees)
const NECK_ANGLE_SEVERE = 50;      // Severe neck forward tilt
const NECK_ANGLE_MODERATE = 40;    // Moderate neck forward tilt
const NECK_ANGLE_MILD = 30;        // Mild neck forward tilt
const TORSO_ANGLE_SEVERE = 15;     // Severe torso forward tilt
const TORSO_ANGLE_MODERATE = 10;   // Moderate torso forward tilt
const TORSO_ANGLE_MILD = 5;        // Mild torso forward tilt

// Smoothing and hysteresis settings
const SMOOTHING_WINDOW_SIZE = 10;  // Angle smoothing window size (frames)
const HYSTERESIS_VALUE = 2;         // Hysteresis threshold (degrees)

// Reference point offset (pixels)
const REFERENCE_POINT_OFFSET = 100; // Vertical reference point offset (for angle calculation)

// ============================================================================
// SCI PATIENT THRESHOLD CONFIGURATION SYSTEM
// ============================================================================
const SCI_THRESHOLDS = {
    // Standard mode (healthy individuals)
    standard: {
        neck: 40,
        torso: 15,
        shoulder: 30,
        hip: 25,
        head: 25,
        weightedScoreThreshold: 0.70  // 70% or above is good
    },
    // SCI relaxed mode (early rehabilitation/severe patients)
    sciRelaxed: {
        neck: 50,      // +10°
        torso: 25,     // +10°
        shoulder: 40,  // +10px
        hip: 35,       // +10px
        head: 35,      // +10px
        weightedScoreThreshold: 0.60  // 60% or above is good (more lenient)
    },
    // SCI strict mode (late rehabilitation/mild patients)
    sciStrict: {
        neck: 45,      // +5°
        torso: 20,     // +5°
        shoulder: 35,  // +5px
        hip: 30,       // +5px
        head: 30,      // +5px
        weightedScoreThreshold: 0.65  // 65% or above is good
    }
};

// Current threshold mode in use (can be loaded from localStorage for user settings)
let currentThresholdMode = 'standard'; // 'standard' | 'sciRelaxed' | 'sciStrict'

/**
 * Get current mode's threshold configuration
 */
function getCurrentThresholds() {
    return SCI_THRESHOLDS[currentThresholdMode] || SCI_THRESHOLDS.standard;
}

/**
 * Set threshold mode (enhanced version: supports React state updates)
 */
function setThresholdMode(mode, updateStateCallback = null) {
    if (SCI_THRESHOLDS[mode]) {
        currentThresholdMode = mode;
        // Save to localStorage
        try {
            localStorage.setItem('postureThresholdMode', mode);
        } catch (e) {
            console.warn('Unable to save threshold mode setting:', e);
        }
        // If state update callback is provided, call it
        if (updateStateCallback && typeof updateStateCallback === 'function') {
            updateStateCallback(mode);
        }
    }
}

// Load threshold mode from localStorage
try {
    const savedMode = localStorage.getItem('postureThresholdMode');
    if (savedMode && SCI_THRESHOLDS[savedMode]) {
        currentThresholdMode = savedMode;
    }
} catch (e) {
    console.warn('Unable to load threshold mode setting:', e);
}

// Export functions to global scope
window.getCurrentThresholds = getCurrentThresholds;
window.setThresholdMode = setThresholdMode;

