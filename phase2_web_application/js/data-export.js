// ============================================================================
// 数据导出和报告生成函数
// Data Export and Report Generation Functions
// ============================================================================
// 
// 这些函数需要从主组件传入必要的参数（如 language, currentSession, recordingData, history 等）
// These functions require necessary parameters to be passed from the main component
// ============================================================================

/**
 * 清理数据，移除无法序列化的值（NaN, Infinity, undefined等）
 */
function cleanDataForExport(data) {
    if (data === null || data === undefined) {
        return null;
    }
    
    if (typeof data === 'number') {
        // 处理NaN和Infinity
        if (isNaN(data) || !isFinite(data)) {
            return 0;
        }
        return data;
    }
    
    if (typeof data === 'string' || typeof data === 'boolean') {
        return data;
    }
    
    if (Array.isArray(data)) {
        return data.map(item => cleanDataForExport(item));
    }
    
    if (typeof data === 'object') {
        const cleaned = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                // 跳过函数和undefined
                if (typeof value !== 'function' && value !== undefined) {
                    cleaned[key] = cleanDataForExport(value);
                }
            }
        }
        return cleaned;
    }
    
    return null;
}

/**
 * 导出录制数据为 JSON
 * @param {Object} params - 参数对象
 * @param {Object} params.currentSession - 当前会话数据
 * @param {Array} params.recordingData - 录制数据数组
 * @param {string} params.language - 语言代码 ('zh' 或 'en')
 */
function exportRecording({ currentSession, recordingData, language }) {
    try {
        // 优先使用currentSession（包含完整快照和关键点坐标）
        if (currentSession && currentSession.snapshots && currentSession.snapshots.length > 0) {
            const exportData = {
                version: '2.0',
                exportDate: new Date().toISOString(),
                session: cleanDataForExport({
                    id: currentSession.id,
                    startTime: currentSession.startTime,
                    duration: currentSession.duration,
                    viewMode: currentSession.viewMode,
                    summary: {
                        goodFrames: currentSession.goodFrames,
                        badFrames: currentSession.badFrames,
                        goodPercentage: currentSession.goodFrames + currentSession.badFrames > 0
                            ? ((currentSession.goodFrames / (currentSession.goodFrames + currentSession.badFrames)) * 100).toFixed(1)
                            : 0
                    },
                    snapshots: currentSession.snapshots // 包含完整数据：角度、关键点坐标等
                })
            };
            
            let dataStr;
            try {
                dataStr = JSON.stringify(exportData, null, 2);
            } catch (error) {
                dataStr = JSON.stringify(exportData);
            }
            
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `posture_session_${new Date(currentSession.startTime).toISOString().split('T')[0]}_${currentSession.id}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            alert(language === 'zh' 
                ? '✅ 完整会话数据已导出（包含所有快照和关键点坐标）\n文件已保存到下载文件夹'
                : '✅ Complete session data exported (including all snapshots and landmarks)\nFile saved to downloads folder');
        } else if (recordingData.length > 0) {
            // 降级：使用recordingData（实时数据流）
            const exportData = {
                version: '2.0',
                exportDate: new Date().toISOString(),
                recordingData: cleanDataForExport(recordingData)
            };
            
            let dataStr;
            try {
                dataStr = JSON.stringify(exportData, null, 2);
            } catch (error) {
                dataStr = JSON.stringify(exportData);
            }
            
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `posture_recording_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            alert(language === 'zh' 
                ? '✅ 录制数据已导出\n文件已保存到下载文件夹'
                : '✅ Recording data exported\nFile saved to downloads folder');
        } else {
            alert(language === 'zh' ? '没有录制数据可导出' : 'No recording data to export');
        }
    } catch (error) {
        console.error('导出失败:', error);
        alert(language === 'zh' 
            ? `❌ 导出失败: ${error.message}`
            : `❌ Export failed: ${error.message}`);
    }
}

/**
 * 导出完整历史数据（包含所有记录的完整快照）
 * @param {Object} params - 参数对象
 * @param {Array} params.history - 历史记录数组
 * @param {string} params.language - 语言代码 ('zh' 或 'en')
 */
function exportAllHistoryData({ history, language }) {
    try {
        if (history.length === 0) {
            alert(language === 'zh' ? '没有历史记录可导出' : 'No history data to export');
            return;
        }
        
        // 清理和准备导出数据
        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalRecords: history.length,
            records: history.map(record => {
                // 清理每条记录的数据
                const cleanedRecord = {
                    id: record.id || null,
                    startTime: record.startTime || null,
                    endTime: record.endTime || null,
                    duration: record.duration || 0,
                    viewMode: record.viewMode || 'unknown',
                    summary: record.summary ? cleanDataForExport(record.summary) : null,
                    snapshots: record.snapshots ? cleanDataForExport(record.snapshots) : []
                };
                return cleanedRecord;
            })
        };
        
        // 序列化JSON，添加错误处理
        let dataStr;
        try {
            dataStr = JSON.stringify(exportData, null, 2);
        } catch (stringifyError) {
            console.error('JSON序列化失败:', stringifyError);
            // 如果格式化失败，尝试不格式化
            dataStr = JSON.stringify(exportData);
        }
        
        // 检查文件大小
        const fileSize = new Blob([dataStr]).size;
        const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
        
        if (fileSize > 50 * 1024 * 1024) { // 超过50MB
            const confirmMsg = language === 'zh' 
                ? `文件较大（${fileSizeMB}MB），可能影响打开速度。是否继续导出？`
                : `File is large (${fileSizeMB}MB), may affect opening speed. Continue?`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }
        
        // 创建Blob，确保UTF-8编码
        const dataBlob = new Blob([dataStr], { 
            type: 'application/json;charset=utf-8' 
        });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `posture_all_history_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 延迟释放URL，确保下载开始
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        
        alert(language === 'zh' 
            ? `✅ 已导出 ${history.length} 条完整历史记录（${fileSizeMB}MB，包含所有快照和关键点坐标）\n文件已保存到下载文件夹`
            : `✅ Exported ${history.length} complete history records (${fileSizeMB}MB, including all snapshots and landmarks)\nFile saved to downloads folder`);
    } catch (error) {
        console.error('导出失败:', error);
        alert(language === 'zh' 
            ? `❌ 导出失败: ${error.message}\n请检查控制台查看详细信息`
            : `❌ Export failed: ${error.message}\nPlease check console for details`);
    }
}

/**
 * 导出录制数据为 CSV
 * @param {Object} params - 参数对象
 * @param {Array} params.recordingData - 录制数据数组
 * @param {string} params.language - 语言代码 ('zh' 或 'en')
 */
function exportRecordingCSV({ recordingData, language }) {
    if (recordingData.length === 0) {
        alert(language === 'zh' ? '没有录制数据可导出' : 'No recording data to export');
        return;
    }
    
    // CSV 表头
    const headers = [
        'Timestamp',
        'View Mode',
        'Neck Angle (°)',
        'Torso Angle (°)',
        'Shoulder Tilt (px)',
        'Head Tilt (px)',
        'Good Posture',
        'Offset'
    ];
    
    // 转换为CSV格式
    const csvRows = [headers.join(',')];
    
    recordingData.forEach(row => {
        const values = [
            row.timestamp || '',
            row.viewMode || '',
            row.neckAngle?.toFixed(2) || '0',
            row.torsoAngle?.toFixed(2) || '0',
            row.shoulderTilt?.toFixed(2) || '0',
            row.headTilt?.toFixed(2) || '0',
            row.isGoodPosture ? 'Yes' : 'No',
            row.offset?.toFixed(2) || '0'
        ];
        csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `posture_recording_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * 导出历史记录为 CSV
 * @param {Object} params - 参数对象
 * @param {Array} params.history - 历史记录数组
 * @param {string} params.language - 语言代码 ('zh' 或 'en')
 */
function exportHistoryCSV({ history, language }) {
    if (history.length === 0) {
        alert(language === 'zh' ? '没有历史记录可导出' : 'No history data to export');
        return;
    }
    
    const headers = [
        'Date',
        'Good Posture Time (s)',
        'Bad Posture Time (s)',
        'Average Neck Angle (°)',
        'Average Torso Angle (°)',
        'Alert Count'
    ];
    
    const csvRows = [headers.join(',')];
    
    history.forEach(entry => {
        const values = [
            entry.date || '',
            entry.goodTime?.toFixed(2) || '0',
            entry.badTime?.toFixed(2) || '0',
            entry.avgNeck?.toFixed(2) || '0',
            entry.avgTorso?.toFixed(2) || '0',
            entry.alertCount || '0'
        ];
        csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `posture_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * 生成姿势分析报告
 * @param {Array} historyData - 历史数据数组
 * @param {string} lang - 语言代码 ('zh' 或 'en')
 * @returns {Object} 报告对象
 */
function generatePostureReport(historyData, lang = 'zh') {
    if (historyData.length === 0) {
        return {
            summary: lang === 'zh' ? '暂无数据' : 'No data',
            dailyStats: [],
            weeklyStats: null,
            trends: null
        };
    }
    
    // 按日期排序
    const sortedHistory = [...historyData].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
    
    // 每日统计
    const dailyStats = sortedHistory.map(entry => ({
        date: entry.date,
        goodTime: entry.goodTime || 0,
        badTime: entry.badTime || 0,
        totalTime: (entry.goodTime || 0) + (entry.badTime || 0),
        goodPercentage: entry.goodTime && entry.badTime 
            ? ((entry.goodTime / (entry.goodTime + entry.badTime)) * 100).toFixed(1)
            : '0',
        avgNeck: entry.avgNeck || 0,
        avgTorso: entry.avgTorso || 0,
        alertCount: entry.alertCount || 0
    }));
    
    // 每周统计（最近4周）
    const now = new Date();
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7 + 7));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weekData = sortedHistory.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekStart && entryDate < weekEnd;
        });
        
        if (weekData.length > 0) {
            const totalGood = weekData.reduce((sum, e) => sum + (e.goodTime || 0), 0);
            const totalBad = weekData.reduce((sum, e) => sum + (e.badTime || 0), 0);
            const totalAlerts = weekData.reduce((sum, e) => sum + (e.alertCount || 0), 0);
            const avgNeck = weekData.reduce((sum, e) => sum + (e.avgNeck || 0), 0) / weekData.length;
            const avgTorso = weekData.reduce((sum, e) => sum + (e.avgTorso || 0), 0) / weekData.length;
            
            weeks.push({
                week: i + 1,
                startDate: weekStart.toISOString().split('T')[0],
                endDate: new Date(weekEnd.getTime() - 1).toISOString().split('T')[0],
                totalGood,
                totalBad,
                totalTime: totalGood + totalBad,
                goodPercentage: ((totalGood / (totalGood + totalBad)) * 100).toFixed(1),
                avgNeck: avgNeck.toFixed(1),
                avgTorso: avgTorso.toFixed(1),
                totalAlerts,
                days: weekData.length
            });
        }
    }
    
    // 趋势分析
    const recentDays = sortedHistory.slice(-7);
    const olderDays = sortedHistory.slice(-14, -7);
    
    let trend = 'stable';
    if (recentDays.length > 0 && olderDays.length > 0) {
        const recentAvgGood = recentDays.reduce((sum, e) => sum + (e.goodTime || 0), 0) / recentDays.length;
        const olderAvgGood = olderDays.reduce((sum, e) => sum + (e.goodTime || 0), 0) / olderDays.length;
        const change = recentAvgGood - olderAvgGood;
        if (Math.abs(change) < 60) {
            trend = 'stable';
        } else {
            trend = change > 0 ? 'improving' : 'worsening';
        }
    }
    
    return {
        summary: {
            totalDays: sortedHistory.length,
            totalGoodTime: sortedHistory.reduce((sum, e) => sum + (e.goodTime || 0), 0),
            totalBadTime: sortedHistory.reduce((sum, e) => sum + (e.badTime || 0), 0),
            totalAlerts: sortedHistory.reduce((sum, e) => sum + (e.alertCount || 0), 0),
            overallGoodPercentage: sortedHistory.length > 0 
                ? ((sortedHistory.reduce((sum, e) => sum + (e.goodTime || 0), 0) / 
                    sortedHistory.reduce((sum, e) => sum + (e.goodTime || 0) + (e.badTime || 0), 0)) * 100).toFixed(1)
                : '0'
        },
        dailyStats,
        weeklyStats: weeks.length > 0 ? weeks : null,
        trends: {
            trend,
            recentAvgGood: recentDays.length > 0 
                ? (recentDays.reduce((sum, e) => sum + (e.goodTime || 0), 0) / recentDays.length).toFixed(1)
                : '0',
            olderAvgGood: olderDays.length > 0
                ? (olderDays.reduce((sum, e) => sum + (e.goodTime || 0), 0) / olderDays.length).toFixed(1)
                : '0'
        }
    };
}

/**
 * 格式化报告文本
 * @param {Object} report - 报告对象
 * @param {string} lang - 语言代码 ('zh' 或 'en')
 * @returns {string} 格式化的报告文本
 */
function formatReport(report, lang = 'zh') {
    const isZh = lang === 'zh';
    let text = '';
    
    text += isZh ? '='.repeat(50) + '\n' : '='.repeat(50) + '\n';
    text += isZh ? '姿势监测分析报告\n' : 'Posture Monitoring Analysis Report\n';
    text += isZh ? '='.repeat(50) + '\n\n' : '='.repeat(50) + '\n\n';
    
    // 总体摘要
    text += isZh ? '📊 总体摘要\n' : '📊 Summary\n';
    text += '-'.repeat(50) + '\n';
    text += isZh 
        ? `监测天数: ${report.summary.totalDays} 天\n`
        : `Monitoring Days: ${report.summary.totalDays} days\n`;
    text += isZh
        ? `总良好姿势时间: ${(report.summary.totalGoodTime / 3600).toFixed(2)} 小时\n`
        : `Total Good Posture Time: ${(report.summary.totalGoodTime / 3600).toFixed(2)} hours\n`;
    text += isZh
        ? `总不良姿势时间: ${(report.summary.totalBadTime / 3600).toFixed(2)} 小时\n`
        : `Total Bad Posture Time: ${(report.summary.totalBadTime / 3600).toFixed(2)} hours\n`;
    text += isZh
        ? `总体良好率: ${report.summary.overallGoodPercentage}%\n`
        : `Overall Good Rate: ${report.summary.overallGoodPercentage}%\n`;
    text += isZh
        ? `总警报次数: ${report.summary.totalAlerts}\n\n`
        : `Total Alerts: ${report.summary.totalAlerts}\n\n`;
    
    // 趋势分析
    if (report.trends) {
        text += isZh ? '📈 趋势分析\n' : '📈 Trend Analysis\n';
        text += '-'.repeat(50) + '\n';
        const trendText = report.trends.trend === 'improving' 
            ? (isZh ? '改善中' : 'Improving')
            : report.trends.trend === 'worsening'
            ? (isZh ? '恶化中' : 'Worsening')
            : (isZh ? '稳定' : 'Stable');
        text += isZh 
            ? `最近趋势: ${trendText}\n`
            : `Recent Trend: ${trendText}\n`;
        text += isZh
            ? `最近7天平均良好时间: ${report.trends.recentAvgGood} 秒\n`
            : `Last 7 Days Avg Good Time: ${report.trends.recentAvgGood} seconds\n`;
        text += isZh
            ? `之前7天平均良好时间: ${report.trends.olderAvgGood} 秒\n\n`
            : `Previous 7 Days Avg Good Time: ${report.trends.olderAvgGood} seconds\n\n`;
    }
    
    // 每周统计
    if (report.weeklyStats && report.weeklyStats.length > 0) {
        text += isZh ? '📅 每周统计\n' : '📅 Weekly Statistics\n';
        text += '-'.repeat(50) + '\n';
        report.weeklyStats.forEach(week => {
            text += isZh
                ? `第${week.week}周 (${week.startDate} ~ ${week.endDate}):\n`
                : `Week ${week.week} (${week.startDate} ~ ${week.endDate}):\n`;
            text += isZh
                ? `  良好时间: ${(week.totalGood / 3600).toFixed(2)} 小时\n`
                : `  Good Time: ${(week.totalGood / 3600).toFixed(2)} hours\n`;
            text += isZh
                ? `  良好率: ${week.goodPercentage}%\n`
                : `  Good Rate: ${week.goodPercentage}%\n`;
            text += isZh
                ? `  平均颈部角度: ${week.avgNeck}°\n`
                : `  Avg Neck Angle: ${week.avgNeck}°\n`;
            text += isZh
                ? `  平均躯干角度: ${week.avgTorso}°\n`
                : `  Avg Torso Angle: ${week.avgTorso}°\n`;
            text += isZh
                ? `  警报次数: ${week.totalAlerts}\n\n`
                : `  Alerts: ${week.totalAlerts}\n\n`;
        });
    }
    
    // 每日统计
    text += isZh ? '📆 每日统计\n' : '📆 Daily Statistics\n';
    text += '-'.repeat(50) + '\n';
    report.dailyStats.forEach(day => {
        text += `${day.date}:\n`;
        text += isZh
            ? `  良好时间: ${(day.goodTime / 60).toFixed(1)} 分钟 (${day.goodPercentage}%)\n`
            : `  Good Time: ${(day.goodTime / 60).toFixed(1)} minutes (${day.goodPercentage}%)\n`;
        text += isZh
            ? `  不良时间: ${(day.badTime / 60).toFixed(1)} 分钟\n`
            : `  Bad Time: ${(day.badTime / 60).toFixed(1)} minutes\n`;
        if (day.avgNeck > 0) {
            text += isZh
                ? `  平均颈部角度: ${day.avgNeck.toFixed(1)}°\n`
                : `  Avg Neck Angle: ${day.avgNeck.toFixed(1)}°\n`;
        }
        if (day.avgTorso > 0) {
            text += isZh
                ? `  平均躯干角度: ${day.avgTorso.toFixed(1)}°\n`
                : `  Avg Torso Angle: ${day.avgTorso.toFixed(1)}°\n`;
        }
        if (day.alertCount > 0) {
            text += isZh
                ? `  警报次数: ${day.alertCount}\n`
                : `  Alerts: ${day.alertCount}\n`;
        }
        text += '\n';
    });
    
    text += isZh 
        ? `\n报告生成时间: ${new Date().toLocaleString('zh-CN')}\n`
        : `\nReport Generated: ${new Date().toLocaleString('en-US')}\n`;
    
    return text;
}

/**
 * 导出录制的视频（如果支持）
 * @param {Object} params - 参数对象
 * @param {Array} params.recordingState - 录制状态对象（包含 chunks）
 * @param {Function} params.getSupportedMimeType - 获取支持的 MIME 类型函数
 */
function exportRecordingVideo({ recordingState, getSupportedMimeType }) {
    if (!recordingState.chunks || recordingState.chunks.length === 0) {
        alert('没有录制的视频可导出');
        return;
    }
    
    // 使用检测到的mimeType
    const mimeType = getSupportedMimeType();
    const blob = new Blob(recordingState.chunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // 根据mimeType设置文件扩展名
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
    link.download = `posture_video_${new Date().toISOString().split('T')[0]}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * 导出报告为 PDF
 * @param {Object} params - 参数对象
 * @param {number} params.neckInclination - 颈部倾斜角度
 * @param {number} params.torsoInclination - 躯干倾斜角度
 * @param {boolean} params.isGoodPosture - 姿势是否良好
 * @param {boolean} params.isAligned - 是否对齐
 * @param {number} params.goodFrames - 良好帧数
 * @param {number} params.badFrames - 不良帧数
 * @param {Array} params.history - 历史记录数组
 * @param {number} params.FPS - 帧率
 */
function exportReport({ neckInclination, torsoInclination, isGoodPosture, isAligned, goodFrames, badFrames, history, FPS }) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('姿势监测报告', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 20, 35);
    
    // Current status
    doc.setFontSize(14);
    doc.text('当前状态', 20, 50);
    doc.setFontSize(10);
    doc.text(`颈部角度: ${neckInclination.toFixed(1)}°`, 20, 60);
    doc.text(`躯干角度: ${torsoInclination.toFixed(1)}°`, 20, 67);
    doc.text(`姿势状态: ${isGoodPosture ? '良好' : '不良'}`, 20, 74);
    doc.text(`对齐状态: ${isAligned ? '已对齐' : '未对齐'}`, 20, 81);
    
    // Time statistics
    doc.setFontSize(14);
    doc.text('时间统计', 20, 95);
    doc.setFontSize(10);
    const goodTime = (goodFrames / FPS).toFixed(1);
    const badTime = (badFrames / FPS).toFixed(1);
    doc.text(`良好姿势时间: ${goodTime}秒`, 20, 105);
    doc.text(`不良姿势时间: ${badTime}秒`, 20, 112);
    
    // History
    if (history.length > 0) {
        doc.setFontSize(14);
        doc.text('历史记录', 20, 125);
        doc.setFontSize(10);
        let yPos = 135;
        history.slice(-10).forEach(entry => {
            const date = entry.startTime ? new Date(entry.startTime).toLocaleDateString('zh-CN') : entry.date || 'N/A';
            const goodTime = entry.summary ? entry.summary.goodPercentage : (entry.goodTime || 0);
            const badTime = entry.summary ? entry.summary.badPercentage : (entry.badTime || 0);
            doc.text(`${date}: 良好 ${goodTime}%, 不良 ${badTime}%`, 20, yPos);
            yPos += 7;
        });
    }
    
    doc.save(`posture_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

// 导出所有函数到全局作用域
window.cleanDataForExport = cleanDataForExport;
window.exportRecording = exportRecording;
window.exportAllHistoryData = exportAllHistoryData;
window.exportRecordingCSV = exportRecordingCSV;
window.exportHistoryCSV = exportHistoryCSV;
window.generatePostureReport = generatePostureReport;
window.formatReport = formatReport;
window.exportRecordingVideo = exportRecordingVideo;
window.exportReport = exportReport;

