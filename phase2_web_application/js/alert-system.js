// ============================================================================
// 警报系统模块 - Alert System Module
// ============================================================================
// 功能：处理姿势警报、音效播放、桌面通知等
// ============================================================================

/**
 * 创建警报系统函数
 * @param {Object} params - 参数对象
 * @param {Object} params.badPostureTimerRef - React ref，用于存储不良姿势计时器
 * @param {Function} params.setBadPostureTimer - React setState 函数
 * @param {Object} params.lastAlertTimeRef - React ref，用于存储上次警报时间
 * @param {Function} params.setShouldAlert - React setState 函数
 * @param {boolean} params.alertSoundEnabled - 是否启用音效
 * @param {boolean} params.alertNotificationEnabled - 是否启用通知
 * @param {Object} params.alertSoundRef - React ref，用于存储 AudioContext
 * @param {number} params.alertInterval - 警报间隔（秒）
 * @param {string} params.language - 语言设置 ('zh' | 'en')
 * @returns {Object} 包含所有警报系统函数的对象
 */
function createAlertSystem({
    badPostureTimerRef,
    setBadPostureTimer,
    lastAlertTimeRef,
    setShouldAlert,
    alertSoundEnabled,
    alertNotificationEnabled,
    alertSoundRef,
    alertInterval,
    language = 'zh'
}) {
    const lastDisplayUpdateRef = { current: 0 };

    /**
     * 检查姿势警报（渐进式警报系统 - 三级警报）
     * @param {boolean} isGoodPosture - 姿势是否良好
     * @param {boolean} shouldAlert - 当前是否应该触发警报（用于防止重复触发）
     */
    function checkPostureAlert(isGoodPosture, shouldAlert = false) {
        if (isGoodPosture) {
            // 姿势良好，重置计时器
            badPostureTimerRef.current = 0;
            setBadPostureTimer(0);
            setShouldAlert(false);
            lastDisplayUpdateRef.current = 0;
        } else {
            // 姿势不良，累计时间（假设30fps，每帧约33ms）
            badPostureTimerRef.current += (1000 / 30); // 只更新ref，不触发渲染
            
            const seconds = Math.floor(badPostureTimerRef.current / 1000);
            
            // 每秒更新一次显示（减少状态更新频率）
            const now = Date.now();
            if (now - lastDisplayUpdateRef.current >= 1000) {
                setBadPostureTimer(badPostureTimerRef.current);
                lastDisplayUpdateRef.current = now;
            }
            
            // 渐进式警报系统 - 三级警报
            const alertCooldown = 10000; // 10秒冷却时间
            
            // 第一级：轻微提醒（姿势开始变差，持续2秒）
            if (seconds >= 2 && seconds < 5 && 
                now - lastAlertTimeRef.current > alertCooldown) {
                triggerProgressiveAlert('mild', language);
                lastAlertTimeRef.current = now;
            }
            // 第二级：中等提醒（姿势持续不良5秒）
            else if (seconds >= 5 && seconds < 15 && 
                     now - lastAlertTimeRef.current > alertCooldown) {
                triggerProgressiveAlert('moderate', language);
                lastAlertTimeRef.current = now;
            }
            // 第三级：严重提醒（姿势持续不良15秒）
            else if (seconds >= alertInterval && 
                     now - lastAlertTimeRef.current > alertCooldown && 
                     !shouldAlert) {
                setShouldAlert(true);
                triggerProgressiveAlert('severe', language);
                lastAlertTimeRef.current = now;
            }
        }
    }
    
    /**
     * 触发渐进式警报
     * @param {string} level - 警报级别: 'mild', 'moderate', 'severe'
     * @param {string} lang - 语言设置
     */
    function triggerProgressiveAlert(level, lang = 'zh') {
        const now = Date.now();
        const alertCooldown = 10000; // 10秒冷却时间
        
        // 检查冷却时间
        if (now - lastAlertTimeRef.current < alertCooldown) {
            return;
        }
        
        lastAlertTimeRef.current = now;
        
        switch(level) {
            case 'mild':
                // 轻微提醒：只有视觉反馈，无声音
                console.log('⚠️ 轻微提醒：姿势开始变差');
                // 可以添加轻微的视觉反馈（如颜色变化）
                break;
                
            case 'moderate':
                // 中等提醒：柔和的提示音 + 视觉反馈
                console.log('⚠️ 中等提醒：姿势持续不良');
                if (alertSoundEnabled) {
                    playGentleAlertSound();
                }
                // 可以添加温和的视觉反馈
                break;
                
            case 'severe':
                // 严重提醒：清晰的警报音 + 桌面通知 + 视觉反馈
                console.log('🚨 严重提醒：姿势持续不良');
                if (alertSoundEnabled) {
                    playAlertSound();
                }
                if (alertNotificationEnabled) {
                    showNotification();
                }
                // 震动（如果设备支持）
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                }
                break;
        }
    }
    
    /**
     * 播放柔和的警报音效（用于中等提醒）
     */
    function playGentleAlertSound() {
        try {
            if (!alertSoundRef.current) {
                alertSoundRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const audioContext = alertSoundRef.current;
            
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // 创建一个柔和的"叮"声（频率较低，音量较小）
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 600; // 频率600Hz（比严重警报低）
            oscillator.type = 'sine';
            
            // 音量更小（0.15 vs 0.3）
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            console.log('🔊 柔和音效已播放');
        } catch (error) {
            console.error('❌ 音效播放失败:', error);
        }
    }
    
    /**
     * 触发警报（添加防抖和冷却时间检查）
     */
    function triggerAlert() {
        const now = Date.now();
        const alertCooldown = 10000; // 10秒冷却时间
        
        // 检查冷却时间
        if (now - lastAlertTimeRef.current < alertCooldown) {
            console.log('⏳ 警报冷却中...');
            return;
        }
        
        lastAlertTimeRef.current = now;
        console.log('🚨 触发警报！');
        
        // 1. 播放音效
        if (alertSoundEnabled) {
            playAlertSound();
        }
        
        // 2. 显示桌面通知（限流）
        if (alertNotificationEnabled) {
            showNotification();
        }
        
        // 3. 震动（如果设备支持）
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }
    
    /**
     * 播放警报音效（懒加载AudioContext）
     */
    function playAlertSound() {
        try {
            // 懒加载AudioContext（只在第一次播放时初始化）
            if (!alertSoundRef.current) {
                alertSoundRef.current = new (window.AudioContext || window.webkitAudioContext)();
                console.log('✅ 音频上下文已初始化');
            }
            
            const audioContext = alertSoundRef.current;
            
            // 恢复被暂停的上下文（浏览器自动暂停策略）
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // 创建一个简单的"哔"声
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; // 频率800Hz
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            console.log('🔊 音效已播放');
        } catch (error) {
            console.error('❌ 音效播放失败:', error);
        }
    }
    
    /**
     * 显示桌面通知（优化版：防止重复通知堆积）
     */
    function showNotification() {
        // 检查浏览器是否支持通知
        if (!('Notification' in window)) {
            console.warn('⚠️ 浏览器不支持通知');
            return;
        }
        
        // 检查权限状态
        if (Notification.permission !== 'granted') {
            console.warn('⚠️ 通知权限未授予');
            return;
        }
        
        try {
            // 使用tag防止重复通知堆积
            const notification = new Notification(language === 'zh' ? '⚠️ 姿势提醒' : '⚠️ Posture Alert', {
                body: language === 'zh' ? '检测到不良姿势已持续5秒，请调整坐姿' : 'Bad posture detected for 5 seconds, please adjust your sitting posture',
                tag: 'posture-alert', // 关键：相同tag会替换旧通知
                requireInteraction: false,
                silent: true, // 静音（因为有音效了）
                renotify: false
            });
            
            // 3秒后自动关闭
            setTimeout(() => {
                notification.close();
            }, 3000);
            
            console.log('🔔 通知已显示');
        } catch (error) {
            console.error('❌ 通知显示失败:', error);
        }
    }
    
    /**
     * 请求通知权限
     */
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert(language === 'zh' ? '您的浏览器不支持桌面通知' : 'Your browser does not support desktop notifications');
            return;
        }
        
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                alert(language === 'zh' ? '✅ 通知权限已开启' : '✅ Notification permission granted');
                // 发送测试通知
                new Notification(language === 'zh' ? '✓ 测试通知' : '✓ Test Notification', {
                    body: language === 'zh' ? '您将在检测到不良姿势时收到提醒' : 'You will receive alerts when bad posture is detected'
                });
            } else {
                alert(language === 'zh' ? '❌ 通知权限被拒绝\n\n请在浏览器设置中手动开启' : '❌ Notification permission denied\n\nPlease enable it manually in browser settings');
            }
        }).catch(error => {
            console.error('权限请求失败:', error);
        });
    }
    
    return {
        checkPostureAlert,
        triggerAlert,
        triggerProgressiveAlert,
        playAlertSound,
        playGentleAlertSound,
        showNotification,
        requestNotificationPermission
    };
}

// 导出为全局函数
window.createAlertSystem = createAlertSystem;

