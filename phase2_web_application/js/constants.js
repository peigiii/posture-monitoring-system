// ============================================================================
// 常量定义区域 (CONSTANTS)
// ============================================================================
// 定义系统中使用的所有常量，包括关键点索引、颜色、阈值等
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
const ALIGNMENT_THRESHOLD = 250; // 放宽阈值，从100改为250
const ALIGNMENT_THRESHOLD_PERFECT = 150; // 完美对齐阈值
const DEFAULT_NECK_THRESHOLD = 40;
const DEFAULT_TORSO_THRESHOLD = 15; // 更新为15°，更合理的默认值
const WARNING_TIME = 180; // 3 minutes
const MIN_LANDMARK_VISIBILITY = 0.5; // 关键点最小可信度
const DEPTH_DIFF_THRESHOLD = 0.1; // 深度差阈值（用于视角检测）

// 视角检测阈值（像素）
const VIEW_ANGLE_SIDE_THRESHOLD = 80;      // 侧面对齐阈值（肩膀距离 < 80px）
const VIEW_ANGLE_FRONT_THRESHOLD = 150;    // 正面对齐阈值（肩膀距离 > 150px）

// 正面模式检测阈值（像素）- 与评估脚本同步
const FRONT_SHOULDER_THRESHOLD_DEFAULT = 30;  // 默认肩膀高度差阈值（从50调整为30，与评估脚本同步）
const FRONT_HEAD_THRESHOLD_DEFAULT = 25;      // 默认头部高度差阈值（从40调整为25，与评估脚本同步）
const FRONT_HIP_THRESHOLD = 25;                // 髋部高度差阈值（从15调整为25，与评估脚本同步）

// 角度判定阈值（度）
const NECK_ANGLE_SEVERE = 50;      // 严重颈部前倾
const NECK_ANGLE_MODERATE = 40;    // 中等颈部前倾
const NECK_ANGLE_MILD = 30;        // 轻微颈部前倾
const TORSO_ANGLE_SEVERE = 15;     // 严重躯干前倾
const TORSO_ANGLE_MODERATE = 10;   // 中等躯干前倾
const TORSO_ANGLE_MILD = 5;        // 轻微躯干前倾

// 平滑和滞后设置
const SMOOTHING_WINDOW_SIZE = 10;  // 角度平滑窗口大小（帧数）
const HYSTERESIS_VALUE = 2;         // 滞后阈值（度）

// 参考点偏移（像素）
const REFERENCE_POINT_OFFSET = 100; // 垂直参考点偏移（用于角度计算）

// ============================================================================
// SCI患者专用阈值配置系统 (SCI Patient Threshold Configuration)
// ============================================================================
const SCI_THRESHOLDS = {
    // 标准模式（健康人群）
    standard: {
        neck: 40,
        torso: 15,
        shoulder: 30,
        hip: 25,
        head: 25,
        weightedScoreThreshold: 0.70  // 70%以上为良好
    },
    // SCI宽松模式（早期康复/严重患者）
    sciRelaxed: {
        neck: 50,      // +10°
        torso: 25,     // +10°
        shoulder: 40,  // +10px
        hip: 35,       // +10px
        head: 35,      // +10px
        weightedScoreThreshold: 0.60  // 60%以上为良好（更宽松）
    },
    // SCI严格模式（后期康复/轻度患者）
    sciStrict: {
        neck: 45,      // +5°
        torso: 20,     // +5°
        shoulder: 35,  // +5px
        hip: 30,       // +5px
        head: 30,      // +5px
        weightedScoreThreshold: 0.65  // 65%以上为良好
    }
};

// 当前使用的阈值模式（可以从localStorage读取用户设置）
let currentThresholdMode = 'standard'; // 'standard' | 'sciRelaxed' | 'sciStrict'

/**
 * 获取当前模式的阈值配置
 */
function getCurrentThresholds() {
    return SCI_THRESHOLDS[currentThresholdMode] || SCI_THRESHOLDS.standard;
}

/**
 * 设置阈值模式（增强版：支持React状态更新）
 */
function setThresholdMode(mode, updateStateCallback = null) {
    if (SCI_THRESHOLDS[mode]) {
        currentThresholdMode = mode;
        // 保存到localStorage
        try {
            localStorage.setItem('postureThresholdMode', mode);
        } catch (e) {
            console.warn('无法保存阈值模式设置:', e);
        }
        // 如果提供了状态更新回调，调用它
        if (updateStateCallback && typeof updateStateCallback === 'function') {
            updateStateCallback(mode);
        }
    }
}

// 从localStorage加载阈值模式
try {
    const savedMode = localStorage.getItem('postureThresholdMode');
    if (savedMode && SCI_THRESHOLDS[savedMode]) {
        currentThresholdMode = savedMode;
    }
} catch (e) {
    console.warn('无法加载阈值模式设置:', e);
}

// 导出函数到全局作用域
window.getCurrentThresholds = getCurrentThresholds;
window.setThresholdMode = setThresholdMode;

