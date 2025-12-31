"""
Dataset Evaluation Script
Evaluate posture detection algorithm performance on dataset

Usage:
    python evaluation/evaluate_dataset.py
"""

import cv2
import os
import math as m
import mediapipe as mp
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import numpy as np

# MediaPipe 初始化
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True)

# 阈值设置（与主程序保持一致）
DEFAULT_NECK_THRESHOLD = 40
DEFAULT_TORSO_THRESHOLD = 15
ALIGNMENT_THRESHOLD = 100  # 侧面对齐阈值

# SCI患者专用阈值配置系统（与网站保持一致）
SCI_THRESHOLDS = {
    'standard': {
        'neck': 40,
        'torso': 15,
        'shoulder': 30,
        'hip': 25,
        'head': 25,
        'spinal': 20,  # 脊柱弯曲度阈值
        'weighted_score_threshold': 0.70
    },
    'sciRelaxed': {
        'neck': 50,
        'torso': 25,
        'shoulder': 40,
        'hip': 35,
        'head': 35,
        'spinal': 25,
        'weighted_score_threshold': 0.60
    },
    'sciStrict': {
        'neck': 45,
        'torso': 20,
        'shoulder': 35,
        'hip': 30,
        'head': 30,
        'spinal': 22,
        'weighted_score_threshold': 0.65
    }
}

# 当前使用的阈值模式
CURRENT_THRESHOLD_MODE = 'standard'  # 'standard' | 'sciRelaxed' | 'sciStrict'

# 使用加权评分而不是"全部通过"
USE_WEIGHTED_SCORING = True      # 使用加权评分（更合理）

# 兼容旧代码的阈值（使用标准模式）
SHOULDER_HEIGHT_THRESHOLD = SCI_THRESHOLDS[CURRENT_THRESHOLD_MODE]['shoulder']
HIP_HEIGHT_THRESHOLD = SCI_THRESHOLDS[CURRENT_THRESHOLD_MODE]['hip']
HEAD_TILT_THRESHOLD = SCI_THRESHOLDS[CURRENT_THRESHOLD_MODE]['head']
WEIGHTED_SCORE_THRESHOLD = SCI_THRESHOLDS[CURRENT_THRESHOLD_MODE]['weighted_score_threshold']

def findDistance(x1, y1, x2, y2):
    """计算两点距离"""
    return m.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

def findAngle(x1, y1, x2, y2):
    """计算角度（与主程序保持一致）"""
    try:
        denominator = m.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * y1
        if abs(denominator) < 0.0001:
            return 0
        numerator = (y2 - y1) * (-y1)
        ratio = numerator / denominator
        clamped_ratio = max(-1, min(1, ratio))
        theta = m.acos(clamped_ratio)
        return int(180 / m.pi) * theta
    except:
        return 0

def calculate_progressive_score(value, threshold, weight):
    """
    优化的渐进式扣分函数（使用更平滑的曲线）
    与网站算法保持一致
    """
    if value < threshold:
        # 在阈值内：完全得分，但接近阈值时稍微扣分
        ratio = value / threshold
        bonus = 1.0 if ratio < 0.7 else 1.0 - ((ratio - 0.7) / 0.3) * 0.1
        return weight * bonus
    else:
        # 超过阈值：渐进式扣分（使用平方根衰减）
        excess = value - threshold
        excess_ratio = excess / threshold
        penalty_ratio = min(m.sqrt(excess_ratio * 2), 1.0)
        return weight * (1 - penalty_ratio)

def calculate_angle_progressive_score(value, threshold, weight):
    """
    角度模式的渐进式扣分函数
    """
    if value < threshold:
        ratio = value / threshold
        bonus = 1.0 if ratio < 0.75 else 1.0 - ((ratio - 0.75) / 0.25) * 0.15
        return weight * bonus
    else:
        excess = value - threshold
        excess_ratio = excess / threshold
        penalty_ratio = min(m.sqrt(excess_ratio * 1.5), 1.0)
        return weight * (1 - penalty_ratio)

def calculate_posture_score_front(metrics, thresholds, is_sci_mode=False):
    """
    改进的加权评分系统（正面模式）
    与网站算法保持一致
    """
    score = 0.0
    breakdown = {}
    
    # 根据模式调整权重
    if is_sci_mode:
        weights = {
            'shoulder': 0.30,
            'hip': 0.30,
            'head': 0.25,
            'spinal': 0.15
        }
    else:
        weights = {
            'shoulder': 0.35,
            'hip': 0.30,
            'head': 0.20,
            'spinal': 0.15
        }
    
    # 如果没有脊柱数据，重新分配权重
    has_spinal = 'spinal_curvature' in metrics and metrics['spinal_curvature'] is not None
    if not has_spinal:
        total = weights['shoulder'] + weights['hip'] + weights['head']
        weights['shoulder'] = weights['shoulder'] / total
        weights['hip'] = weights['hip'] / total
        weights['head'] = weights['head'] / total
        weights['spinal'] = 0
    
    # 计算各项得分
    breakdown['shoulder'] = calculate_progressive_score(
        metrics['shoulder_height_diff'], thresholds['shoulder'], weights['shoulder']
    )
    breakdown['hip'] = calculate_progressive_score(
        metrics['hip_height_diff'], thresholds['hip'], weights['hip']
    )
    breakdown['head'] = calculate_progressive_score(
        metrics['head_tilt'], thresholds['head'], weights['head']
    )
    
    if has_spinal and thresholds.get('spinal'):
        breakdown['spinal'] = calculate_progressive_score(
            metrics['spinal_curvature'], thresholds['spinal'], weights['spinal']
        )
    else:
        breakdown['spinal'] = 0
    
    score = sum(breakdown.values())
    threshold_config = SCI_THRESHOLDS[CURRENT_THRESHOLD_MODE]
    score_threshold = threshold_config['weighted_score_threshold']
    
    return {
        'score': score,
        'is_good': score >= score_threshold,
        'breakdown': breakdown,
        'percentage': int(score * 100)
    }

def calculate_posture_score_side(metrics, thresholds, is_sci_mode=False):
    """
    改进的加权评分系统（侧面模式）
    与网站算法保持一致
    """
    score = 0.0
    breakdown = {}
    
    # 权重配置
    if is_sci_mode:
        weights = {'neck': 0.45, 'torso': 0.55}
    else:
        weights = {'neck': 0.50, 'torso': 0.50}
    
    # 计算得分
    breakdown['neck'] = calculate_angle_progressive_score(
        metrics['neck_angle'], thresholds['neck'], weights['neck']
    )
    breakdown['torso'] = calculate_angle_progressive_score(
        metrics['torso_angle'], thresholds['torso'], weights['torso']
    )
    
    score = sum(breakdown.values())
    threshold_config = SCI_THRESHOLDS[CURRENT_THRESHOLD_MODE]
    score_threshold = threshold_config['weighted_score_threshold']
    
    return {
        'score': score,
        'is_good': score >= score_threshold,
        'breakdown': breakdown,
        'percentage': int(score * 100)
    }

def analyze_image(image_path, use_enhanced_detection=True, detect_view=False, threshold_mode=None):
    """
    分析单张图像，返回姿势检测结果（增强版：包含多个检测指标）
    
    Args:
        image_path: 图像路径
        use_enhanced_detection: 是否使用增强检测（多指标）
    
    Returns:
        dict: {
            'neck_angle': float,
            'torso_angle': float,
            'shoulder_height_diff': float,
            'hip_height_diff': float,
            'head_tilt': float,
            'is_aligned': bool,
            'predicted_label': str,  # 'good' or 'bad'
            'predicted_label_basic': str,  # 基础版本（只考虑两个角度）
            'landmarks_detected': bool,
            'issues': list  # 检测到的问题列表
        }
    """
    # 读取图像
    image = cv2.imread(str(image_path))
    if image is None:
        return None
    
    h, w = image.shape[:2]
    
    # 转换为 RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 处理图像
    results = pose.process(image_rgb)
    
    if results.pose_landmarks is None:
        return {
            'neck_angle': 0,
            'torso_angle': 0,
            'shoulder_height_diff': 0,
            'hip_height_diff': 0,
            'head_tilt': 0,
            'is_aligned': False,
            'predicted_label': 'bad',
            'predicted_label_basic': 'bad',
            'landmarks_detected': False,
            'issues': ['landmarks_not_detected']
        }
    
    lm = results.pose_landmarks
    lmPose = mp_pose.PoseLandmark
    
    # 获取关键点坐标
    try:
        l_shldr_x = int(lm.landmark[lmPose.LEFT_SHOULDER].x * w)
        l_shldr_y = int(lm.landmark[lmPose.LEFT_SHOULDER].y * h)
        r_shldr_x = int(lm.landmark[lmPose.RIGHT_SHOULDER].x * w)
        r_shldr_y = int(lm.landmark[lmPose.RIGHT_SHOULDER].y * h)
        l_ear_x = int(lm.landmark[lmPose.LEFT_EAR].x * w)
        l_ear_y = int(lm.landmark[lmPose.LEFT_EAR].y * h)
        r_ear_x = int(lm.landmark[lmPose.RIGHT_EAR].x * w)
        r_ear_y = int(lm.landmark[lmPose.RIGHT_EAR].y * h)
        l_hip_x = int(lm.landmark[lmPose.LEFT_HIP].x * w)
        l_hip_y = int(lm.landmark[lmPose.LEFT_HIP].y * h)
        r_hip_x = int(lm.landmark[lmPose.RIGHT_HIP].x * w)
        r_hip_y = int(lm.landmark[lmPose.RIGHT_HIP].y * h)
    except:
        return {
            'neck_angle': 0,
            'torso_angle': 0,
            'shoulder_height_diff': 0,
            'hip_height_diff': 0,
            'head_tilt': 0,
            'is_aligned': False,
            'predicted_label': 'bad',
            'predicted_label_basic': 'bad',
            'landmarks_detected': False,
            'issues': ['landmarks_error']
        }
    
    # 计算对齐距离
    offset = findDistance(l_shldr_x, l_shldr_y, r_shldr_x, r_shldr_y)
    is_aligned = offset < ALIGNMENT_THRESHOLD  # True=侧面对齐, False=正面对齐
    
    # 计算角度（基础检测）
    try:
        neck_angle = findAngle(l_shldr_x, l_shldr_y, l_ear_x, l_ear_y)
        torso_angle = findAngle(l_hip_x, l_hip_y, l_shldr_x, l_shldr_y)
    except:
        neck_angle = 0
        torso_angle = 0
    
    # 基础判定（只考虑两个角度）
    is_good_basic = neck_angle < DEFAULT_NECK_THRESHOLD and torso_angle < DEFAULT_TORSO_THRESHOLD
    
    # 获取当前阈值配置
    if threshold_mode is None:
        threshold_mode = CURRENT_THRESHOLD_MODE
    thresholds = SCI_THRESHOLDS.get(threshold_mode, SCI_THRESHOLDS['standard'])
    is_sci_mode = threshold_mode != 'standard'
    
    # 增强检测（多指标）
    shoulder_height_diff = abs(l_shldr_y - r_shldr_y)
    hip_height_diff = abs(l_hip_y - r_hip_y)
    head_tilt = abs(l_ear_y - r_ear_y)
    
    # 脊柱弯曲度检测（新增）
    # 注意：对于侧视图，脊柱弯曲度检测可能不准确，因为侧视图主要看前后倾斜
    # 只在正面对齐时使用脊柱弯曲度检测
    spinal_curvature = 0
    spinal_direction = None
    use_spinal_detection = not is_aligned  # 正面对齐时使用（is_aligned=False表示正面）
    
    if use_spinal_detection:
        try:
            shoulder_mid_y = (l_shldr_y + r_shldr_y) / 2
            hip_mid_y = (l_hip_y + r_hip_y) / 2
            spinal_curvature = abs(shoulder_mid_y - hip_mid_y)
            spinal_direction = 'forward' if shoulder_mid_y > hip_mid_y else 'backward'
        except:
            pass
    
    # 综合判定（增强版）
    # 重要：对于侧视图，主要检测角度；对于正视图，检测对称性
    issues = []
    
    # 角度检测（侧视图和正视图都适用）
    if neck_angle >= thresholds['neck']:
        issues.append('neck_forward')
    if torso_angle >= thresholds['torso']:
        issues.append('torso_forward')
    
    # 对称性检测（只在正视图时使用，侧视图不准确）
    if not is_aligned:  # 正面对齐时检测对称性
        if shoulder_height_diff >= thresholds['shoulder']:
            issues.append('shoulder_tilt')
        if hip_height_diff >= thresholds['hip']:
            issues.append('hip_tilt')
        if head_tilt >= thresholds['head']:
            issues.append('head_tilt')
        if use_spinal_detection and spinal_curvature >= thresholds['spinal']:
            issues.append('spinal_curvature')
    
    # 增强判定：使用改进的加权评分系统
    if USE_WEIGHTED_SCORING:
        # 使用新的渐进式评分算法
        # 重要：对于侧视图数据集，主要使用角度检测，对称性检测不准确
        if is_aligned:  # 侧面对齐，使用侧面评分（只考虑角度）
            score_result = calculate_posture_score_side(
                {'neck_angle': neck_angle, 'torso_angle': torso_angle},
                {'neck': thresholds['neck'], 'torso': thresholds['torso']},
                is_sci_mode
            )
            # 对于侧视图数据集，使用更严格的评分阈值（0.85）以匹配Basic模式的严格性
            # Basic模式要求：neck < 40 AND torso < 15（全部通过）
            # Enhanced模式使用加权评分，但为了匹配Basic的严格性，使用更高的阈值
            strict_threshold = 0.85 if not is_sci_mode else 0.75  # SCI模式稍宽松
            is_good_enhanced = score_result['score'] >= strict_threshold
        else:  # 正面对齐，使用正面评分（考虑对称性）
            # 对于正视图，使用对称性检测
            spinal_metric = spinal_curvature if use_spinal_detection else None
            spinal_threshold = thresholds['spinal'] if use_spinal_detection else None
            
            score_result = calculate_posture_score_front(
                {
                    'shoulder_height_diff': shoulder_height_diff,
                    'hip_height_diff': hip_height_diff,
                    'head_tilt': head_tilt,
                    'spinal_curvature': spinal_metric
                },
                {
                    'shoulder': thresholds['shoulder'],
                    'hip': thresholds['hip'],
                    'head': thresholds['head'],
                    'spinal': spinal_threshold
                },
                is_sci_mode
            )
            is_good_enhanced = score_result['is_good']
    else:
        # 全部通过才算良好（严格模式）
        is_good_enhanced = len(issues) == 0
        score_result = {'score': 0, 'percentage': 0, 'breakdown': {}}
    
    # 选择使用哪个判定结果
    if use_enhanced_detection:
        predicted_label = 'good' if is_good_enhanced else 'bad'
    else:
        predicted_label = 'good' if is_good_basic else 'bad'
    
    return {
        'neck_angle': neck_angle,
        'torso_angle': torso_angle,
        'shoulder_height_diff': shoulder_height_diff,
        'hip_height_diff': hip_height_diff,
        'head_tilt': head_tilt,
        'spinal_curvature': spinal_curvature,
        'spinal_direction': spinal_direction,
        'is_aligned': is_aligned,
        'predicted_label': predicted_label,
        'predicted_label_basic': 'good' if is_good_basic else 'bad',
        'landmarks_detected': True,
        'issues': issues,
        'score': score_result.get('score', 0),
        'score_percentage': score_result.get('percentage', 0),
        'score_breakdown': score_result.get('breakdown', {})
    }

def evaluate_dataset(data_dir='data', use_enhanced_detection=True, return_results=False, filter_view=None, threshold_mode='standard'):
    """
    评估整个数据集（支持基础版和增强版检测）
    
    Args:
        data_dir: 数据集根目录
        use_enhanced_detection: 是否使用增强检测（多指标）
        return_results: 是否返回结果字典（用于综合报告）
        filter_view: 过滤视角类型 ('side', 'front', None=全部)
    """
    data_path = Path(data_dir)
    good_dir = data_path / 'good_posture'
    bad_dir = data_path / 'bad_posture'
    
    # Check if directories exist
    if not good_dir.exists():
        print(f"[ERROR] Error: {good_dir} directory does not exist")
        print("Please create data/good_posture/ directory and add good posture images")
        return
    
    if not bad_dir.exists():
        print(f"Error: {bad_dir} directory does not exist")
        print("Please create data/bad_posture/ directory and add bad posture images")
        return
    
    # 获取所有图像文件（支持嵌套文件夹结构）
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
    
    # 递归查找所有图像文件（支持子文件夹）
    def find_all_images(directory):
        """递归查找目录下所有图像文件"""
        images = []
        for item in directory.iterdir():
            if item.is_file() and item.suffix.lower() in image_extensions:
                images.append(item)
            elif item.is_dir():
                # 递归查找子文件夹
                images.extend(find_all_images(item))
        return images
    
    good_images = find_all_images(good_dir)
    bad_images = find_all_images(bad_dir)
    
    # Count samples (folders)
    good_folders = [d for d in good_dir.iterdir() if d.is_dir()]
    bad_folders = [d for d in bad_dir.iterdir() if d.is_dir()]
    
    print(f"\nDataset Statistics")
    print(f"{'='*70}")
    print(f"Good Posture:")
    print(f"  Number of samples (folders): {len(good_folders)}")
    print(f"  Total images: {len(good_images)}")
    if good_folders:
        avg_good = len(good_images) / len(good_folders)
        print(f"  Average per sample: {avg_good:.1f} images")
    print(f"\nBad Posture:")
    print(f"  Number of samples (folders): {len(bad_folders)}")
    print(f"  Total images: {len(bad_images)}")
    if bad_folders:
        avg_bad = len(bad_images) / len(bad_folders)
        print(f"  Average per sample: {avg_bad:.1f} images")
    print(f"\nTotal: {len(good_images) + len(bad_images)} images")
    
    if len(good_images) == 0 and len(bad_images) == 0:
        print("\n[ERROR] Dataset is empty! Please add image files.")
        return
    
    # Process all images
    print(f"\nStarting evaluation...")
    print(f"{'='*70}")
    
    y_true = []  # True labels
    y_pred = []  # Predicted labels
    results = []
    
    # Process good posture images
    detection_mode = "Enhanced" if use_enhanced_detection else "Basic"
    mode_note = f" [{threshold_mode}]" if threshold_mode != 'standard' else ""
    view_filter_note = f", {filter_view} view only" if filter_view else ""
    print(f"\nProcessing good posture images ({detection_mode} mode{mode_note}{view_filter_note})...")
    processed = 0
    for img_path in good_images:
        result = analyze_image(img_path, use_enhanced_detection, detect_view=(filter_view is not None), threshold_mode=threshold_mode)
        if result and result['landmarks_detected']:
            y_true.append('good')
            y_pred.append(result['predicted_label'])
            results.append({
                'image': img_path.name,
                'true_label': 'good',
                'predicted_label': result['predicted_label'],
                'predicted_label_basic': result.get('predicted_label_basic', result['predicted_label']),
                'neck_angle': result['neck_angle'],
                'torso_angle': result['torso_angle'],
                'shoulder_height_diff': result.get('shoulder_height_diff', 0),
                'hip_height_diff': result.get('hip_height_diff', 0),
                'head_tilt': result.get('head_tilt', 0),
                'is_aligned': result['is_aligned'],
                'issues': result.get('issues', [])
            })
            processed += 1
            if processed % 50 == 0:
                print(f"  Processed {processed}/{len(good_images)} images...")
        elif result and not result['landmarks_detected']:
            print(f"  Warning: {img_path.name}: No landmarks detected")
    
    # Process bad posture images
    print(f"\nProcessing bad posture images ({detection_mode} mode{mode_note}{view_filter_note})...")
    processed = 0
    for img_path in bad_images:
        result = analyze_image(img_path, use_enhanced_detection, detect_view=(filter_view is not None), threshold_mode=threshold_mode)
        
        # 如果指定了视角过滤，跳过不符合的图像
        if filter_view and result and result.get('view_type') != filter_view:
            continue
        if result and result['landmarks_detected']:
            y_true.append('bad')
            y_pred.append(result['predicted_label'])
            results.append({
                'image': img_path.name,
                'true_label': 'bad',
                'predicted_label': result['predicted_label'],
                'predicted_label_basic': result.get('predicted_label_basic', result['predicted_label']),
                'neck_angle': result['neck_angle'],
                'torso_angle': result['torso_angle'],
                'shoulder_height_diff': result.get('shoulder_height_diff', 0),
                'hip_height_diff': result.get('hip_height_diff', 0),
                'head_tilt': result.get('head_tilt', 0),
                'is_aligned': result['is_aligned'],
                'issues': result.get('issues', [])
            })
            processed += 1
            if processed % 50 == 0:
                print(f"  Processed {processed}/{len(bad_images)} images...")
        elif result and not result['landmarks_detected']:
            print(f"  Warning: {img_path.name}: No landmarks detected")
    
    if len(y_true) == 0:
        print("\nError: No images were successfully processed! Please check image format and content.")
        return
    
    # Convert to numeric labels (for sklearn)
    label_map = {'good': 1, 'bad': 0}
    y_true_numeric = [label_map[label] for label in y_true]
    y_pred_numeric = [label_map[label] for label in y_pred]
    
    # Calculate metrics for each class
    # Use sklearn's classification_report for accurate per-class metrics
    from sklearn.metrics import classification_report
    
    # Get classification report as dict
    report_dict = classification_report(
        y_true_numeric, 
        y_pred_numeric, 
        target_names=['bad', 'good'],
        output_dict=True,
        zero_division=0
    )
    
    # Extract metrics
    precision_good = report_dict['good']['precision']
    recall_good = report_dict['good']['recall']
    f1_good = report_dict['good']['f1-score']
    support_good = int(report_dict['good']['support'])
    
    precision_bad = report_dict['bad']['precision']
    recall_bad = report_dict['bad']['recall']
    f1_bad = report_dict['bad']['f1-score']
    support_bad = int(report_dict['bad']['support'])
    
    # Confusion matrix
    cm = confusion_matrix(y_true_numeric, y_pred_numeric)
    # cm format for labels [0, 1]: [[TN, FP], [FN, TP]]
    TN, FP = cm[0][0], cm[0][1]
    FN, TP = cm[1][0], cm[1][1]
    
    # Overall metrics from report
    accuracy = report_dict['accuracy']
    total_samples = len(y_true)
    
    # Macro and weighted averages from report (more accurate)
    macro_precision = report_dict['macro avg']['precision']
    macro_recall = report_dict['macro avg']['recall']
    macro_f1 = report_dict['macro avg']['f1-score']
    
    weighted_precision = report_dict['weighted avg']['precision']
    weighted_recall = report_dict['weighted avg']['recall']
    weighted_f1 = report_dict['weighted avg']['f1-score']
    
    # Print detailed report - matching the format in the image
    print("\n" + "="*70)
    print("Detailed Report:")
    print("="*70)
    # Header row
    print(f"{'':<12} {'precision':<12} {'recall':<12} {'f1-score':<12} {'support':<12}")
    print("-"*70)
    # Class rows
    print(f"{'good':<12} {precision_good:<12.2f} {recall_good:<12.2f} {f1_good:<12.2f} {support_good:<12}")
    print(f"{'bad':<12} {precision_bad:<12.2f} {recall_bad:<12.2f} {f1_bad:<12.2f} {support_bad:<12}")
    print("-"*70)
    # Accuracy row (no recall/f1 for accuracy)
    print(f"{'accuracy':<12} {accuracy:<12.2f} {'':<12} {'':<12} {total_samples:<12}")
    # Macro average
    print(f"{'macro avg':<12} {macro_precision:<12.2f} {macro_recall:<12.2f} {macro_f1:<12.2f} {total_samples:<12}")
    # Weighted average
    print(f"{'weighted avg':<12} {weighted_precision:<12.2f} {weighted_recall:<12.2f} {weighted_f1:<12.2f} {total_samples:<12}")
    
    # Confusion Matrix - matching the format in the image
    print("\n" + "="*70)
    print("Confusion Matrix:")
    print("="*70)
    # Header row
    print(f"{'':<25} {'Predicted good':<20} {'Predicted bad':<20}")
    print("-"*70)
    # Actual rows
    print(f"{'Actual good':<25} {TP:<20} {FN:<20}")
    print(f"{'Actual bad':<25} {FP:<20} {TN:<20}")
    
    # Additional statistics for enhanced detection
    if use_enhanced_detection:
        print("\n" + "="*70)
        print("Enhanced Detection Statistics:")
        print("="*70)
        
        # Count issues
        issue_counts = {}
        for r in results:
            for issue in r.get('issues', []):
                issue_counts[issue] = issue_counts.get(issue, 0) + 1
        
        if issue_counts:
            print("\nIssue Distribution:")
            for issue, count in sorted(issue_counts.items(), key=lambda x: x[1], reverse=True):
                print(f"  {issue}: {count} images")
        
        # 显示评分统计
        if results and any(r.get('score_percentage') is not None for r in results):
            scores = [r.get('score_percentage', 0) for r in results if r.get('score_percentage') is not None]
            if scores:
                avg_score = sum(scores) / len(scores)
                print(f"\nScore Statistics:")
                print(f"  Average score: {avg_score:.1f}%")
                print(f"  Min score: {min(scores)}%")
                print(f"  Max score: {max(scores)}%")
        
        # Compare with basic detection
        basic_correct = sum(1 for r in results if r['true_label'] == r['predicted_label_basic'])
        enhanced_correct = sum(1 for r in results if r['true_label'] == r['predicted_label'])
        
        print(f"\nComparison with Basic Detection:")
        print(f"  Basic accuracy: {basic_correct/len(results)*100:.2f}% ({basic_correct}/{len(results)})")
        print(f"  Enhanced accuracy: {enhanced_correct/len(results)*100:.2f}% ({enhanced_correct}/{len(results)})")
        improvement = enhanced_correct - basic_correct
        if improvement > 0:
            print(f"  Improvement: +{improvement} images ({improvement/len(results)*100:.2f}%)")
        elif improvement < 0:
            print(f"  Change: {improvement} images ({improvement/len(results)*100:.2f}%)")
        else:
            print(f"  No change")
    
    # Final summary with checkmark
    print("\n" + "="*70)
    print("Evaluation Complete! ✓")
    print("="*70)
    
    # Quick summary at the end (optional, can be removed if too verbose)
    print(f"\n📊 Quick Summary:")
    print(f"   Total Samples: {total_samples}")
    print(f"   Overall Accuracy: {accuracy*100:.2f}%")
    print(f"   Good Class: Precision={precision_good:.2f}, Recall={recall_good:.2f}, F1={f1_good:.2f}")
    print(f"   Bad Class: Precision={precision_bad:.2f}, Recall={recall_bad:.2f}, F1={f1_bad:.2f}")
    print(f"   Confusion: TP={TP}, TN={TN}, FP={FP}, FN={FN}")
    print("="*70)
    
    # Return results if requested
    if return_results:
        return {
            'accuracy': accuracy,
            'precision_good': precision_good,
            'recall_good': recall_good,
            'f1_good': f1_good,
            'precision_bad': precision_bad,
            'recall_bad': recall_bad,
            'f1_bad': f1_bad,
            'f1_macro': macro_f1,
            'total_samples': total_samples,
            'mode': 'enhanced' if use_enhanced_detection else 'basic'
        }

def generate_comprehensive_report():
    """
    生成综合报告：同时运行基础检测和增强检测，并生成合并报告
    """
    print("="*70)
    print("COMPREHENSIVE EVALUATION REPORT")
    print("="*70)
    print("\nThis report evaluates both detection modes:")
    print("1. Basic Detection (Side View): Neck + Torso angles")
    print("2. Enhanced Detection (Front View): Multiple indicators")
    print("\nNote: Current dataset contains side-view images only.")
    print("Enhanced detection results may be less accurate for side-view data.\n")
    
    # Run basic detection
    print("\n" + "="*70)
    print("PART 1: BASIC DETECTION (Side View Mode)")
    print("="*70)
    print("Detection: Neck angle + Torso angle")
    print("Recommended for: Side-view images (current dataset)")
    print("-"*70)
    
    basic_results = evaluate_dataset(use_enhanced_detection=False, return_results=True)
    
    # Run enhanced detection
    print("\n\n" + "="*70)
    print("PART 2: ENHANCED DETECTION (Front View Mode)")
    print("="*70)
    print("Detection: Neck + Torso + Shoulder + Hip + Head")
    print("Recommended for: Front-view images")
    print("Note: Current dataset is side-view, results may be less accurate")
    print("-"*70)
    
    enhanced_results = evaluate_dataset(use_enhanced_detection=True, return_results=True)
    
    # Summary comparison
    print("\n\n" + "="*70)
    print("SUMMARY COMPARISON")
    print("="*70)
    
    if basic_results and enhanced_results:
        print(f"\n{'Metric':<25} {'Basic (Side)':<20} {'Enhanced (Front)':<20}")
        print("-"*70)
        print(f"{'Accuracy':<25} {basic_results['accuracy']*100:<19.2f}% {enhanced_results['accuracy']*100:<19.2f}%")
        print(f"{'Good Precision':<25} {basic_results['precision_good']:<20.2f} {enhanced_results['precision_good']:<20.2f}")
        print(f"{'Good Recall':<25} {basic_results['recall_good']:<20.2f} {enhanced_results['recall_good']:<20.2f}")
        print(f"{'Bad Precision':<25} {basic_results['precision_bad']:<20.2f} {enhanced_results['precision_bad']:<20.2f}")
        print(f"{'Bad Recall':<25} {basic_results['recall_bad']:<20.2f} {enhanced_results['recall_bad']:<20.2f}")
        print(f"{'F1-Score (Macro)':<25} {basic_results['f1_macro']:<20.2f} {enhanced_results['f1_macro']:<20.2f}")
        
        print("\n" + "-"*70)
        print("RECOMMENDATION:")
        if basic_results['accuracy'] > enhanced_results['accuracy']:
            print(f"-> Use BASIC detection for current dataset (side-view images)")
            print(f"   Accuracy: {basic_results['accuracy']*100:.2f}% vs {enhanced_results['accuracy']*100:.2f}%")
        else:
            print(f"-> Enhanced detection shows better results")
        
        print("\n" + "-"*70)
        print("FOR YOUR WEBSITE:")
        print("-> Side view detected: Use BASIC detection (Part 1 results)")
        print("-> Front view detected: Use ENHANCED detection (Part 2 results)")
        print("-> System automatically switches based on camera angle")
    
    print("\n" + "="*70)
    print("COMPREHENSIVE EVALUATION COMPLETE!")
    print("="*70)

if __name__ == "__main__":
    import sys
    
    # Parse command line arguments
    use_enhanced = True  # Default to enhanced detection
    threshold_mode = 'standard'  # Default threshold mode
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--basic':
            use_enhanced = False
            print("Using BASIC detection (neck + torso angles only)\n")
        elif sys.argv[1] == '--enhanced':
            use_enhanced = True
            print("Using ENHANCED detection (multiple indicators)\n")
        elif sys.argv[1] == '--sci-relaxed':
            threshold_mode = 'sciRelaxed'
            print("Using SCI RELAXED mode (for early rehabilitation/severe patients)\n")
        elif sys.argv[1] == '--sci-strict':
            threshold_mode = 'sciStrict'
            print("Using SCI STRICT mode (for late rehabilitation/mild patients)\n")
        elif sys.argv[1] == '--compare':
            # Compare both modes
            print("="*70)
            print("BASIC Detection Mode (Neck + Torso angles only)")
            print("="*70)
            evaluate_dataset(use_enhanced_detection=False)
            
            print("\n\n" + "="*70)
            print("ENHANCED Detection Mode (Multiple indicators)")
            print("="*70)
            evaluate_dataset(use_enhanced_detection=True)
            sys.exit(0)
        elif sys.argv[1] == '--comprehensive' or sys.argv[1] == '--full':
            # Generate comprehensive report
            generate_comprehensive_report()
            sys.exit(0)
        elif sys.argv[1] == '--compare-modes':
            # Compare all threshold modes
            print("="*70)
            print("COMPARING ALL THRESHOLD MODES")
            print("="*70)
            for mode in ['standard', 'sciRelaxed', 'sciStrict']:
                print(f"\n\n{'='*70}")
                print(f"Mode: {mode.upper()}")
                print("="*70)
                evaluate_dataset(use_enhanced_detection=True, threshold_mode=mode)
            sys.exit(0)
    
    if use_enhanced:
        mode_desc = {
            'standard': 'Standard mode (healthy people)',
            'sciRelaxed': 'SCI Relaxed mode (early rehabilitation)',
            'sciStrict': 'SCI Strict mode (late rehabilitation)'
        }
        print(f"Using ENHANCED detection mode with {mode_desc.get(threshold_mode, 'standard')}")
        print("Use --basic for basic mode, --compare to compare both modes")
        print("Use --sci-relaxed for SCI relaxed mode, --sci-strict for SCI strict mode")
        print("Use --compare-modes to compare all threshold modes")
        print("Use --comprehensive for full report with both modes\n")
    
    evaluate_dataset(use_enhanced_detection=use_enhanced, threshold_mode=threshold_mode)

