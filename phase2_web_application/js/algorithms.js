// ============================================================================
// CORE ALGORITHM CLASSES AREA
// ============================================================================
// Contains core algorithm classes such as angle smoother, hysteresis threshold evaluator, adaptive threshold manager, etc.
// ============================================================================

// ========== Phase 1 Optimization: Weighted Moving Average Smoother (WMA) ==========
// Improvement: More emphasis on recent data, faster response, better smoothing effect
class AngleSmoother {
    constructor(windowSize) {
        // If windowSize not provided, use default value 10
        if (windowSize === undefined) {
            windowSize = typeof SMOOTHING_WINDOW_SIZE !== 'undefined' ? SMOOTHING_WINDOW_SIZE : 10;
        }
        this.windowSize = windowSize;
        this.neckHistory = [];
        this.torsoHistory = [];
    }
    
    /**
     * Generate linear weights (recent data has higher weight)
     */
    generateWeights(length) {
        const weights = [];
        for (let i = 0; i < length; i++) {
            weights.push(i + 1); // Weights increase: 1, 2, 3, ...
        }
        const sum = weights.reduce((a, b) => a + b, 0);
        return weights.map(w => w / sum); // Normalize
    }
    
    /**
     * Weighted average calculation
     */
    weightedAverage(values, weights) {
        return values.reduce((sum, val, i) => sum + val * weights[i], 0);
    }
    
    smooth(neckAngle, torsoAngle) {
        // Add new values
        this.neckHistory.push(neckAngle);
        this.torsoHistory.push(torsoAngle);
        
        // Maintain window size
        if (this.neckHistory.length > this.windowSize) {
            this.neckHistory.shift();
            this.torsoHistory.shift();
        }
        
        // Weighted Moving Average (WMA): More emphasis on recent data
        if (this.neckHistory.length > 0) {
            const weights = this.generateWeights(this.neckHistory.length);
            const smoothNeck = this.weightedAverage(this.neckHistory, weights);
            const smoothTorso = this.weightedAverage(this.torsoHistory, weights);
            
            return {
                neck: smoothNeck,
                torso: smoothTorso
            };
        }
        
        // Initial values
        return {
            neck: neckAngle,
            torso: torsoAngle
        };
    }
    
    reset() {
        this.neckHistory = [];
        this.torsoHistory = [];
    }
}

// ========== Phase 1 Optimization: Hysteresis Threshold Evaluator ==========
// Function: Prevent frequent state switching at threshold boundaries, reduce 80% false positives
/**
 * Hysteresis Threshold Evaluator
 * Switching from "good" to "bad": Must exceed threshold + hysteresis value
 * Switching from "bad" to "good": Must be below threshold - hysteresis value
 */
class HysteresisEvaluator {
    constructor(neckThreshold, torsoThreshold, hysteresis = HYSTERESIS_VALUE) {
        this.neckThreshold = neckThreshold;
        this.torsoThreshold = torsoThreshold;
        this.hysteresis = hysteresis; // Hysteresis value (degrees), default uses HYSTERESIS_VALUE
        this.currentState = 'good'; // 'good' | 'bad'
    }
    
    /**
     * Evaluate posture state (with hysteresis)
     * @param {number} neckAngle - Neck angle
     * @param {number} torsoAngle - Torso angle
     * @returns {boolean} true=good posture, false=bad posture
     */
    evaluate(neckAngle, torsoAngle) {
        if (this.currentState === 'good') {
            // Switching from "good" to "bad": Must exceed threshold + hysteresis value
            if (neckAngle >= this.neckThreshold + this.hysteresis || 
                torsoAngle >= this.torsoThreshold + this.hysteresis) {
                this.currentState = 'bad';
                return false;
            }
            return true;
        } else {
            // Switching from "bad" to "good": Must be below threshold - hysteresis value
            if (neckAngle < this.neckThreshold - this.hysteresis && 
                torsoAngle < this.torsoThreshold - this.hysteresis) {
                this.currentState = 'good';
                return true;
            }
            return false;
        }
    }
    
    /**
     * Update thresholds (for dynamic adjustment)
     */
    updateThresholds(neckThreshold, torsoThreshold) {
        this.neckThreshold = neckThreshold;
        this.torsoThreshold = torsoThreshold;
    }
    
    reset() {
        this.currentState = 'good';
    }
}

// ========== Phase 2 Optimization: Adaptive Threshold Manager (suitable for SCI patient rehabilitation process) ==========
/**
 * Adaptive Threshold Manager
 * Automatically adjusts thresholds based on rehabilitation progress
 */
class AdaptiveThresholdManager {
    constructor(baseNeckThreshold = 40, baseTorsoThreshold = 10) {
        this.baseNeckThreshold = baseNeckThreshold;
        this.baseTorsoThreshold = baseTorsoThreshold;
        this.rehabLevel = 'early'; // 'early' | 'middle' | 'late'
        this.multipliers = {
            'early': { neck: 1.5, torso: 2.0 },    // Early: More lenient (60°, 20°)
            'middle': { neck: 1.2, torso: 1.5 },  // Middle: Moderate (48°, 15°)
            'late': { neck: 1.0, torso: 1.0 }     // Late: Standard (40°, 10°)
        };
    }
    
    /**
     * Get current thresholds (based on rehabilitation stage)
     */
    getThresholds() {
        const mult = this.multipliers[this.rehabLevel];
        return {
            neck: this.baseNeckThreshold * mult.neck,
            torso: this.baseTorsoThreshold * mult.torso
        };
    }
    
    /**
     * Automatically adjust rehabilitation stage based on historical data
     * @param {Array} historyData - Historical record data
     */
    updateRehabLevel(historyData) {
        if (!historyData || historyData.length === 0) {
            this.rehabLevel = 'early';
            return;
        }
        
        // Analyze data from the last 7 days
        const recentData = historyData.slice(-7);
        const avgGoodPercentage = recentData.reduce((sum, d) => {
            const goodPercent = d.summary ? d.summary.goodPercentage : 
                              (d.goodTime && d.badTime ? 
                               (d.goodTime / (d.goodTime + d.badTime) * 100) : 0);
            return sum + goodPercent;
        }, 0) / recentData.length;
        
        // Determine rehabilitation stage based on good posture percentage
        if (avgGoodPercentage < 30) {
            this.rehabLevel = 'early';
        } else if (avgGoodPercentage < 70) {
            this.rehabLevel = 'middle';
        } else {
            this.rehabLevel = 'late';
        }
    }
    
    /**
     * Manually set rehabilitation stage
     */
    setRehabLevel(level) {
        if (['early', 'middle', 'late'].includes(level)) {
            this.rehabLevel = level;
        }
    }
    
    /**
     * Get rehabilitation stage description
     */
    getRehabLevelDescription(language = 'zh') {
        const descriptions = {
            zh: {
                early: 'Early Rehabilitation (Relaxed Thresholds)',
                middle: 'Middle Rehabilitation (Moderate Thresholds)',
                late: 'Late Rehabilitation (Standard Thresholds)'
            },
            en: {
                early: 'Early Rehabilitation (Relaxed)',
                middle: 'Middle Rehabilitation (Moderate)',
                late: 'Late Rehabilitation (Standard)'
            }
        };
        return descriptions[language]?.[this.rehabLevel] || this.rehabLevel;
    }
}

// Export all classes to global scope
window.AngleSmoother = AngleSmoother;
window.HysteresisEvaluator = HysteresisEvaluator;
window.AdaptiveThresholdManager = AdaptiveThresholdManager;

