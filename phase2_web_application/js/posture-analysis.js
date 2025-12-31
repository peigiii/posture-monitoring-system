// ============================================================================
// POSTURE ANALYSIS FUNCTIONS AREA
// ============================================================================
// Contains core analysis functions including view detection, side alignment detection, front posture analysis, etc.
// ============================================================================
// Note: These functions depend on constants and utility functions defined in constants.js and utils.js
// Since HTML uses <script type="text/babel">, these functions will be defined as global functions
// ============================================================================

/**
 * Detect view angle type (side/front/transitioning)
 * @param {Array} landmarks - MediaPipe landmarks array
 * @param {number} canvasWidth - Canvas width
 * @returns {Object} View detection result {mode, confidence, message, type}
 */
function detectViewAngle(landmarks, canvasWidth) {
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    
    if (!isLandmarkValid(lShoulder) || !isLandmarkValid(rShoulder)) {
        return { 
            mode: 'transitioning', 
            confidence: 'low', 
            message: 'Adjusting...',
            type: 'unknown'
        };
    }

    // Calculate shoulder horizontal distance (pixels)
    const lShoulderX = lShoulder.x * canvasWidth;
    const rShoulderX = rShoulder.x * canvasWidth;
    const shoulderDistance = Math.abs(lShoulderX - rShoulderX);
    
    // Judgment logic
    if (shoulderDistance < VIEW_ANGLE_SIDE_THRESHOLD) {
        return {
            mode: 'side',
            confidence: 'high',
            message: 'Side View Mode',
            type: 'side',
            shoulderDistance
        };
    } else if (shoulderDistance > VIEW_ANGLE_FRONT_THRESHOLD) {
        return {
            mode: 'front',
            confidence: 'high',
            message: 'Front View Mode',
            type: 'front',
            shoulderDistance
        };
    } else {
        return {
            mode: 'transitioning',
            confidence: 'low',
            message: 'Adjusting...',
            type: 'unknown',
            shoulderDistance
        };
    }
}

/**
 * Improved weighted scoring system (front view mode)
 * Uses progressive penalty, optimized weights for SCI patients
 * @param {Object} metrics - Detection metrics {shoulderTilt, hipTilt, headTilt}
 * @param {Object} thresholds - Threshold configuration {shoulder, hip, head}
 * @param {boolean} isSCIMode - Whether in SCI mode
 * @returns {Object} Scoring result {score, isGood, breakdown}
 */
function calculatePostureScoreFront(metrics, thresholds, isSCIMode = false) {
    let score = 0.0;
    const breakdown = {};
    
    // Adjust weights based on mode (SCI patients focus more on symmetry and spinal health)
    const weights = isSCIMode ? {
        shoulder: 0.30,      // Shoulder symmetry important for SCI patients
        hip: 0.30,           // Pelvic tilt is key indicator for SCI patients
        head: 0.25,          // Head tilt also important
        spinal: 0.15         // Spinal curvature very important for SCI patients
    } : {
        shoulder: 0.35,
        hip: 0.30,
        head: 0.20,
        spinal: 0.15          // Spinal curvature important for everyone
    };
    
    // If no spinal data, redistribute weights
    const hasSpinalData = metrics.spinalCurvature !== undefined;
    if (!hasSpinalData) {
        // Renormalize weights
        const totalWeight = weights.shoulder + weights.hip + weights.head;
        weights.shoulder = weights.shoulder / totalWeight;
        weights.hip = weights.hip / totalWeight;
        weights.head = weights.head / totalWeight;
        weights.spinal = 0;
    }
    
    // Optimized progressive penalty function (using smoother curve)
    function calculateProgressiveScore(value, threshold, weight) {
        if (value < threshold) {
            // Within threshold: full score, but slight penalty near threshold (encourage better posture)
            const ratio = value / threshold;
            // Use square function for slight penalty near threshold
            const bonus = ratio < 0.7 ? 1.0 : 1.0 - ((ratio - 0.7) / 0.3) * 0.1; // Full score below 70%, slight penalty 70-100%
            return weight * bonus;
        } else {
            // Exceeds threshold: progressive penalty (using exponential decay, smoother)
            const excess = value - threshold;
            const excessRatio = excess / threshold; // Ratio exceeding threshold
            // Use square root function for smoother penalty
            const penaltyRatio = Math.min(Math.sqrt(excessRatio * 2), 1); // Square root decay
            return weight * (1 - penaltyRatio);
        }
    }
    
    // Calculate shoulder score (optimized progressive penalty)
    breakdown.shoulder = calculateProgressiveScore(metrics.shoulderTilt, thresholds.shoulder, weights.shoulder);
    score += breakdown.shoulder;
    
    // Calculate hip score
    breakdown.hip = calculateProgressiveScore(metrics.hipTilt, thresholds.hip, weights.hip);
    score += breakdown.hip;
    
    // Calculate head score
    breakdown.head = calculateProgressiveScore(metrics.headTilt, thresholds.head, weights.head);
    score += breakdown.head;
    
    // Calculate spinal curvature score (using optimized progressive penalty)
    if (hasSpinalData && thresholds.spinal) {
        breakdown.spinal = calculateProgressiveScore(metrics.spinalCurvature, thresholds.spinal, weights.spinal);
        score += breakdown.spinal;
    }
    
    // Get threshold configuration
    const thresholdConfig = getCurrentThresholds();
    const scoreThreshold = thresholdConfig.weightedScoreThreshold;
    
    return {
        score: score,
        isGood: score >= scoreThreshold,
        breakdown: breakdown,
        percentage: Math.round(score * 100)  // Percentage form
    };
}

/**
 * Improved weighted scoring system (side view mode)
 * Combines neck angle and torso angle
 * @param {Object} metrics - Detection metrics {neckAngle, torsoAngle}
 * @param {Object} thresholds - Threshold configuration {neck, torso}
 * @param {boolean} isSCIMode - Whether in SCI mode
 * @returns {Object} Scoring result {score, isGood, breakdown}
 */
function calculatePostureScoreSide(metrics, thresholds, isSCIMode = false) {
    let score = 0.0;
    const breakdown = {};
    
    // Weight configuration
    const weights = isSCIMode ? {
        neck: 0.45,   // Neck problems more common in SCI patients
        torso: 0.55   // Torso angle more important
    } : {
        neck: 0.50,
        torso: 0.50
    };
    
    // Optimized progressive penalty function (angle mode)
    function calculateAngleProgressiveScore(value, threshold, weight) {
        if (value < threshold) {
            // Within threshold: full score, but slight penalty near threshold
            const ratio = value / threshold;
            const bonus = ratio < 0.75 ? 1.0 : 1.0 - ((ratio - 0.75) / 0.25) * 0.15; // Full score below 75%
            return weight * bonus;
        } else {
            // Exceeds threshold: progressive penalty (using smoother curve)
            const excess = value - threshold;
            const excessRatio = excess / threshold;
            // Use square root function for smoother penalty
            const penaltyRatio = Math.min(Math.sqrt(excessRatio * 1.5), 1);
            return weight * (1 - penaltyRatio);
        }
    }
    
    // Calculate neck score (optimized progressive penalty)
    breakdown.neck = calculateAngleProgressiveScore(metrics.neckAngle, thresholds.neck, weights.neck);
    score += breakdown.neck;
    
    // Calculate torso score
    breakdown.torso = calculateAngleProgressiveScore(metrics.torsoAngle, thresholds.torso, weights.torso);
    score += breakdown.torso;
    
    // Get threshold configuration
    const thresholdConfig = getCurrentThresholds();
    // For side view, use stricter scoring threshold (85%) to match Basic mode strictness
    // Evaluation results show: using 85% threshold achieves 96.36% accuracy, close to Basic mode's 96.88%
    const scoreThreshold = isSCIMode ? 0.75 : 0.85;  // SCI mode slightly more lenient (75%), standard mode strict (85%)
    
    return {
        score: score,
        isGood: score >= scoreThreshold,
        breakdown: breakdown,
        percentage: Math.round(score * 100)
    };
}

/**
 * Front view posture analysis
 * Detects shoulder height difference, hip tilt, head tilt and other symmetry issues
 * @param {Array} landmarks - MediaPipe landmarks array
 * @param {number} canvasHeight - Canvas height
 * @param {number} shoulderThreshold - Shoulder height difference threshold (pixels)
 * @param {number} headThreshold - Head height difference threshold (pixels)
 * @returns {Object} Analysis result {shoulderTilt, hipTilt, headTilt, isGoodPosture, issues}
 */
function analyzeFrontPosture(landmarks, canvasHeight, shoulderThreshold = FRONT_SHOULDER_THRESHOLD_DEFAULT, headThreshold = FRONT_HEAD_THRESHOLD_DEFAULT) {
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lHip = landmarks[23]; // LEFT_HIP
    const rHip = landmarks[24]; // RIGHT_HIP
    const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
    const rEar = landmarks[8]; // RIGHT_EAR
    
    if (!isLandmarkValid(lShoulder) || !isLandmarkValid(rShoulder)) {
        return {
            shoulderTilt: 0,
            hipTilt: 0,
            headTilt: 0,
            isGoodPosture: false,
            issues: ['Landmarks unavailable']
        };
    }
    
    const lShoulderY = lShoulder.y * canvasHeight;
    const rShoulderY = rShoulder.y * canvasHeight;
    
    // 1. Shoulder tilt angle (height difference)
    const shoulderTilt = Math.abs(lShoulderY - rShoulderY);
    
    // 2. Hip tilt angle
    let hipTilt = 0;
    if (isLandmarkValid(lHip) && isLandmarkValid(rHip)) {
        const lHipY = lHip.y * canvasHeight;
        const rHipY = rHip.y * canvasHeight;
        hipTilt = Math.abs(lHipY - rHipY);
    }
    
    // 3. Head tilt (using ears)
    let headTilt = 0;
    if (isLandmarkValid(lEar) && isLandmarkValid(rEar)) {
        const lEarY = lEar.y * canvasHeight;
        const rEarY = rEar.y * canvasHeight;
        headTilt = Math.abs(lEarY - rEarY);
    }
    
    // 4. Spinal curvature detection (new: detect spinal lateral curvature)
    let spinalCurvature = 0;
    let spinalDirection = null;
    if (isLandmarkValid(lShoulder) && isLandmarkValid(rShoulder) && 
        isLandmarkValid(lHip) && isLandmarkValid(rHip)) {
        // Calculate midpoint Y coordinates of shoulders and hips
        const shoulderMidY = (lShoulderY + rShoulderY) / 2;
        const hipMidY = (lHip.y * canvasHeight + rHip.y * canvasHeight) / 2;
        
        // Ideally, shoulder midpoint and hip midpoint should be on a vertical line
        // Calculate deviation (spinal curvature)
        spinalCurvature = Math.abs(shoulderMidY - hipMidY);
        spinalDirection = shoulderMidY > hipMidY ? 'forward' : 'backward';
    }
    
    // Get current threshold configuration
    const thresholds = getCurrentThresholds();
    const isSCIMode = currentThresholdMode !== 'standard';
    
    // Use improved weighted scoring system (including spinal curvature)
    const scoreResult = calculatePostureScoreFront({
        shoulderTilt,
        hipTilt,
        headTilt,
        spinalCurvature
    }, {
        shoulder: shoulderThreshold || thresholds.shoulder,
        hip: FRONT_HIP_THRESHOLD || thresholds.hip,
        head: headThreshold || thresholds.head,
        spinal: 20  // Spinal curvature threshold (pixels)
    }, isSCIMode);
    
    // Judgment criteria (using weighted scoring)
    const isGoodPosture = scoreResult.isGood;
    
    const issues = [];
    let shoulderHigher = null; // 'left' or 'right'
    if (shoulderTilt > (shoulderThreshold || thresholds.shoulder)) {
        if (lShoulderY < rShoulderY) {
            issues.push('Left shoulder higher');
            shoulderHigher = 'left';
        } else {
            issues.push('Right shoulder higher');
            shoulderHigher = 'right';
        }
    }
    if (headTilt > (headThreshold || thresholds.head)) {
        issues.push('Head tilted');
    }
    if (hipTilt > (FRONT_HIP_THRESHOLD || thresholds.hip)) {
        issues.push('Hip tilted');
    }
    if (spinalCurvature > 20) {
        issues.push(spinalDirection === 'forward' ? 'Spine forward lean' : 'Spine backward lean');
    }
    
    return {
        shoulderTilt,
        hipTilt,
        headTilt,
        spinalCurvature,      // New: spinal curvature
        spinalDirection,     // New: spinal direction
        isGoodPosture,
        issues,
        shoulderHigher,
        score: scoreResult.score,        // Weighted score
        scoreBreakdown: scoreResult.breakdown,  // Detailed score
        scorePercentage: scoreResult.percentage  // Percentage
    };
}

// Posture suggestion generation function
function generatePostureSuggestions(analysis, viewMode, language = 'en') {
    const suggestions = [];
    
    if (viewMode === 'side' && analysis) {
        const { neckAngle, torsoAngle } = analysis;
        
        // Neck suggestions
        if (neckAngle >= NECK_ANGLE_SEVERE) {
            suggestions.push(language === 'en' ? 
                'Severe neck forward tilt detected. Please adjust your screen height and sit upright.' :
                '严重颈部前倾。请调整屏幕高度，坐直。');
        } else if (neckAngle >= NECK_ANGLE_MODERATE) {
            suggestions.push(language === 'en' ? 
                'Moderate neck forward tilt. Try to keep your head aligned with your spine.' :
                '中度颈部前倾。尽量保持头部与脊柱对齐。');
        } else if (neckAngle >= NECK_ANGLE_MILD) {
            suggestions.push(language === 'en' ? 
                'Slight neck forward tilt. Be mindful of your head position.' :
                '轻微颈部前倾。注意头部位置。');
        }
        
        // Torso suggestions
        if (torsoAngle >= TORSO_ANGLE_SEVERE) {
            suggestions.push(language === 'en' ? 
                'Severe torso forward lean. Sit back in your chair and use back support.' :
                '严重躯干前倾。请靠回椅背，使用背部支撑。');
        } else if (torsoAngle >= TORSO_ANGLE_MODERATE) {
            suggestions.push(language === 'en' ? 
                'Moderate torso forward lean. Adjust your sitting position.' :
                '中度躯干前倾。调整坐姿。');
        } else if (torsoAngle >= TORSO_ANGLE_MILD) {
            suggestions.push(language === 'en' ? 
                'Slight torso forward lean. Try to sit more upright.' :
                '轻微躯干前倾。尝试坐得更直。');
        }
    } else if (viewMode === 'front' && analysis) {
        const { shoulderTilt, headTilt, shoulderHigher } = analysis;
        
        // Shoulder suggestions
        if (shoulderTilt > 0 && shoulderHigher) {
            if (shoulderHigher === 'left') {
                suggestions.push(language === 'en' ? 
                    'Left shoulder is higher. Try to level your shoulders.' :
                    '左肩较高。尝试让肩膀水平。');
            } else {
                suggestions.push(language === 'en' ? 
                    'Right shoulder is higher. Try to level your shoulders.' :
                    '右肩较高。尝试让肩膀水平。');
            }
        }
        
        // Head suggestions
        if (headTilt > 0) {
            suggestions.push(language === 'en' ? 
                'Head is tilted. Keep your head centered and level.' :
                '头部倾斜。保持头部居中和水平。');
        }
    }
    
    return suggestions;
}

// ========== Phase 2 Optimization: Multi-keypoint fusion + High-precision angle calculation ==========
/**
 * Calculate median (resistant to outliers)
 */
function median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].filter(v => !isNaN(v) && v > 0).sort((a, b) => a - b);
    if (sorted.length === 0) return 0;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
}

/**
 * Multi-keypoint fusion angle calculation (improve robustness)
 */
function calculateAngleWithFusion(landmarks, canvasWidth, canvasHeight, angleType) {
    const angles = [];
    
    if (angleType === 'neck') {
        // Method 1: Left shoulder - Left ear
        const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
        if (isLandmarkValid(lShoulder) && isLandmarkValid(lEar)) {
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            const ear = { x: lEar.x * canvasWidth, y: lEar.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            const angle = calculateAnglePrecise(shoulder, ear, ref);
            if (angle > 0) angles.push(angle);
        }
        
        // Method 2: Right shoulder - Right ear (if visible)
        const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
        const rEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
        if (isLandmarkValid(rShoulder) && isLandmarkValid(rEar)) {
            const shoulder = { x: rShoulder.x * canvasWidth, y: rShoulder.y * canvasHeight };
            const ear = { x: rEar.x * canvasWidth, y: rEar.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            const angle = calculateAnglePrecise(shoulder, ear, ref);
            if (angle > 0) angles.push(angle);
        }
        
        // Method 3: Left shoulder - Nose (backup)
        const nose = landmarks[POSE_LANDMARKS.NOSE];
        if (isLandmarkValid(lShoulder) && isLandmarkValid(nose)) {
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            const nosePt = { x: nose.x * canvasWidth, y: nose.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            const angle = calculateAnglePrecise(shoulder, nosePt, ref);
            if (angle > 0) angles.push(angle);
        }
    } else if (angleType === 'torso') {
        // Method 1: Left hip - Left shoulder
        const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
        const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        if (isLandmarkValid(lHip) && isLandmarkValid(lShoulder)) {
            const hip = { x: lHip.x * canvasWidth, y: lHip.y * canvasHeight };
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            if (hip.y > shoulder.y) {
                const ref = { x: hip.x, y: hip.y - 100 };
                const angle = calculateAnglePrecise(hip, shoulder, ref);
                if (angle > 0) angles.push(angle);
            }
        }
        
        // Method 2: Right hip - Right shoulder (if visible)
        const rHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
        const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
        if (isLandmarkValid(rHip) && isLandmarkValid(rShoulder)) {
            const hip = { x: rHip.x * canvasWidth, y: rHip.y * canvasHeight };
            const shoulder = { x: rShoulder.x * canvasWidth, y: rShoulder.y * canvasHeight };
            if (hip.y > shoulder.y) {
                const ref = { x: hip.x, y: hip.y - 100 };
                const angle = calculateAnglePrecise(hip, shoulder, ref);
                if (angle > 0) angles.push(angle);
            }
        }
    }
    
    // Return median (resistant to outliers)
    return median(angles);
}

// ========== Phase 1 Optimization: Side view detection algorithm (using high-precision angle calculation) ==========
function analyzeSidePosture(landmarks, canvasWidth, canvasHeight) {
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    
    // Basic check
    if (!isLandmarkValid(lShoulder) || !isLandmarkValid(lEar) || !isLandmarkValid(lHip)) {
        return {
            neckAngle: 0,
            torsoAngle: 0,
            isGoodPosture: false,
            issues: ['Landmarks unavailable']
        };
    }
    
    // ========== Phase 2: Use multi-keypoint fusion to calculate angles ==========
    let neckAngle = 0;
    let torsoAngle = 0;
    
    try {
        // Multi-keypoint fusion calculation (improve robustness, resistant to outliers)
        neckAngle = calculateAngleWithFusion(landmarks, canvasWidth, canvasHeight, 'neck');
        torsoAngle = calculateAngleWithFusion(landmarks, canvasWidth, canvasHeight, 'torso');
        
        // If fusion fails, fallback to single-point calculation
        if (neckAngle === 0) {
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            const ear = { x: lEar.x * canvasWidth, y: lEar.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            neckAngle = calculateAnglePrecise(shoulder, ear, ref);
        }
        
        if (torsoAngle === 0) {
            const hip = { x: lHip.x * canvasWidth, y: lHip.y * canvasHeight };
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            if (hip.y > shoulder.y) {
                const ref = { x: hip.x, y: hip.y - 100 };
                torsoAngle = calculateAnglePrecise(hip, shoulder, ref);
            }
        }
    } catch (error) {
        console.warn('Angle calculation failed', error);
    }
    
    // Get current threshold configuration (using SCI threshold system)
    const thresholds = getCurrentThresholds();
    const isSCIMode = currentThresholdMode !== 'standard';
    
    // Use improved weighted scoring system (instead of simple threshold judgment)
    const scoreResult = calculatePostureScoreSide({
        neckAngle,
        torsoAngle
    }, {
        neck: thresholds.neck,
        torso: thresholds.torso
    }, isSCIMode);
    
    // Judgment criteria (using weighted scoring)
    const isGoodPosture = scoreResult.isGood;
    
    const issues = [];
    if (neckAngle >= thresholds.neck) {
        issues.push('Neck forward tilt');
    }
    if (torsoAngle >= thresholds.torso) {
        issues.push('Torso forward lean');
    }
    
    return {
        neckAngle,
        torsoAngle,
        isGoodPosture,
        issues,
        score: scoreResult.score,        // Weighted score
        scoreBreakdown: scoreResult.breakdown,  // Detailed score
        scorePercentage: scoreResult.percentage  // Percentage
    };
}

// Export all functions to global scope
window.detectViewAngle = detectViewAngle;
window.calculatePostureScoreFront = calculatePostureScoreFront;
window.calculatePostureScoreSide = calculatePostureScoreSide;
window.analyzeFrontPosture = analyzeFrontPosture;
window.detectViewAngle = detectViewAngle;
window.generatePostureSuggestions = generatePostureSuggestions;
window.median = median;
window.calculateAngleWithFusion = calculateAngleWithFusion;
window.analyzeSidePosture = analyzeSidePosture;
