// ============================================================================
// 康复仪表板模块 - Rehabilitation Dashboard Module
// ============================================================================
// 功能：康复进度可视化、趋势分析、里程碑系统
// ============================================================================

/**
 * 康复仪表板管理器
 */
class RehabilitationDashboard {
    constructor() {
        this.milestones = {
            bronze: { days: 3, achieved: false, date: null },
            silver: { days: 7, achieved: false, date: null },
            gold: { days: 30, achieved: false, date: null }
        };
        this.loadMilestones();
    }

    /**
     * 分析历史数据，生成周视图数据
     * @param {Array} history - 历史记录
     * @returns {Object} 周视图数据
     */
    generateWeekView(history) {
        const weekData = {
            labels: [],
            goodPosturePercentage: [],
            averageNeckAngle: [],
            averageTorsoAngle: [],
            totalDuration: []
        };

        // 获取过去7天的数据
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 按日期分组
        const dailyData = {};
        history.forEach(record => {
            const recordDate = new Date(record.startTime || record.date || Date.now());
            if (recordDate >= sevenDaysAgo) {
                const dateKey = recordDate.toISOString().split('T')[0];
                if (!dailyData[dateKey]) {
                    dailyData[dateKey] = {
                        records: [],
                        totalGood: 0,
                        totalBad: 0,
                        totalNeck: 0,
                        totalTorso: 0,
                        neckCount: 0,
                        torsoCount: 0,
                        totalDuration: 0
                    };
                }
                dailyData[dateKey].records.push(record);
                
                // 计算良好姿势百分比
                const goodPercent = record.summary?.goodPercentage || 
                    (record.goodTime && record.badTime ? 
                     (record.goodTime / (record.goodTime + record.badTime) * 100) : 
                     (record.goodFrames && record.badFrames ?
                      (record.goodFrames / (record.goodFrames + record.badFrames) * 100) : 0));
                
                if (goodPercent > 0) {
                    dailyData[dateKey].totalGood += goodPercent;
                }
                
                // 计算平均角度
                if (record.avgNeckAngle) {
                    dailyData[dateKey].totalNeck += record.avgNeckAngle;
                    dailyData[dateKey].neckCount++;
                }
                if (record.avgTorsoAngle) {
                    dailyData[dateKey].totalTorso += record.avgTorsoAngle;
                    dailyData[dateKey].torsoCount++;
                }
                
                // 累计时长
                dailyData[dateKey].totalDuration += record.duration || 0;
            }
        });

        // 生成过去7天的标签和数据
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateKey = date.toISOString().split('T')[0];
            const dayData = dailyData[dateKey] || { records: [], totalGood: 0, totalNeck: 0, totalTorso: 0, neckCount: 0, torsoCount: 0, totalDuration: 0 };
            
            weekData.labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
            weekData.goodPosturePercentage.push(dayData.records.length > 0 ? (dayData.totalGood / dayData.records.length) : 0);
            weekData.averageNeckAngle.push(dayData.neckCount > 0 ? (dayData.totalNeck / dayData.neckCount) : 0);
            weekData.averageTorsoAngle.push(dayData.torsoCount > 0 ? (dayData.totalTorso / dayData.torsoCount) : 0);
            weekData.totalDuration.push(dayData.totalDuration);
        }

        return weekData;
    }

    /**
     * 分析历史数据，生成月视图数据
     * @param {Array} history - 历史记录
     * @returns {Object} 月视图数据
     */
    generateMonthView(history) {
        const monthData = {
            labels: [],
            goodPosturePercentage: [],
            weeklyTrend: []
        };

        // 获取过去30天的数据
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 按周分组
        const weeklyData = {};
        history.forEach(record => {
            const recordDate = new Date(record.startTime || record.date || Date.now());
            if (recordDate >= thirtyDaysAgo) {
                const weekNumber = Math.floor((now - recordDate) / (7 * 24 * 60 * 60 * 1000));
                const weekKey = `week${weekNumber}`;
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = {
                        records: [],
                        totalGood: 0
                    };
                }
                weeklyData[weekKey].records.push(record);
                
                const goodPercent = record.summary?.goodPercentage || 
                    (record.goodTime && record.badTime ? 
                     (record.goodTime / (record.goodTime + record.badTime) * 100) : 
                     (record.goodFrames && record.badFrames ?
                      (record.goodFrames / (record.goodFrames + record.badFrames) * 100) : 0));
                
                if (goodPercent > 0) {
                    weeklyData[weekKey].totalGood += goodPercent;
                }
            }
        });

        // 生成过去4周的数据
        for (let i = 3; i >= 0; i--) {
            const weekKey = `week${i}`;
            const weekData = weeklyData[weekKey] || { records: [], totalGood: 0 };
            
            monthData.labels.push(`第${4-i}周`);
            monthData.goodPosturePercentage.push(weekData.records.length > 0 ? (weekData.totalGood / weekData.records.length) : 0);
        }

        return monthData;
    }

    /**
     * 检查并更新里程碑
     * @param {Array} history - 历史记录
     */
    updateMilestones(history) {
        if (!history || history.length === 0) return;

        // 按日期分组，检查连续天数
        const dailyRecords = {};
        history.forEach(record => {
            const recordDate = new Date(record.startTime || record.date || Date.now());
            const dateKey = recordDate.toISOString().split('T')[0];
            if (!dailyRecords[dateKey]) {
                dailyRecords[dateKey] = [];
            }
            dailyRecords[dateKey].push(record);
        });

        // 检查连续天数（需要每天都有良好姿势记录）
        const sortedDates = Object.keys(dailyRecords).sort().reverse();
        let consecutiveDays = 0;
        const today = new Date().toISOString().split('T')[0];

        for (let i = 0; i < sortedDates.length; i++) {
            const date = sortedDates[i];
            const dayRecords = dailyRecords[date];
            
            // 检查这一天是否有良好姿势（至少50%良好）
            const hasGoodPosture = dayRecords.some(record => {
                const goodPercent = record.summary?.goodPercentage || 
                    (record.goodTime && record.badTime ? 
                     (record.goodTime / (record.goodTime + record.badTime) * 100) : 
                     (record.goodFrames && record.badFrames ?
                      (record.goodFrames / (record.goodFrames + record.badFrames) * 100) : 0));
                return goodPercent >= 50;
            });

            if (hasGoodPosture) {
                consecutiveDays++;
            } else {
                break; // 中断连续天数
            }
        }

        // 更新里程碑
        if (consecutiveDays >= 3 && !this.milestones.bronze.achieved) {
            this.milestones.bronze.achieved = true;
            this.milestones.bronze.date = new Date().toISOString();
        }
        if (consecutiveDays >= 7 && !this.milestones.silver.achieved) {
            this.milestones.silver.achieved = true;
            this.milestones.silver.date = new Date().toISOString();
        }
        if (consecutiveDays >= 30 && !this.milestones.gold.achieved) {
            this.milestones.gold.achieved = true;
            this.milestones.gold.date = new Date().toISOString();
        }

        this.saveMilestones();
    }

    /**
     * 获取当前康复阶段
     * @param {Array} history - 历史记录
     * @returns {string} 康复阶段
     */
    getCurrentRehabStage(history) {
        if (!history || history.length < 7) {
            return 'early'; // 早期
        }

        // 分析最近7天的数据
        const recentData = history.slice(-7);
        const avgGoodPercentage = recentData.reduce((sum, record) => {
            const goodPercent = record.summary?.goodPercentage || 
                (record.goodTime && record.badTime ? 
                 (record.goodTime / (record.goodTime + record.badTime) * 100) : 
                 (record.goodFrames && record.badFrames ?
                  (record.goodFrames / (record.goodFrames + record.badFrames) * 100) : 0));
            return sum + goodPercent;
        }, 0) / recentData.length;

        if (avgGoodPercentage < 40) {
            return 'early'; // 早期：< 40%
        } else if (avgGoodPercentage < 70) {
            return 'middle'; // 中期：40-70%
        } else {
            return 'late'; // 后期：> 70%
        }
    }

    /**
     * 保存里程碑到localStorage
     */
    saveMilestones() {
        localStorage.setItem('rehab_milestones', JSON.stringify(this.milestones));
    }

    /**
     * 从localStorage加载里程碑
     */
    loadMilestones() {
        const saved = localStorage.getItem('rehab_milestones');
        if (saved) {
            try {
                this.milestones = JSON.parse(saved);
            } catch (e) {
                console.error('加载里程碑失败:', e);
            }
        }
    }

    /**
     * 获取里程碑信息
     * @returns {Object} 里程碑信息
     */
    getMilestones() {
        return this.milestones;
    }
}

// 创建全局实例
window.rehabilitationDashboard = new RehabilitationDashboard();

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RehabilitationDashboard;
}

