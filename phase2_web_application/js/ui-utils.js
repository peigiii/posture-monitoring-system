// ============================================================================
// UI 工具函数模块 - UI Utilities Module
// ============================================================================
// 功能：全屏、截图、格式化等 UI 相关工具函数
// ============================================================================

/**
 * 切换全屏模式
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error('无法进入全屏:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * 捕获截图
 * @param {HTMLCanvasElement} canvas - 要截图的 canvas 元素
 */
function captureScreenshot(canvas) {
    if (canvas) {
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `posture_screenshot_${new Date().toISOString().split('T')[0]}_${Date.now()}.png`;
                link.click();
                URL.revokeObjectURL(url);
            }
        }, 'image/png');
    }
}

/**
 * 格式化监测时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串 (MM:SS)
 */
function formatMonitoringDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化录制时长
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时长字符串 (M:SS)
 */
function formatRecordingTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 导出为全局函数
window.toggleFullscreen = toggleFullscreen;
window.captureScreenshot = captureScreenshot;
window.formatMonitoringDuration = formatMonitoringDuration;
window.formatRecordingTime = formatRecordingTime;

