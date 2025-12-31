// ============================================================================
// 数据处理函数 (DATA HANDLING FUNCTIONS)
// ============================================================================
// 包含所有与数据存储、加载、删除相关的函数
// ============================================================================

/**
 * 检查localStorage存储空间
 * @returns {Object} 存储空间信息 {usage, limit, percentage, warning}
 */
function checkStorageSpace() {
    try {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        // localStorage通常限制为5-10MB，这里检查是否超过4MB
        const limit = 4 * 1024 * 1024; // 4MB
        const usage = total;
        const percentage = (usage / limit * 100).toFixed(1);
        
        return {
            usage: usage,
            limit: limit,
            percentage: percentage,
            warning: usage > limit * 0.8 // 超过80%时警告
        };
    } catch (error) {
        console.error('检查存储空间失败:', error);
        return { usage: 0, limit: 0, percentage: 0, warning: false };
    }
}

/**
 * 加载历史记录
 * @returns {Array} 历史记录数组
 */
function loadHistory() {
    try {
        const saved = localStorage.getItem('postureHistory');
        if (saved) {
            return JSON.parse(saved);
        }
        return [];
    } catch (error) {
        console.error('加载历史记录失败:', error);
        return [];
    }
}

/**
 * 保存历史记录（带压缩和存储空间检查）
 * @param {Object} newRecord - 新记录
 * @param {Array} history - 当前历史记录数组
 * @param {Function} setHistory - 更新历史记录的状态函数
 * @param {string} language - 语言设置
 * @param {Function} formatDuration - 格式化时长函数
 */
function saveHistory(newRecord, history, setHistory, language, formatDuration) {
    try {
        const updatedHistory = [newRecord, ...history];
        // 只保留最近30天的记录
        const filtered = updatedHistory.filter(record => {
            const recordDate = new Date(record.startTime);
            const daysDiff = (new Date() - recordDate) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
        });
        
        // 检查存储空间
        const storageInfo = checkStorageSpace();
        if (storageInfo.warning) {
            const msg = language === 'zh' 
                ? `⚠️ 存储空间不足（已使用${storageInfo.percentage}%），建议导出并清理旧数据`
                : `⚠️ Storage space low (${storageInfo.percentage}% used), consider exporting and cleaning old data`;
            console.warn(msg);
        }
        
        // 尝试保存（如果失败，可能是存储空间不足）
        try {
            localStorage.setItem('postureHistory', JSON.stringify(filtered));
            setHistory(filtered);
            console.log('✅ 记录已保存');
            const msg = language === 'zh' 
                ? `录制完成！\n时长: ${formatDuration(newRecord.duration)}秒\n良好姿势: ${newRecord.summary.goodPercentage}%`
                : `Recording completed!\nDuration: ${formatDuration(newRecord.duration)}s\nGood posture: ${newRecord.summary.goodPercentage}%`;
            alert(msg);
        } catch (quotaError) {
            // 存储空间不足，尝试清理更旧的数据
            if (quotaError.name === 'QuotaExceededError') {
                console.warn('存储空间不足，尝试清理更旧的数据...');
                // 只保留最近7天的数据
                const emergencyFiltered = filtered.filter(record => {
                    const recordDate = new Date(record.startTime);
                    const daysDiff = (new Date() - recordDate) / (1000 * 60 * 60 * 24);
                    return daysDiff <= 7;
                });
                localStorage.setItem('postureHistory', JSON.stringify(emergencyFiltered));
                setHistory(emergencyFiltered);
                alert(language === 'zh' 
                    ? '⚠️ 存储空间不足，已自动清理旧数据（仅保留最近7天）\n建议导出数据后删除不需要的记录'
                    : '⚠️ Storage space full, auto-cleaned old data (keeping last 7 days only)\nPlease export data and delete unnecessary records');
            } else {
                throw quotaError;
            }
        }
    } catch (error) {
        console.error('❌ 保存失败:', error);
        alert((language === 'zh' ? '保存失败: ' : 'Save failed: ') + error.message);
    }
}

/**
 * 工具函数：格式化时长
 * @param {number} seconds - 秒数
 * @param {string} language - 语言设置
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(seconds, language = 'zh') {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return language === 'zh' 
            ? `${hrs}小时${mins}分${secs}秒`
            : `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
        return language === 'zh' 
            ? `${mins}分${secs}秒`
            : `${mins}m ${secs}s`;
    } else {
        return language === 'zh' 
            ? `${secs}秒`
            : `${secs}s`;
    }
}

/**
 * 删除记录
 * @param {string|number} id - 记录ID
 * @param {Array} history - 当前历史记录数组
 * @param {Function} setHistory - 更新历史记录的状态函数
 * @param {string} language - 语言设置
 */
function deleteRecord(id, history, setHistory, language) {
    const msg = language === 'zh' ? '确定删除这条记录吗？' : 'Are you sure you want to delete this record?';
    if (confirm(msg)) {
        const updated = history.filter(r => r.id !== id);
        localStorage.setItem('postureHistory', JSON.stringify(updated));
        setHistory(updated);
        alert(language === 'zh' ? '✅ 已删除' : '✅ Deleted');
    }
}

/**
 * 导出单个记录的报告（文本格式，UTF-8编码）
 * @param {Object} record - 记录对象
 * @param {string} language - 语言设置
 * @param {Function} formatDuration - 格式化时长函数
 */
function exportRecordReport(record, language, formatDuration) {
    try {
        // 安全检查：确保 record 和 summary 存在
        if (!record) {
            throw new Error('记录数据不存在');
        }
        
        // 如果 summary 不存在，尝试从其他属性计算或使用默认值
        const summary = record.summary || {};
        const goodFrames = record.goodFrames || 0;
        const badFrames = record.badFrames || 0;
        const totalFrames = goodFrames + badFrames;
        
        // 计算百分比（如果 summary 中没有）
        const goodPercentage = summary.goodPercentage !== undefined 
            ? summary.goodPercentage 
            : (totalFrames > 0 ? ((goodFrames / totalFrames) * 100).toFixed(1) : 0);
        const badPercentage = summary.badPercentage !== undefined 
            ? summary.badPercentage 
            : (totalFrames > 0 ? ((badFrames / totalFrames) * 100).toFixed(1) : 0);
        
        // 获取平均角度（如果 summary 中没有，尝试从其他属性获取）
        const avgNeckAngle = summary.avgNeckAngle !== undefined 
            ? summary.avgNeckAngle 
            : (record.avgNeck !== undefined ? record.avgNeck : 0);
        const avgTorsoAngle = summary.avgTorsoAngle !== undefined 
            ? summary.avgTorsoAngle 
            : (record.avgTorso !== undefined ? record.avgTorso : 0);
        
        // 获取警报次数
        const alertCount = summary.alertCount !== undefined 
            ? summary.alertCount 
            : (record.alertCount !== undefined ? record.alertCount : 0);
        
        // 获取检测模式
        const viewMode = record.viewMode || 'side';
        const viewModeText = language === 'zh' 
            ? (viewMode === 'side' ? '侧面检测' : '正面检测')
            : (viewMode === 'side' ? 'Side View' : 'Front View');
        
        const date = record.startTime ? new Date(record.startTime) : (record.date ? new Date(record.date) : new Date());
        const dateStr = date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US');
        const timeStr = date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US');
        
        const reportText = language === 'zh' ? `
═══════════════════════════════════════
        姿势监测报告
═══════════════════════════════════════

📅 日期: ${dateStr}
⏰ 时间: ${timeStr}
⏱️  时长: ${formatDuration(record.duration || 0, language)}
📊 检测模式: ${viewModeText}

─────────────────────────────────────

📈 姿势统计

✓ 良好姿势: ${goodPercentage}%
✗ 不良姿势: ${badPercentage}%

总帧数: ${totalFrames}
良好帧数: ${goodFrames}
不良帧数: ${badFrames}

─────────────────────────────────────

📐 平均角度数据

颈部角度: ${avgNeckAngle.toFixed(1)}°
躯干角度: ${avgTorsoAngle.toFixed(1)}°

─────────────────────────────────────

⚠️  警报统计

警报次数: ${alertCount}次
${alertCount > 0 
  ? '建议: 注意改善坐姿，避免长时间保持不良姿势' 
  : '表现优秀: 本次监测未触发警报'}

─────────────────────────────────────

💡 改善建议

${avgNeckAngle > DEFAULT_NECK_THRESHOLD ? '• 颈部前倾较严重，建议每30分钟做颈部拉伸\n' : ''}${avgTorsoAngle > DEFAULT_TORSO_THRESHOLD ? '• 躯干前倾明显，建议加强核心肌群训练\n' : ''}${parseFloat(goodPercentage) < 50 ? '• 良好姿势占比不足50%，建议增加坐姿意识\n' : ''}${parseFloat(goodPercentage) >= 70 ? '• 姿势保持良好，继续保持！\n' : ''}
═══════════════════════════════════════
报告生成时间: ${new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')}
    `.trim() : `
═══════════════════════════════════════
        Posture Monitoring Report
═══════════════════════════════════════

📅 Date: ${dateStr}
⏰ Time: ${timeStr}
⏱️  Duration: ${formatDuration(record.duration || 0, language)}
📊 Detection Mode: ${viewModeText}

─────────────────────────────────────

📈 Posture Statistics

✓ Good Posture: ${goodPercentage}%
✗ Bad Posture: ${badPercentage}%

Total Frames: ${totalFrames}
Good Frames: ${goodFrames}
Bad Frames: ${badFrames}

─────────────────────────────────────

📐 Average Angle Data

Neck Angle: ${avgNeckAngle.toFixed(1)}°
Torso Angle: ${avgTorsoAngle.toFixed(1)}°

─────────────────────────────────────

⚠️  Alert Statistics

Alert Count: ${alertCount}
${alertCount > 0 
  ? 'Suggestion: Pay attention to improving sitting posture, avoid maintaining bad posture for long periods' 
  : 'Excellent: No alerts triggered during this monitoring session'}

─────────────────────────────────────

💡 Improvement Suggestions

${avgNeckAngle > DEFAULT_NECK_THRESHOLD ? '• Severe neck forward tilt, suggest neck stretches every 30 minutes\n' : ''}${avgTorsoAngle > DEFAULT_TORSO_THRESHOLD ? '• Significant torso forward tilt, suggest core muscle training\n' : ''}${parseFloat(goodPercentage) < 50 ? '• Good posture percentage below 50%, suggest increasing posture awareness\n' : ''}${parseFloat(goodPercentage) >= 70 ? '• Posture maintained well, keep it up!\n' : ''}
═══════════════════════════════════════
Report Generated: ${new Date().toLocaleString('en-US')}
    `.trim();
        
        // 关键：添加 UTF-8 BOM 防止乱码
        const blob = new Blob(['\ufeff' + reportText], { 
            type: 'text/plain;charset=utf-8' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = language === 'zh' 
            ? `姿势报告_${dateStr.replace(/\//g, '-')}.txt`
            : `Posture_Report_${dateStr.replace(/\//g, '-')}.txt`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(language === 'zh' ? '✅ 报告已导出到下载文件夹' : '✅ Report exported to downloads folder');
    } catch (error) {
        console.error('❌ 导出失败:', error);
        alert((language === 'zh' ? '导出失败: ' : 'Export failed: ') + error.message);
    }
}

/**
 * 导出单个记录的CSV
 * @param {Object} record - 记录对象
 * @param {string} language - 语言设置
 */
function exportRecordCSV(record, language) {
    try {
        // 安全检查
        if (!record) {
            throw new Error('记录数据不存在');
        }
        
        // 检查是否有快照数据
        if (!record.snapshots || !Array.isArray(record.snapshots) || record.snapshots.length === 0) {
            alert(language === 'zh' 
                ? '⚠️ 该记录没有详细快照数据，无法导出CSV' 
                : '⚠️ This record has no snapshot data, cannot export CSV');
            return;
        }
        
        const csvHeader = language === 'zh' 
            ? '时间戳,视角,姿势状态,颈部角度,躯干角度,肩膀倾斜,头部倾斜\n'
            : 'Timestamp,View Mode,Posture Status,Neck Angle,Torso Angle,Shoulder Tilt,Head Tilt\n';
        
        const csvRows = record.snapshots.map(snap => {
            const timestamp = new Date(snap.timestamp || Date.now()).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
            const viewMode = language === 'zh' 
                ? (snap.viewMode === 'side' ? '侧面' : '正面')
                : (snap.viewMode === 'side' ? 'Side' : 'Front');
            const posture = language === 'zh' 
                ? (snap.isGoodPosture ? '良好' : '不良')
                : (snap.isGoodPosture ? 'Good' : 'Bad');
            return `${timestamp},${viewMode},${posture},${snap.neckAngle !== undefined ? snap.neckAngle.toFixed(2) : 'N/A'},${snap.torsoAngle !== undefined ? snap.torsoAngle.toFixed(2) : 'N/A'},${snap.shoulderTilt !== undefined ? snap.shoulderTilt.toFixed(2) : 'N/A'},${snap.headTilt !== undefined ? snap.headTilt.toFixed(2) : 'N/A'}`;
        }).join('\n');
        
        // 关键：添加 UTF-8 BOM
        const csvContent = '\ufeff' + csvHeader + csvRows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = record.startTime 
            ? new Date(record.startTime).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US').replace(/\//g, '-')
            : (record.date ? new Date(record.date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US').replace(/\//g, '-') : new Date().toLocaleDateString().replace(/\//g, '-'));
        const fileName = language === 'zh' 
            ? `详细数据_${date}.csv`
            : `Detailed_Data_${date}.csv`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(language === 'zh' ? '✅ CSV已导出，可用Excel打开' : '✅ CSV exported, can be opened in Excel');
    } catch (error) {
        console.error('❌ CSV导出失败:', error);
        alert((language === 'zh' ? '导出失败: ' : 'Export failed: ') + error.message);
    }
}

// 导出所有函数到全局作用域
window.checkStorageSpace = checkStorageSpace;
window.loadHistory = loadHistory;
window.saveHistory = saveHistory;
window.formatDuration = formatDuration;
window.deleteRecord = deleteRecord;
window.exportRecordReport = exportRecordReport;
window.exportRecordCSV = exportRecordCSV;

