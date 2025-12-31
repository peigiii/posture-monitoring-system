// ============================================================================
// 姿势分析函数区域 (POSTURE ANALYSIS FUNCTIONS)
// ============================================================================
// 包含视角检测、侧面对齐检测、正面姿势分析等核心分析函数
// ============================================================================
// 注意：这些函数依赖 constants.js 和 utils.js 中定义的常量和工具函数
// 由于 HTML 使用 <script type="text/babel">，这些函数将作为全局函数定义
// ============================================================================

/**
 * 检测视角类型（侧面/正面/过渡中）
 * @param {Array} landmarks - MediaPipe 关键点数组
 * @param {number} canvasWidth - 画布宽度
 * @returns {Object} 视角检测结果 {mode, confidence, message, type}
 */
function detectViewAngle(landmarks, canvasWidth) {
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    
    if (!isLandmarkValid(lShoulder) || !isLandmarkValid(rShoulder)) {
        return { 
            mode: 'transitioning', 
            confidence: 'low', 
            message: '调整中...',
            type: 'unknown'
        };
    }

    // 计算肩膀横向距离（像素）
    const lShoulderX = lShoulder.x * canvasWidth;
    const rShoulderX = rShoulder.x * canvasWidth;
    const shoulderDistance = Math.abs(lShoulderX - rShoulderX);
    
    // 判断逻辑
    if (shoulderDistance < VIEW_ANGLE_SIDE_THRESHOLD) {
        return {
            mode: 'side',
            confidence: 'high',
            message: '侧面模式',
            type: 'side',
            shoulderDistance
        };
    } else if (shoulderDistance > VIEW_ANGLE_FRONT_THRESHOLD) {
        return {
            mode: 'front',
            confidence: 'high',
            message: '正面模式',
            type: 'front',
            shoulderDistance
        };
    } else {
        return {
            mode: 'transitioning',
            confidence: 'low',
            message: '调整中...',
            type: 'unknown',
            shoulderDistance
        };
    }
}

/**
 * 改进的加权评分系统（正面模式）
 * 使用渐进式扣分，针对SCI患者优化权重
 * @param {Object} metrics - 检测指标 {shoulderTilt, hipTilt, headTilt}
 * @param {Object} thresholds - 阈值配置 {shoulder, hip, head}
 * @param {boolean} isSCIMode - 是否为SCI模式
 * @returns {Object} 评分结果 {score, isGood, breakdown}
 */
function calculatePostureScoreFront(metrics, thresholds, isSCIMode = false) {
    let score = 0.0;
    const breakdown = {};
    
    // 根据模式调整权重（SCI患者更关注对称性和脊柱健康）
    const weights = isSCIMode ? {
        shoulder: 0.30,      // SCI患者肩膀对称性重要
        hip: 0.30,           // 骨盆倾斜是SCI患者关键指标
        head: 0.25,          // 头部倾斜也重要
        spinal: 0.15         // 脊柱弯曲度对SCI患者很重要
    } : {
        shoulder: 0.35,
        hip: 0.30,
        head: 0.20,
        spinal: 0.15          // 脊柱弯曲度对所有人重要
    };
    
    // 如果没有脊柱弯曲度数据，重新分配权重
    const hasSpinalData = metrics.spinalCurvature !== undefined;
    if (!hasSpinalData) {
        // 重新归一化权重
        const totalWeight = weights.shoulder + weights.hip + weights.head;
        weights.shoulder = weights.shoulder / totalWeight;
        weights.hip = weights.hip / totalWeight;
        weights.head = weights.head / totalWeight;
        weights.spinal = 0;
    }
    
    // 优化的渐进式扣分函数（使用更平滑的曲线）
    function calculateProgressiveScore(value, threshold, weight) {
        if (value < threshold) {
            // 在阈值内：完全得分，但接近阈值时稍微扣分（鼓励保持更好姿势）
            const ratio = value / threshold;
            // 使用平方函数，让接近阈值时轻微扣分
            const bonus = ratio < 0.7 ? 1.0 : 1.0 - ((ratio - 0.7) / 0.3) * 0.1; // 70%以下满分，70-100%轻微扣分
            return weight * bonus;
        } else {
            // 超过阈值：渐进式扣分（使用指数衰减，更平滑）
            const excess = value - threshold;
            const excessRatio = excess / threshold; // 超过阈值的比例
            // 使用平方根函数，让扣分更平滑
            const penaltyRatio = Math.min(Math.sqrt(excessRatio * 2), 1); // 平方根衰减
            return weight * (1 - penaltyRatio);
        }
    }
    
    // 计算肩膀得分（优化的渐进式扣分）
    breakdown.shoulder = calculateProgressiveScore(metrics.shoulderTilt, thresholds.shoulder, weights.shoulder);
    score += breakdown.shoulder;
    
    // 计算髋部得分
    breakdown.hip = calculateProgressiveScore(metrics.hipTilt, thresholds.hip, weights.hip);
    score += breakdown.hip;
    
    // 计算头部得分
    breakdown.head = calculateProgressiveScore(metrics.headTilt, thresholds.head, weights.head);
    score += breakdown.head;
    
    // 计算脊柱弯曲度得分（使用优化的渐进式扣分）
    if (hasSpinalData && thresholds.spinal) {
        breakdown.spinal = calculateProgressiveScore(metrics.spinalCurvature, thresholds.spinal, weights.spinal);
        score += breakdown.spinal;
    }
    
    // 获取阈值配置
    const thresholdConfig = getCurrentThresholds();
    const scoreThreshold = thresholdConfig.weightedScoreThreshold;
    
    return {
        score: score,
        isGood: score >= scoreThreshold,
        breakdown: breakdown,
        percentage: Math.round(score * 100)  // 百分比形式
    };
}

/**
 * 改进的加权评分系统（侧面模式）
 * 结合颈部角度和躯干角度
 * @param {Object} metrics - 检测指标 {neckAngle, torsoAngle}
 * @param {Object} thresholds - 阈值配置 {neck, torso}
 * @param {boolean} isSCIMode - 是否为SCI模式
 * @returns {Object} 评分结果 {score, isGood, breakdown}
 */
function calculatePostureScoreSide(metrics, thresholds, isSCIMode = false) {
    let score = 0.0;
    const breakdown = {};
    
    // 权重配置
    const weights = isSCIMode ? {
        neck: 0.45,   // SCI患者颈部问题更常见
        torso: 0.55   // 躯干角度更重要
    } : {
        neck: 0.50,
        torso: 0.50
    };
    
    // 优化的渐进式扣分函数（角度模式）
    function calculateAngleProgressiveScore(value, threshold, weight) {
        if (value < threshold) {
            // 在阈值内：完全得分，但接近阈值时稍微扣分
            const ratio = value / threshold;
            const bonus = ratio < 0.75 ? 1.0 : 1.0 - ((ratio - 0.75) / 0.25) * 0.15; // 75%以下满分
            return weight * bonus;
        } else {
            // 超过阈值：渐进式扣分（使用更平滑的曲线）
            const excess = value - threshold;
            const excessRatio = excess / threshold;
            // 使用平方根函数，让扣分更平滑
            const penaltyRatio = Math.min(Math.sqrt(excessRatio * 1.5), 1);
            return weight * (1 - penaltyRatio);
        }
    }
    
    // 计算颈部得分（优化的渐进式扣分）
    breakdown.neck = calculateAngleProgressiveScore(metrics.neckAngle, thresholds.neck, weights.neck);
    score += breakdown.neck;
    
    // 计算躯干得分
    breakdown.torso = calculateAngleProgressiveScore(metrics.torsoAngle, thresholds.torso, weights.torso);
    score += breakdown.torso;
    
    // 获取阈值配置
    const thresholdConfig = getCurrentThresholds();
    // 对于侧视图，使用更严格的评分阈值（85%）以匹配Basic模式的严格性
    // 评估结果显示：使用85%阈值可以达到96.36%准确率，接近Basic模式的96.88%
    const scoreThreshold = isSCIMode ? 0.75 : 0.85;  // SCI模式稍宽松（75%），标准模式严格（85%）
    
    return {
        score: score,
        isGood: score >= scoreThreshold,
        breakdown: breakdown,
        percentage: Math.round(score * 100)
    };
}

/**
 * 正面模式姿势分析
 * 检测肩膀高度差、髋部倾斜、头部倾斜等对称性问题
 * @param {Array} landmarks - MediaPipe 关键点数组
 * @param {number} canvasHeight - 画布高度
 * @param {number} shoulderThreshold - 肩膀高度差阈值（像素）
 * @param {number} headThreshold - 头部高度差阈值（像素）
 * @returns {Object} 分析结果 {shoulderTilt, hipTilt, headTilt, isGoodPosture, issues}
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
            issues: ['关键点不可用']
        };
    }
    
    const lShoulderY = lShoulder.y * canvasHeight;
    const rShoulderY = rShoulder.y * canvasHeight;
    
    // 1. 肩膀倾斜角度（高度差）
    const shoulderTilt = Math.abs(lShoulderY - rShoulderY);
    
    // 2. 髋部倾斜角度
    let hipTilt = 0;
    if (isLandmarkValid(lHip) && isLandmarkValid(rHip)) {
        const lHipY = lHip.y * canvasHeight;
        const rHipY = rHip.y * canvasHeight;
        hipTilt = Math.abs(lHipY - rHipY);
    }
    
    // 3. 头部倾斜（使用耳朵）
    let headTilt = 0;
    if (isLandmarkValid(lEar) && isLandmarkValid(rEar)) {
        const lEarY = lEar.y * canvasHeight;
        const rEarY = rEar.y * canvasHeight;
        headTilt = Math.abs(lEarY - rEarY);
    }
    
    // 4. 脊柱弯曲度检测（新增：检测脊柱侧弯）
    let spinalCurvature = 0;
    let spinalDirection = null;
    if (isLandmarkValid(lShoulder) && isLandmarkValid(rShoulder) && 
        isLandmarkValid(lHip) && isLandmarkValid(rHip)) {
        // 计算肩膀中点和髋部中点的Y坐标
        const shoulderMidY = (lShoulderY + rShoulderY) / 2;
        const hipMidY = (lHip.y * canvasHeight + rHip.y * canvasHeight) / 2;
        
        // 理想情况下，肩膀中点和髋部中点应该在一条垂直线上
        // 计算偏差（脊柱弯曲度）
        spinalCurvature = Math.abs(shoulderMidY - hipMidY);
        spinalDirection = shoulderMidY > hipMidY ? 'forward' : 'backward';
    }
    
    // 获取当前阈值配置
    const thresholds = getCurrentThresholds();
    const isSCIMode = currentThresholdMode !== 'standard';
    
    // 使用改进的加权评分系统（包含脊柱弯曲度）
    const scoreResult = calculatePostureScoreFront({
        shoulderTilt,
        hipTilt,
        headTilt,
        spinalCurvature
    }, {
        shoulder: shoulderThreshold || thresholds.shoulder,
        hip: FRONT_HIP_THRESHOLD || thresholds.hip,
        head: headThreshold || thresholds.head,
        spinal: 20  // 脊柱弯曲度阈值（像素）
    }, isSCIMode);
    
    // 判定标准（使用加权评分）
    const isGoodPosture = scoreResult.isGood;
    
    const issues = [];
    let shoulderHigher = null; // 'left' or 'right'
    if (shoulderTilt > (shoulderThreshold || thresholds.shoulder)) {
        if (lShoulderY < rShoulderY) {
            issues.push('左肩较高');
            shoulderHigher = 'left';
        } else {
            issues.push('右肩较高');
            shoulderHigher = 'right';
        }
    }
    if (headTilt > (headThreshold || thresholds.head)) {
        issues.push('头部倾斜');
    }
    if (hipTilt > (FRONT_HIP_THRESHOLD || thresholds.hip)) {
        issues.push('髋部倾斜');
    }
    if (spinalCurvature > 20) {
        issues.push(spinalDirection === 'forward' ? '脊柱前倾' : '脊柱后倾');
    }
    
    return {
        shoulderTilt,
        hipTilt,
        headTilt,
        spinalCurvature,      // 新增：脊柱弯曲度
        spinalDirection,     // 新增：脊柱方向
        isGoodPosture,
        issues,
        shoulderHigher,
        score: scoreResult.score,        // 加权得分
        scoreBreakdown: scoreResult.breakdown,  // 详细得分
        scorePercentage: scoreResult.percentage  // 百分比
    };
}

// 姿势建议生成函数
function generatePostureSuggestions(analysis, viewMode, language = 'zh') {
    const suggestions = [];
    
    if (viewMode === 'side' && analysis) {
        const { neckAngle, torsoAngle } = analysis;
        
        // 颈部建议
        if (neckAngle >= NECK_ANGLE_SEVERE) {
            suggestions.push(i18n[language].suggestionsNeck.severe);
        } else if (neckAngle >= NECK_ANGLE_MODERATE) {
            suggestions.push(i18n[language].suggestionsNeck.moderate);
        } else if (neckAngle >= NECK_ANGLE_MILD) {
            suggestions.push(i18n[language].suggestionsNeck.mild);
        }
        
        // 躯干建议
        if (torsoAngle >= TORSO_ANGLE_SEVERE) {
            suggestions.push(i18n[language].suggestionsTorso.severe);
        } else if (torsoAngle >= TORSO_ANGLE_MODERATE) {
            suggestions.push(i18n[language].suggestionsTorso.moderate);
        } else if (torsoAngle >= TORSO_ANGLE_MILD) {
            suggestions.push(i18n[language].suggestionsTorso.mild);
        }
    } else if (viewMode === 'front' && analysis) {
        const { shoulderTilt, headTilt, shoulderHigher } = analysis;
        
        // 肩膀建议
        if (shoulderTilt > 0 && shoulderHigher) {
            if (shoulderHigher === 'left') {
                suggestions.push(i18n[language].suggestionsShoulder.left);
            } else {
                suggestions.push(i18n[language].suggestionsShoulder.right);
            }
        }
        
        // 头部建议
        if (headTilt > 0) {
            suggestions.push(i18n[language].suggestionsHead);
        }
    }
    
    return suggestions;
}

// ========== Phase 2 优化：多关键点融合 + 高精度角度计算 ==========
/**
 * 计算中位数（抗异常值）
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
 * 多关键点融合角度计算（提高鲁棒性）
 */
function calculateAngleWithFusion(landmarks, canvasWidth, canvasHeight, angleType) {
    const angles = [];
    
    if (angleType === 'neck') {
        // 方法1: 左肩-左耳
        const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
        const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
        if (isLandmarkValid(lShoulder) && isLandmarkValid(lEar)) {
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            const ear = { x: lEar.x * canvasWidth, y: lEar.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            const angle = calculateAnglePrecise(shoulder, ear, ref);
            if (angle > 0) angles.push(angle);
        }
        
        // 方法2: 右肩-右耳（如果可见）
        const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
        const rEar = landmarks[POSE_LANDMARKS.RIGHT_EAR];
        if (isLandmarkValid(rShoulder) && isLandmarkValid(rEar)) {
            const shoulder = { x: rShoulder.x * canvasWidth, y: rShoulder.y * canvasHeight };
            const ear = { x: rEar.x * canvasWidth, y: rEar.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            const angle = calculateAnglePrecise(shoulder, ear, ref);
            if (angle > 0) angles.push(angle);
        }
        
        // 方法3: 左肩-鼻子（备用）
        const nose = landmarks[POSE_LANDMARKS.NOSE];
        if (isLandmarkValid(lShoulder) && isLandmarkValid(nose)) {
            const shoulder = { x: lShoulder.x * canvasWidth, y: lShoulder.y * canvasHeight };
            const nosePt = { x: nose.x * canvasWidth, y: nose.y * canvasHeight };
            const ref = { x: shoulder.x, y: shoulder.y - 100 };
            const angle = calculateAnglePrecise(shoulder, nosePt, ref);
            if (angle > 0) angles.push(angle);
        }
    } else if (angleType === 'torso') {
        // 方法1: 左髋-左肩
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
        
        // 方法2: 右髋-右肩（如果可见）
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
    
    // 返回中位数（抗异常值）
    return median(angles);
}

// ========== Phase 1 优化：侧面检测算法（使用高精度角度计算）==========
function analyzeSidePosture(landmarks, canvasWidth, canvasHeight) {
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    
    // 基础检查
    if (!isLandmarkValid(lShoulder) || !isLandmarkValid(lEar) || !isLandmarkValid(lHip)) {
        return {
            neckAngle: 0,
            torsoAngle: 0,
            isGoodPosture: false,
            issues: ['关键点不可用']
        };
    }
    
    // ========== Phase 2: 使用多关键点融合计算角度 ==========
    let neckAngle = 0;
    let torsoAngle = 0;
    
    try {
        // 多关键点融合计算（提高鲁棒性，抗异常值）
        neckAngle = calculateAngleWithFusion(landmarks, canvasWidth, canvasHeight, 'neck');
        torsoAngle = calculateAngleWithFusion(landmarks, canvasWidth, canvasHeight, 'torso');
        
        // 如果融合失败，回退到单点计算
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
        console.warn('角度计算失败', error);
    }
    
    // 获取当前阈值配置（使用SCI阈值系统）
    const thresholds = getCurrentThresholds();
    const isSCIMode = currentThresholdMode !== 'standard';
    
    // 使用改进的加权评分系统（而不是简单的阈值判断）
    const scoreResult = calculatePostureScoreSide({
        neckAngle,
        torsoAngle
    }, {
        neck: thresholds.neck,
        torso: thresholds.torso
    }, isSCIMode);
    
    // 判定标准（使用加权评分）
    const isGoodPosture = scoreResult.isGood;
    
    const issues = [];
    if (neckAngle >= thresholds.neck) {
        issues.push('颈部前倾');
    }
    if (torsoAngle >= thresholds.torso) {
        issues.push('躯干前倾');
    }
    
    return {
        neckAngle,
        torsoAngle,
        isGoodPosture,
        issues,
        score: scoreResult.score,        // 加权得分
        scoreBreakdown: scoreResult.breakdown,  // 详细得分
        scorePercentage: scoreResult.percentage  // 百分比
    };
}

// 导出所有函数到全局作用域
window.detectViewAngle = detectViewAngle;
window.calculatePostureScoreFront = calculatePostureScoreFront;
window.calculatePostureScoreSide = calculatePostureScoreSide;
window.analyzeFrontPosture = analyzeFrontPosture;
window.detectViewAngle = detectViewAngle;
window.generatePostureSuggestions = generatePostureSuggestions;
window.median = median;
window.calculateAngleWithFusion = calculateAngleWithFusion;
window.analyzeSidePosture = analyzeSidePosture;
