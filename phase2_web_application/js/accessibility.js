// ============================================================================
// 无障碍访问模块 - Accessibility Module
// ============================================================================
// 功能：键盘导航、屏幕阅读器支持、大字体模式等
// ============================================================================

/**
 * 无障碍访问管理器
 */
class AccessibilityManager {
    constructor() {
        this.keyboardShortcuts = new Map();
        this.fontSize = 100; // 默认100%
        this.highContrast = false;
        this.init();
    }

    /**
     * 初始化无障碍功能
     */
    init() {
        // 从localStorage加载设置
        const savedFontSize = localStorage.getItem('accessibility_fontSize');
        if (savedFontSize) {
            this.fontSize = parseInt(savedFontSize);
            this.applyFontSize();
        }

        const savedHighContrast = localStorage.getItem('accessibility_highContrast');
        if (savedHighContrast === 'true') {
            this.highContrast = true;
            this.applyHighContrast();
        }

        // 注册键盘快捷键
        this.registerKeyboardShortcuts();
        
        // 添加跳过导航链接
        this.addSkipNavigationLink();
    }

    /**
     * 注册键盘快捷键
     */
    registerKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 忽略在输入框中的快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Alt + 快捷键
            if (e.altKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.triggerAction('settings');
                        break;
                    case 'g':
                        e.preventDefault();
                        this.triggerAction('guide');
                        break;
                    case 'm':
                        e.preventDefault();
                        this.triggerAction('monitoring');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.triggerAction('recording');
                        break;
                }
            }

            // Esc键关闭弹窗
            if (e.key === 'Escape') {
                this.triggerAction('close');
            }
        });
    }

    /**
     * 触发动作
     */
    triggerAction(action) {
        const event = new CustomEvent('accessibility-action', { detail: { action } });
        document.dispatchEvent(event);
    }

    /**
     * 设置字体大小
     */
    setFontSize(percentage) {
        this.fontSize = Math.max(100, Math.min(200, percentage));
        localStorage.setItem('accessibility_fontSize', this.fontSize.toString());
        this.applyFontSize();
    }

    /**
     * 应用字体大小
     */
    applyFontSize() {
        const root = document.documentElement;
        const scale = this.fontSize / 100;
        
        // 方法1: 直接在:root上设置--font-scale变量
        root.style.setProperty('--font-scale', scale.toString(), 'important');
        
        // 方法2: 同时直接更新所有字体大小变量（覆盖calc()计算）
        // 使用!important确保覆盖所有其他样式
        root.style.setProperty('--font-h1', `${32 * scale}px`, 'important');
        root.style.setProperty('--font-h2', `${24 * scale}px`, 'important');
        root.style.setProperty('--font-h3', `${20 * scale}px`, 'important');
        root.style.setProperty('--font-body-large', `${18 * scale}px`, 'important');
        root.style.setProperty('--font-body', `${16 * scale}px`, 'important');
        root.style.setProperty('--font-body-small', `${14 * scale}px`, 'important');
        
        // 方法3: 在body上设置基础字体大小（作为后备方案）
        // 这样即使某些元素没有使用CSS变量，也会受到影响
        if (document.body) {
            document.body.style.setProperty('font-size', `${16 * scale}px`, 'important');
        }
        
        // 方法4: 强制更新所有使用字体变量的元素
        // 通过添加一个临时类来触发重新计算
        root.classList.add('font-size-updated');
        setTimeout(() => {
            root.classList.remove('font-size-updated');
        }, 10);
        
        // 方法5: 强制所有元素重新计算样式（触发重排）
        // 这会确保所有使用CSS变量的元素都更新
        if (document.body) {
            // 触发一次重排
            void document.body.offsetHeight;
        }
        
        console.log(`✅ 字体大小已设置为 ${this.fontSize}% (缩放比例: ${scale})`);
        console.log(`   --font-scale: ${scale}`);
        console.log(`   --font-body: ${16 * scale}px`);
        console.log(`   检查: document.body.style.fontSize = ${document.body ? document.body.style.fontSize : 'N/A'}`);
    }

    /**
     * 切换高对比度模式
     */
    toggleHighContrast() {
        this.highContrast = !this.highContrast;
        localStorage.setItem('accessibility_highContrast', this.highContrast.toString());
        this.applyHighContrast();
    }

    /**
     * 应用高对比度模式
     */
    applyHighContrast() {
        const root = document.documentElement;
        if (this.highContrast) {
            root.classList.add('high-contrast-mode');
            // 使用!important确保覆盖其他样式
            root.style.setProperty('--bg-dark', '#000000', 'important');
            root.style.setProperty('--bg-card', '#1a1a1a', 'important');
            root.style.setProperty('--text-primary', '#FFFFFF', 'important');
            root.style.setProperty('--text-secondary', '#CCCCCC', 'important');
            root.style.setProperty('--primary-green', '#00FF00', 'important');
            root.style.setProperty('--danger-red', '#FF0000', 'important');
            root.style.setProperty('--primary-blue', '#00BFFF', 'important');
            root.style.setProperty('--warning-yellow', '#FFFF00', 'important');
            console.log('✅ 高对比度模式已开启');
        } else {
            root.classList.remove('high-contrast-mode');
            // 移除所有高对比度样式，恢复默认值
            root.style.removeProperty('--bg-dark');
            root.style.removeProperty('--bg-card');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
            root.style.removeProperty('--primary-green');
            root.style.removeProperty('--danger-red');
            root.style.removeProperty('--primary-blue');
            root.style.removeProperty('--warning-yellow');
            console.log('✅ 高对比度模式已关闭');
        }
    }

    /**
     * 添加跳过导航链接
     */
    addSkipNavigationLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-navigation-link';
        skipLink.textContent = '跳转到主要内容';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: var(--primary-blue);
            color: white;
            padding: 8px 16px;
            text-decoration: none;
            z-index: 10000;
            border-radius: 4px;
        `;
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * 获取当前字体大小
     */
    getFontSize() {
        return this.fontSize;
    }

    /**
     * 获取高对比度状态
     */
    isHighContrast() {
        return this.highContrast;
    }
}

// 创建全局实例（延迟初始化，确保DOM已加载）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.accessibilityManager = new AccessibilityManager();
    });
} else {
    window.accessibilityManager = new AccessibilityManager();
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityManager;
}

