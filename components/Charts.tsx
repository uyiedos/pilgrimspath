
import React from 'react';

// --- Types ---
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// --- LINE CHART ---
export const LineChart: React.FC<{ data: ChartDataPoint[]; color?: string }> = ({ data, color = '#eab308' }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs font-mono uppercase">Awaiting Data Signal...</div>;
  
  const max = Math.max(...data.map(d => d.value)) || 1;
  const min = Math.min(...data.map(d => d.value)) || 0;
  // Add padding to range
  const range = max - min || 1;
  
  const points = data.map((d, i) => {
    // Safety check for single point
    const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
    const y = 100 - ((d.value - min) / range) * 80 - 10; // keep within 10-90% vertical
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = data.length > 1 
    ? `0,100 ${points} 100,100` 
    : `0,100 50,${100 - ((data[0].value - min) / range) * 80 - 10} 100,100`;

  return (
    <div className="w-full h-full flex flex-col justify-end group select-none">
        <div className="relative flex-1 w-full overflow-visible">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                ))}
                
                {/* Area Fill */}
                <polygon 
                    points={areaPoints} 
                    fill={`url(#grad-${color})`} 
                />

                {/* The Line */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    points={points}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-lg"
                />
                
                {/* Interactive Points */}
                {data.map((d, i) => {
                    const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 50;
                    const y = 100 - ((d.value - min) / range) * 80 - 10;
                    return (
                        <g key={i} className="group/point cursor-crosshair">
                            {/* Hit Area */}
                            <rect x={x - 5} y="0" width="10" height="100" fill="transparent" />
                            
                            <circle 
                                cx={x} 
                                cy={y} 
                                r="1.5" 
                                fill={color}
                                className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200"
                            />
                            <circle 
                                cx={x} 
                                cy={y} 
                                r="4" 
                                fill="white"
                                opacity="0.1"
                                className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200 animate-ping"
                            />
                            
                            {/* Vertical Line on Hover */}
                            <line 
                                x1={x} y1={y} x2={x} y2={100} 
                                stroke={color} 
                                strokeWidth="0.5" 
                                strokeDasharray="1,1" 
                                className="opacity-0 group-hover/point:opacity-50 transition-opacity"
                            />

                            {/* Tooltip */}
                            <foreignObject x={x < 50 ? x : x - 30} y={y > 20 ? y - 12 : y + 5} width="30" height="10" className="overflow-visible pointer-events-none">
                                <div className="opacity-0 group-hover/point:opacity-100 transition-opacity absolute bg-gray-900 border border-gray-700 text-white text-[6px] px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-50 flex flex-col items-center">
                                    <span className="font-bold">{d.value.toLocaleString()}</span>
                                    <span className="text-[5px] text-gray-400">{d.label}</span>
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </svg>
        </div>
        <div className="flex justify-between mt-2 text-[8px] text-gray-500 font-mono w-full px-1 border-t border-white/5 pt-1 uppercase tracking-widest">
            <span>{data[0]?.label || 'Start'}</span>
            <span>{data[data.length - 1]?.label || 'End'}</span>
        </div>
    </div>
  );
};

// --- BAR CHART ---
export const BarChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs font-mono uppercase">Awaiting Data...</div>;
    const max = Math.max(...data.map(d => d.value)) || 1;

    return (
        <div className="w-full h-full flex items-end justify-between gap-2 pt-6 select-none">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-[8px] px-2 py-1 rounded border border-gray-600 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10 shadow-xl translate-y-2 group-hover:translate-y-0">
                        <div className="font-bold text-center">{d.value.toLocaleString()}</div>
                        <div className="text-[6px] text-gray-400 uppercase tracking-wider">{d.label}</div>
                    </div>

                    <div 
                        className="w-full rounded-t-sm transition-all duration-500 relative min-h-[4px] opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                        style={{ 
                            height: `${(d.value / max) * 100}%`,
                            backgroundColor: d.color || '#60a5fa'
                        }}
                    >
                    </div>
                    <div className="text-[7px] text-gray-500 mt-2 truncate w-full text-center font-mono border-t border-transparent group-hover:border-white/20 pt-1 transition-colors">
                        {d.label.substring(0, 4).toUpperCase()}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- DONUT CHART ---
export const DonutChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs font-mono uppercase">No Data</div>;
    
    const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-6 select-none">
            <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0">
                <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90 overflow-visible">
                    {data.map((slice, i) => {
                        if (slice.value === 0) return null;
                        const startPercent = cumulativePercent;
                        const slicePercent = slice.value / total;
                        cumulativePercent += slicePercent;
                        const endPercent = cumulativePercent;

                        const [startX, startY] = getCoordinatesForPercent(startPercent);
                        const [endX, endY] = getCoordinatesForPercent(endPercent);
                        
                        const largeArcFlag = slicePercent > 0.5 ? 1 : 0;

                        const pathData = [
                            `M ${startX} ${startY}`,
                            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                            `L 0 0`,
                        ].join(' ');

                        return (
                            <path 
                                key={i} 
                                d={pathData} 
                                fill={slice.color || '#ccc'} 
                                stroke="#111827" 
                                strokeWidth="0.05"
                                className="transition-all duration-300 hover:scale-110 origin-center cursor-pointer opacity-90 hover:opacity-100 hover:drop-shadow-lg"
                            >
                                <title>{slice.label}: {slice.value.toLocaleString()} ({Math.round(slicePercent * 100)}%)</title>
                            </path>
                        );
                    })}
                    {/* Inner Circle */}
                    <circle cx="0" cy="0" r="0.7" fill="#111827" />
                </svg>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs md:text-sm font-bold text-white font-retro drop-shadow-md">{(total / 1000).toFixed(1)}k</span>
                    <span className="text-[6px] text-gray-500 uppercase tracking-widest">Total XP</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2 w-full max-w-[120px]">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[9px] group cursor-default">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }}></span>
                            <span className="text-gray-400 truncate group-hover:text-white transition-colors">{d.label}</span>
                        </div>
                        <span className="font-mono text-gray-500 group-hover:text-gray-300 transition-colors">{Math.round((d.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
