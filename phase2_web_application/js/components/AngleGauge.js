// ============================================================================
// AngleGauge 组件 - 角度仪表盘组件
// ============================================================================

const { useState, useEffect, useRef } = React;

function AngleGauge({ angle, threshold, label, color, language = 'zh' }) {
    const percentage = Math.min(100, (angle / threshold) * 100);
    const isGood = angle < threshold;
    
    return (
        <div className="flex flex-col items-center p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300 mb-2">{label}</p>
            <div className="relative w-32 h-32">
                <svg className="transform -rotate-90" width="128" height="128">
                    <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="8"
                        fill="none"
                    />
                    <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke={isGood ? '#10b981' : '#ef4444'}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-2xl font-bold" style={{ color: isGood ? '#10b981' : '#ef4444' }}>
                            {angle.toFixed(1)}°
                        </p>
                        <p className="text-xs text-gray-400">/{threshold}°</p>
                    </div>
                </div>
            </div>
            <p className={`text-xs mt-2 ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                {isGood ? (language === 'zh' ? '良好' : 'Good') : (language === 'zh' ? '需改善' : 'Needs Improvement')}
            </p>
        </div>
    );
}

// 导出到全局作用域
window.AngleGauge = AngleGauge;

