// ============================================================================
// 绘制工具函数
// Drawing Utility Functions
// ============================================================================
// 
// 用于在 Canvas 上绘制姿势检测的可视化线条和标记
// Functions for drawing visualization lines and markers on Canvas for posture detection
// ============================================================================

/**
 * 侧面视图的绘制
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Array} landmarks - MediaPipe 关键点数组
 * @param {Object} analysis - 分析结果 {neckAngle, torsoAngle, isGoodPosture}
 * @param {string} language - 语言代码 ('zh' 或 'en')
 */
function drawSideViewLines(ctx, landmarks, analysis, language = 'zh') {
    const { neckAngle, torsoAngle, isGoodPosture } = analysis;
    const color = isGoodPosture ? COLORS.green : COLORS.red;
    
    // 获取坐标（镜像翻转）
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
    const lHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    
    const shoulder = {
        x: (1 - lShoulder.x) * ctx.canvas.width,
        y: lShoulder.y * ctx.canvas.height
    };
    const ear = {
        x: (1 - lEar.x) * ctx.canvas.width,
        y: lEar.y * ctx.canvas.height
    };
    const hip = {
        x: (1 - lHip.x) * ctx.canvas.width,
        y: lHip.y * ctx.canvas.height
    };
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    
    // 1. 颈部线（肩膀→耳朵）
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(ear.x, ear.y);
    ctx.stroke();
    
    // 2. 颈部参考线（垂直线）
    ctx.setLineDash([5, 5]); // 虚线
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(shoulder.x, shoulder.y - 100);
    ctx.stroke();
    ctx.setLineDash([]); // 恢复实线
    
    // 3. 躯干线（髋部→肩膀）
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(shoulder.x, shoulder.y);
    ctx.stroke();
    
    // 4. 躯干参考线
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(hip.x, hip.y - 100);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 5. 绘制角度数字
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    ctx.fillText(Math.round(neckAngle) + '°', shoulder.x + 10, shoulder.y - 10);
    ctx.fillText(Math.round(torsoAngle) + '°', hip.x + 10, hip.y - 10);
    
    // 6. 绘制关键点
    const points = [shoulder, ear, hip];
    points.forEach(point => {
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * 正面视图的绘制
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D 上下文
 * @param {Array} landmarks - MediaPipe 关键点数组
 * @param {Object} analysis - 分析结果 {shoulderTilt, headTilt, isGoodPosture}
 * @param {string} language - 语言代码 ('zh' 或 'en')
 */
function drawFrontViewLines(ctx, landmarks, analysis, language = 'zh') {
    const { shoulderTilt, headTilt, isGoodPosture } = analysis;
    const color = isGoodPosture ? COLORS.green : COLORS.red;
    
    // 获取坐标（镜像翻转）
    const lShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const lEar = landmarks[POSE_LANDMARKS.LEFT_EAR];
    const rEar = landmarks[8]; // RIGHT_EAR
    
    const lShoulderPt = {
        x: (1 - lShoulder.x) * ctx.canvas.width,
        y: lShoulder.y * ctx.canvas.height
    };
    const rShoulderPt = {
        x: (1 - rShoulder.x) * ctx.canvas.width,
        y: rShoulder.y * ctx.canvas.height
    };
    const lEarPt = {
        x: (1 - lEar.x) * ctx.canvas.width,
        y: lEar.y * ctx.canvas.height
    };
    const rEarPt = {
        x: (1 - rEar.x) * ctx.canvas.width,
        y: rEar.y * ctx.canvas.height
    };
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    
    // 1. 肩膀连线
    ctx.beginPath();
    ctx.moveTo(lShoulderPt.x, lShoulderPt.y);
    ctx.lineTo(rShoulderPt.x, rShoulderPt.y);
    ctx.stroke();
    
    // 2. 肩膀水平参考线
    const avgShoulderY = (lShoulderPt.y + rShoulderPt.y) / 2;
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // 半透明黄色
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, avgShoulderY);
    ctx.lineTo(ctx.canvas.width, avgShoulderY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 2.1 添加水平参考线文字标注
    ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    const refLineText = `← ${i18n[language].horizontalReferenceLine} →`;
    ctx.fillText(refLineText, ctx.canvas.width / 2, avgShoulderY - 10);
    ctx.textAlign = 'left';
    
    // 3. 头部连线
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(lEarPt.x, lEarPt.y);
    ctx.lineTo(rEarPt.x, rEarPt.y);
    ctx.stroke();
    
    // 4. 显示倾斜值
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Arial';
    const midX = (lShoulderPt.x + rShoulderPt.x) / 2;
    ctx.fillText(`${i18n[language].canvasShoulderTilt}: ${Math.round(shoulderTilt)}px`, midX - 60, lShoulderPt.y - 20);
    ctx.fillText(`${i18n[language].canvasHeadTilt}: ${Math.round(headTilt)}px`, midX - 60, lEarPt.y - 20);
    
    // 5. 绘制关键点
    [lShoulderPt, rShoulderPt, lEarPt, rEarPt].forEach(point => {
        ctx.fillStyle = COLORS.yellow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 导出所有函数到全局作用域
window.drawSideViewLines = drawSideViewLines;
window.drawFrontViewLines = drawFrontViewLines;

