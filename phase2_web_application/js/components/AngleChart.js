// ============================================================================
// AngleChart 组件 - 实时角度图表组件（使用 Chart.js）
// ============================================================================

const { useState, useEffect, useRef } = React;

function AngleChart({ neckAngle, torsoAngle, neckThreshold, torsoThreshold, language = 'zh' }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const dataRef = useRef({
        labels: [],
        neckData: [],
        torsoData: []
    });
    const lastUpdateRef = useRef(0);
    
    useEffect(() => {
        if (!chartRef.current) return;
        
        const ctx = chartRef.current.getContext('2d');
        
        // 初始化图表
        if (!chartInstanceRef.current) {
            chartInstanceRef.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: language === 'zh' ? '颈部角度' : 'Neck Angle',
                            data: [],
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: language === 'zh' ? '躯干角度' : 'Torso Angle',
                            data: [],
                            borderColor: 'rgb(168, 85, 247)',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: language === 'zh' ? '颈部阈值' : 'Neck Threshold',
                            data: [],
                            borderColor: 'rgba(59, 130, 246, 0.3)',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: language === 'zh' ? '躯干阈值' : 'Torso Threshold',
                            data: [],
                            borderColor: 'rgba(168, 85, 247, 0.3)',
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 60,
                            title: {
                                display: true,
                                text: language === 'zh' ? '角度 (°)' : 'Angle (°)',
                                color: 'rgba(255, 255, 255, 0.8)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)'
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: language === 'zh' ? '时间' : 'Time',
                                color: 'rgba(255, 255, 255, 0.8)'
                            },
                            ticks: {
                                color: 'rgba(255, 255, 255, 0.7)',
                                maxRotation: 45,
                                minRotation: 45
                            },
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.8)'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'rgba(255, 255, 255, 0.9)',
                            bodyColor: 'rgba(255, 255, 255, 0.8)'
                        }
                    }
                }
            });
        }
        
        // 更新数据（使用节流，每2秒最多更新一次）
        const updateChart = () => {
            const now = Date.now();
            if (now - lastUpdateRef.current < 2000) return; // 节流：每2秒最多更新一次
            lastUpdateRef.current = now;
            
            const timeStr = new Date().toLocaleTimeString();
            dataRef.current.labels.push(timeStr);
            dataRef.current.neckData.push(neckAngle);
            dataRef.current.torsoData.push(torsoAngle);
            
            // 只保留最近30个数据点
            const maxPoints = 30;
            if (dataRef.current.labels.length > maxPoints) {
                dataRef.current.labels.shift();
                dataRef.current.neckData.shift();
                dataRef.current.torsoData.shift();
            }
            
            // 更新图表
            if (chartInstanceRef.current) {
                chartInstanceRef.current.data.labels = dataRef.current.labels;
                chartInstanceRef.current.data.datasets[0].data = dataRef.current.neckData;
                chartInstanceRef.current.data.datasets[1].data = dataRef.current.torsoData;
                chartInstanceRef.current.data.datasets[2].data = new Array(dataRef.current.labels.length).fill(neckThreshold);
                chartInstanceRef.current.data.datasets[3].data = new Array(dataRef.current.labels.length).fill(torsoThreshold);
                chartInstanceRef.current.update('none');
            }
        };
        
        // 在角度变化时更新
        updateChart();
        
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [neckAngle, torsoAngle, neckThreshold, torsoThreshold, language]);
    
    return (
        <div className="w-full h-64 bg-gray-800 rounded-lg p-2">
            <canvas ref={chartRef} id="angle-chart-canvas" />
        </div>
    );
}

// 导出到全局作用域
window.AngleChart = AngleChart;

