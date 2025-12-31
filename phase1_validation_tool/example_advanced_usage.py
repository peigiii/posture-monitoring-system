"""
Example: Using Advanced Algorithms
示例：使用高级算法

This script demonstrates how to use the advanced algorithms ported from JavaScript.
此脚本演示如何使用从 JavaScript 移植的高级算法。
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from algorithms import (
    AngleSmoother,
    HysteresisEvaluator,
    AdaptiveThresholdManager,
    calculate_angle_precise
)


def example_angle_smoother():
    """Example: Using AngleSmoother for real-time smoothing"""
    print("=" * 70)
    print("Example 1: Angle Smoother")
    print("=" * 70)
    
    smoother = AngleSmoother(window_size=10)
    
    # Simulate noisy angle measurements
    raw_measurements = [
        (35.2, 12.1),
        (38.5, 14.3),
        (36.1, 11.8),
        (39.2, 15.1),
        (37.4, 13.2),
    ]
    
    print("\nRaw vs Smoothed Angles:")
    print(f"{'Frame':<10} {'Raw Neck':<15} {'Raw Torso':<15} {'Smooth Neck':<15} {'Smooth Torso':<15}")
    print("-" * 70)
    
    for i, (neck, torso) in enumerate(raw_measurements):
        smoothed = smoother.smooth(neck, torso)
        print(f"{i+1:<10} {neck:<15.1f} {torso:<15.1f} {smoothed['neck']:<15.1f} {smoothed['torso']:<15.1f}")
    
    print("\nBenefit: Smoothed angles reduce jitter and false positives!")


def example_hysteresis_evaluator():
    """Example: Using HysteresisEvaluator to prevent state flickering"""
    print("\n\n" + "=" * 70)
    print("Example 2: Hysteresis Evaluator")
    print("=" * 70)
    
    evaluator = HysteresisEvaluator(
        neck_threshold=40,
        torso_threshold=15,
        hysteresis=2.0
    )
    
    # Simulate angles near threshold boundary
    test_angles = [
        (38, 13, "Below threshold"),
        (39, 14, "Still below"),
        (41, 15, "Slightly above - but within hysteresis"),
        (42, 16, "Above threshold + hysteresis - should switch to BAD"),
        (41, 15, "Back to threshold - but within hysteresis"),
        (37, 12, "Below threshold - hysteresis - should switch to GOOD"),
    ]
    
    print("\nState Transitions with Hysteresis:")
    print(f"{'Neck':<10} {'Torso':<10} {'State':<15} {'Note':<40}")
    print("-" * 70)
    
    for neck, torso, note in test_angles:
        is_good = evaluator.evaluate(neck, torso)
        state = "GOOD" if is_good else "BAD"
        print(f"{neck:<10} {torso:<10} {state:<15} {note:<40}")
    
    print("\nBenefit: Prevents rapid state switching at threshold boundaries!")


def example_adaptive_threshold():
    """Example: Using AdaptiveThresholdManager for rehabilitation"""
    print("\n\n" + "=" * 70)
    print("Example 3: Adaptive Threshold Manager")
    print("=" * 70)
    
    manager = AdaptiveThresholdManager(
        base_neck_threshold=40,
        base_torso_threshold=15
    )
    
    # Simulate rehabilitation progress
    stages = ['early', 'middle', 'late']
    
    print("\nThresholds at Different Rehabilitation Stages:")
    print(f"{'Stage':<20} {'Neck Threshold':<20} {'Torso Threshold':<20}")
    print("-" * 70)
    
    for stage in stages:
        manager.set_rehab_level(stage)
        thresholds = manager.get_thresholds()
        description = manager.get_rehab_level_description('en')
        
        print(f"{description:<20} {thresholds['neck']:<20.1f} {thresholds['torso']:<20.1f}")
    
    print("\nBenefit: Automatically adjusts thresholds for SCI patients!")


def example_high_precision_angle():
    """Example: Using high-precision angle calculation"""
    print("\n\n" + "=" * 70)
    print("Example 4: High-Precision Angle Calculation")
    print("=" * 70)
    
    # Define test points
    shoulder = {'x': 320, 'y': 240}
    ear = {'x': 350, 'y': 180}
    reference = {'x': 320, 'y': 140}  # Point above shoulder
    
    # Calculate angle
    angle = calculate_angle_precise(shoulder, ear, reference)
    
    print(f"\nShoulder: ({shoulder['x']}, {shoulder['y']})")
    print(f"Ear: ({ear['x']}, {ear['y']})")
    print(f"Reference: ({reference['x']}, {reference['y']})")
    print(f"\nCalculated Angle: {angle:.1f}°")
    print("\nBenefit: ±0.5° precision (vs ±3° with basic method)!")


def example_combined_usage():
    """Example: Combining all algorithms for robust detection"""
    print("\n\n" + "=" * 70)
    print("Example 5: Combined Usage (Production-Ready)")
    print("=" * 70)
    
    # Initialize all components
    smoother = AngleSmoother(window_size=10)
    evaluator = HysteresisEvaluator(neck_threshold=40, torso_threshold=15, hysteresis=2.0)
    adaptive_mgr = AdaptiveThresholdManager(base_neck_threshold=40, base_torso_threshold=15)
    
    # Set rehabilitation stage
    adaptive_mgr.set_rehab_level('middle')
    thresholds = adaptive_mgr.get_thresholds()
    evaluator.update_thresholds(thresholds['neck'], thresholds['torso'])
    
    print(f"\nConfiguration:")
    print(f"  Rehabilitation Stage: Middle")
    print(f"  Neck Threshold: {thresholds['neck']:.1f}°")
    print(f"  Torso Threshold: {thresholds['torso']:.1f}°")
    print(f"  Hysteresis: 2.0°")
    print(f"  Smoothing Window: 10 frames")
    
    # Simulate frame-by-frame processing
    print("\nProcessing Frames:")
    print(f"{'Frame':<10} {'Raw Neck':<12} {'Raw Torso':<12} {'Smooth Neck':<15} {'Smooth Torso':<15} {'State':<10}")
    print("-" * 80)
    
    raw_frames = [
        (45, 20),
        (47, 22),
        (46, 21),
        (48, 23),
        (49, 24),
        (47, 22),
        (45, 20),
        (43, 18),
        (41, 16),
        (39, 14),
    ]
    
    for i, (raw_neck, raw_torso) in enumerate(raw_frames):
        # Step 1: Smooth angles
        smoothed = smoother.smooth(raw_neck, raw_torso)
        
        # Step 2: Evaluate with hysteresis
        is_good = evaluator.evaluate(smoothed['neck'], smoothed['torso'])
        state = "GOOD" if is_good else "BAD"
        
        print(f"{i+1:<10} {raw_neck:<12.1f} {raw_torso:<12.1f} {smoothed['neck']:<15.1f} {smoothed['torso']:<15.1f} {state:<10}")
    
    print("\nBenefit: Robust, accurate, and adaptive posture detection!")


if __name__ == "__main__":
    print("\n")
    print("*" * 70)
    print("*" + " " * 68 + "*")
    print("*" + " " * 15 + "ADVANCED ALGORITHMS EXAMPLES" + " " * 25 + "*")
    print("*" + " " * 68 + "*")
    print("*" * 70)
    
    example_angle_smoother()
    example_hysteresis_evaluator()
    example_adaptive_threshold()
    example_high_precision_angle()
    example_combined_usage()
    
    print("\n\n" + "=" * 70)
    print("All examples completed successfully!")
    print("=" * 70)
    print("\nTo use these algorithms in your code:")
    print("  from algorithms import AngleSmoother, HysteresisEvaluator, ...")
    print("\nFor more details, see: src/python/algorithms.py")
    print("=" * 70 + "\n")

