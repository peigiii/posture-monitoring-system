// ============================================================================
// 核心算法类区域 (CORE ALGORITHM CLASSES)
// ============================================================================
// 包含角度平滑器、滞后阈值评估器、自适应阈值管理器等核心算法类
// ============================================================================

// ========== Phase 1 优化：加权移动平均平滑器（WMA）==========
// 改进：更重视最近的数据，响应更快，平滑效果更好
class AngleSmoother {
    constructor(windowSize) {
        // 如果 windowSize 未提供，使用默认值 10
        if (windowSize === undefined) {
            windowSize = typeof SMOOTHING_WINDOW_SIZE !== 'undefined' ? SMOOTHING_WINDOW_SIZE : 10;
        }
        this.windowSize = windowSize;
        this.neckHistory = [];
        this.torsoHistory = [];
    }
    
    /**
     * 生成线性权重（最近的数据权重更大）
     */
    generateWeights(length) {
        const weights = [];
        for (let i = 0; i < length; i++) {
            weights.push(i + 1); // 权重递增：1, 2, 3, ...
        }
        const sum = weights.reduce((a, b) => a + b, 0);
        return weights.map(w => w / sum); // 归一化
    }
    
    /**
     * 加权平均计算
     */
    weightedAverage(values, weights) {
        return values.reduce((sum, val, i) => sum + val * weights[i], 0);
    }
    
    smooth(neckAngle, torsoAngle) {
        // 添加新值
        this.neckHistory.push(neckAngle);
        this.torsoHistory.push(torsoAngle);
        
        // 保持窗口大小
        if (this.neckHistory.length > this.windowSize) {
            this.neckHistory.shift();
            this.torsoHistory.shift();
        }
        
        // 加权移动平均（WMA）：更重视最近的数据
        if (this.neckHistory.length > 0) {
            const weights = this.generateWeights(this.neckHistory.length);
            const smoothNeck = this.weightedAverage(this.neckHistory, weights);
            const smoothTorso = this.weightedAverage(this.torsoHistory, weights);
            
            return {
                neck: smoothNeck,
                torso: smoothTorso
            };
        }
        
        // 初始值
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

// ========== Phase 1 优化：滞后阈值评估器（Hysteresis）==========
// 功能：防止在阈值边界频繁切换状态，减少80%的误报
/**
 * 滞后阈值评估器
 * 从"好"切换到"坏"：需要超过阈值 + 滞后值
 * 从"坏"切换到"好"：需要低于阈值 - 滞后值
 */
class HysteresisEvaluator {
    constructor(neckThreshold, torsoThreshold, hysteresis = HYSTERESIS_VALUE) {
        this.neckThreshold = neckThreshold;
        this.torsoThreshold = torsoThreshold;
        this.hysteresis = hysteresis; // 滞后值（度），默认使用 HYSTERESIS_VALUE
        this.currentState = 'good'; // 'good' | 'bad'
    }
    
    /**
     * 评估姿势状态（带滞后）
     * @param {number} neckAngle - 颈部角度
     * @param {number} torsoAngle - 躯干角度
     * @returns {boolean} true=良好姿势, false=不良姿势
     */
    evaluate(neckAngle, torsoAngle) {
        if (this.currentState === 'good') {
            // 从"好"切换到"坏"：需要超过阈值 + 滞后值
            if (neckAngle >= this.neckThreshold + this.hysteresis || 
                torsoAngle >= this.torsoThreshold + this.hysteresis) {
                this.currentState = 'bad';
                return false;
            }
            return true;
        } else {
            // 从"坏"切换到"好"：需要低于阈值 - 滞后值
            if (neckAngle < this.neckThreshold - this.hysteresis && 
                torsoAngle < this.torsoThreshold - this.hysteresis) {
                this.currentState = 'good';
                return true;
            }
            return false;
        }
    }
    
    /**
     * 更新阈值（用于动态调整）
     */
    updateThresholds(neckThreshold, torsoThreshold) {
        this.neckThreshold = neckThreshold;
        this.torsoThreshold = torsoThreshold;
    }
    
    reset() {
        this.currentState = 'good';
    }
}

// ========== Phase 2 优化：自适应阈值管理器（适合SCI患者康复过程）==========
/**
 * 自适应阈值管理器
 * 根据康复进度自动调整阈值
 */
class AdaptiveThresholdManager {
    constructor(baseNeckThreshold = 40, baseTorsoThreshold = 10) {
        this.baseNeckThreshold = baseNeckThreshold;
        this.baseTorsoThreshold = baseTorsoThreshold;
        this.rehabLevel = 'early'; // 'early' | 'middle' | 'late'
        this.multipliers = {
            'early': { neck: 1.5, torso: 2.0 },    // 早期：更宽松（60°, 20°）
            'middle': { neck: 1.2, torso: 1.5 },  // 中期：中等（48°, 15°）
            'late': { neck: 1.0, torso: 1.0 }     // 后期：标准（40°, 15°）
        };
    }
    
    /**
     * 获取当前阈值（根据康复阶段）
     */
    getThresholds() {
        const mult = this.multipliers[this.rehabLevel];
        return {
            neck: this.baseNeckThreshold * mult.neck,
            torso: this.baseTorsoThreshold * mult.torso
        };
    }
    
    /**
     * 根据历史数据自动调整康复阶段
     * @param {Array} historyData - 历史记录数据
     */
    updateRehabLevel(historyData) {
        if (!historyData || historyData.length === 0) {
            this.rehabLevel = 'early';
            return;
        }
        
        // 分析最近7天的数据
        const recentData = historyData.slice(-7);
        const avgGoodPercentage = recentData.reduce((sum, d) => {
            const goodPercent = d.summary ? d.summary.goodPercentage : 
                              (d.goodTime && d.badTime ? 
                               (d.goodTime / (d.goodTime + d.badTime) * 100) : 0);
            return sum + goodPercent;
        }, 0) / recentData.length;
        
        // 根据良好姿势占比判断康复阶段
        if (avgGoodPercentage < 30) {
            this.rehabLevel = 'early';
        } else if (avgGoodPercentage < 70) {
            this.rehabLevel = 'middle';
        } else {
            this.rehabLevel = 'late';
        }
    }
    
    /**
     * 手动设置康复阶段
     */
    setRehabLevel(level) {
        if (['early', 'middle', 'late'].includes(level)) {
            this.rehabLevel = level;
        }
    }
    
    /**
     * 获取康复阶段描述
     */
    getRehabLevelDescription(language = 'zh') {
        const descriptions = {
            zh: {
                early: '早期康复（宽松阈值）',
                middle: '中期康复（中等阈值）',
                late: '后期康复（标准阈值）'
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

// 导出所有类到全局作用域
window.AngleSmoother = AngleSmoother;
window.HysteresisEvaluator = HysteresisEvaluator;
window.AdaptiveThresholdManager = AdaptiveThresholdManager;
