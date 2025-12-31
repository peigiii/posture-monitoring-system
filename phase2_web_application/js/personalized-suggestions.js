// ============================================================================
// 个性化康复建议模块 - Personalized Rehabilitation Suggestions Module
// ============================================================================
// 功能：基于历史数据生成个性化康复建议
// ============================================================================

/**
 * 个性化康复建议生成器
 */
class PersonalizedSuggestions {
    constructor() {
        this.dailyTips = [
            { zh: '保持背部挺直，肩膀放松', en: 'Keep your back straight and shoulders relaxed' },
            { zh: '每小时起身活动5分钟', en: 'Get up and move for 5 minutes every hour' },
            { zh: '调整屏幕高度，使视线平视', en: 'Adjust screen height so your eyes look straight ahead' },
            { zh: '使用腰部支撑垫', en: 'Use a lumbar support cushion' },
            { zh: '进行颈部拉伸运动', en: 'Perform neck stretching exercises' },
            { zh: '加强核心力量训练', en: 'Strengthen your core muscles' },
            { zh: '保持双脚平放在地面上', en: 'Keep both feet flat on the ground' }
        ];
    }

    /**
     * 生成个性化建议
     * @param {Object} currentAnalysis - 当前分析结果
     * @param {Array} history - 历史记录
     * @param {string} language - 语言设置
     * @returns {Array} 建议列表
     */
    generateSuggestions(currentAnalysis, history, language = 'zh') {
        const suggestions = [];

        // 基于当前检测结果生成建议
        if (currentAnalysis) {
            // 颈部问题
            if (currentAnalysis.neckAngle && currentAnalysis.neckAngle > 40) {
                suggestions.push({
                    type: 'neck',
                    priority: 'high',
                    text: language === 'zh' 
                        ? '检测到颈部前倾，建议进行颈部拉伸运动，每小时做5-10次颈部后仰动作'
                        : 'Neck forward tilt detected. Try neck stretching exercises, 5-10 backward tilts per hour',
                    icon: '🦒'
                });
            }

            // 躯干问题
            if (currentAnalysis.torsoAngle && currentAnalysis.torsoAngle > 15) {
                suggestions.push({
                    type: 'torso',
                    priority: 'high',
                    text: language === 'zh'
                        ? '检测到躯干前倾，建议调整座椅高度，使用腰部支撑，加强核心力量训练'
                        : 'Torso forward tilt detected. Adjust seat height, use lumbar support, strengthen core muscles',
                    icon: '💪'
                });
            }

            // 肩膀对称性问题
            if (currentAnalysis.shoulderTilt && currentAnalysis.shoulderTilt > 30) {
                suggestions.push({
                    type: 'shoulder',
                    priority: 'medium',
                    text: language === 'zh'
                        ? '检测到肩膀不对称，建议调整坐姿，确保双肩在同一水平线上'
                        : 'Shoulder asymmetry detected. Adjust your sitting posture to keep both shoulders level',
                    icon: '⚖️'
                });
            }

            // 头部倾斜问题
            if (currentAnalysis.headTilt && currentAnalysis.headTilt > 25) {
                suggestions.push({
                    type: 'head',
                    priority: 'medium',
                    text: language === 'zh'
                        ? '检测到头部倾斜，建议调整屏幕位置，保持头部正直'
                        : 'Head tilt detected. Adjust screen position to keep your head straight',
                    icon: '👤'
                });
            }
        }

        // 基于历史数据生成建议
        if (history && history.length > 0) {
            const recentHistory = history.slice(-7); // 最近7天
            
            // 分析最常见的问题
            const problemCounts = {
                neck: 0,
                torso: 0,
                shoulder: 0,
                head: 0
            };

            recentHistory.forEach(record => {
                if (record.avgNeckAngle && record.avgNeckAngle > 40) problemCounts.neck++;
                if (record.avgTorsoAngle && record.avgTorsoAngle > 15) problemCounts.torso++;
                if (record.shoulderTilt && record.shoulderTilt > 30) problemCounts.shoulder++;
                if (record.headTilt && record.headTilt > 25) problemCounts.head++;
            });

            // 找出最常见的问题
            const mostCommonProblem = Object.entries(problemCounts)
                .sort((a, b) => b[1] - a[1])[0];

            if (mostCommonProblem && mostCommonProblem[1] >= 3) {
                const problemType = mostCommonProblem[0];
                
                switch(problemType) {
                    case 'neck':
                        suggestions.push({
                            type: 'neck',
                            priority: 'high',
                            text: language === 'zh'
                                ? '根据您的历史数据，颈部前倾是主要问题。建议每天进行颈部强化训练，包括颈部后仰、左右转动等动作'
                                : 'Based on your history, neck forward tilt is the main issue. Perform daily neck strengthening exercises including backward tilts and rotations',
                            icon: '📊'
                        });
                        break;
                    case 'torso':
                        suggestions.push({
                            type: 'torso',
                            priority: 'high',
                            text: language === 'zh'
                                ? '根据您的历史数据，躯干前倾是主要问题。建议加强核心力量训练，如平板支撑、仰卧起坐等'
                                : 'Based on your history, torso forward tilt is the main issue. Strengthen your core with planks and sit-ups',
                            icon: '📊'
                        });
                        break;
                    case 'shoulder':
                        suggestions.push({
                            type: 'shoulder',
                            priority: 'medium',
                            text: language === 'zh'
                                ? '根据您的历史数据，肩膀不对称是常见问题。建议进行肩部拉伸和强化训练'
                                : 'Based on your history, shoulder asymmetry is common. Perform shoulder stretches and strengthening exercises',
                            icon: '📊'
                        });
                        break;
                }
            }

            // 分析改善趋势
            if (recentHistory.length >= 3) {
                const firstHalf = recentHistory.slice(0, Math.floor(recentHistory.length / 2));
                const secondHalf = recentHistory.slice(Math.floor(recentHistory.length / 2));

                const avgFirst = this.calculateAverageGoodPercentage(firstHalf);
                const avgSecond = this.calculateAverageGoodPercentage(secondHalf);

                if (avgSecond > avgFirst + 5) {
                    suggestions.push({
                        type: 'encouragement',
                        priority: 'low',
                        text: language === 'zh'
                            ? '🎉 太好了！您的姿势质量正在改善，继续保持！'
                            : '🎉 Great! Your posture quality is improving, keep it up!',
                        icon: '🎉'
                    });
                } else if (avgSecond < avgFirst - 5) {
                    suggestions.push({
                        type: 'warning',
                        priority: 'medium',
                        text: language === 'zh'
                            ? '⚠️ 最近姿势质量有所下降，建议增加监测时间，注意保持良好姿势'
                            : '⚠️ Posture quality has declined recently. Increase monitoring time and maintain good posture',
                        icon: '⚠️'
                    });
                }
            }
        }

        // 如果没有特定建议，提供通用建议
        if (suggestions.length === 0) {
            suggestions.push({
                type: 'general',
                priority: 'low',
                text: language === 'zh'
                    ? '💡 保持良好的坐姿习惯，每小时起身活动一下'
                    : '💡 Maintain good sitting habits and get up every hour',
                icon: '💡'
            });
        }

        // 按优先级排序
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

        return suggestions;
    }

    /**
     * 计算平均良好姿势百分比
     * @param {Array} records - 记录数组
     * @returns {number} 平均百分比
     */
    calculateAverageGoodPercentage(records) {
        if (!records || records.length === 0) return 0;

        const total = records.reduce((sum, record) => {
            const goodPercent = record.summary?.goodPercentage || 
                (record.goodTime && record.badTime ? 
                 (record.goodTime / (record.goodTime + record.badTime) * 100) : 
                 (record.goodFrames && record.badFrames ?
                  (record.goodFrames / (record.goodFrames + record.badFrames) * 100) : 0));
            return sum + goodPercent;
        }, 0);

        return total / records.length;
    }

    /**
     * 获取每日小贴士
     * @param {string} language - 语言设置
     * @returns {string} 小贴士文本
     */
    getDailyTip(language = 'zh') {
        const today = new Date().getDate();
        const tipIndex = today % this.dailyTips.length;
        return this.dailyTips[tipIndex][language];
    }
}

// 创建全局实例
window.personalizedSuggestions = new PersonalizedSuggestions();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalizedSuggestions;
}

