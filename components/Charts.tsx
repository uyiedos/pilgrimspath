
import React from 'react';

// --- Types ---
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// --- LINE CHART ---
export const LineChart: React.FC<{ data: ChartDataPoint[]; color?: string }> = ({ data, color = '#eab308' }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs">No Data</div>;
  
  const max = Math.max(...data.map(d => d.value)) || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / max) * 100; // Invert Y for SVG coords
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-full flex flex-col justify-end group">
        <div className="relative flex-1 w-full overflow-hidden">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(y => (
                    <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#374151" strokeWidth="0.2" strokeDasharray="2" />
                ))}
                
                {/* Area Fill */}
                <polygon 
                    points={`0,100 ${points} 100,100`} 
                    fill={color} 
                    opacity="0.1" 
                />

                {/* The Line */}
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={points}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                
                {/* Interactive Points */}
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * 100;
                    const y = 100 - (d.value / max) * 100;
                    return (
                        <g key={i} className="group/point">
                            <circle 
                                cx={x} 
                                cy={y} 
                                r="2" 
                                fill={color}
                                className="transition-all duration-300 group-hover/point:r-3"
                            />
                            {/* Tooltip */}
                            <foreignObject x={x - 15} y={y - 15} width="30" height="10" className="overflow-visible pointer-events-none">
                                <div className="hidden group-hover/point:block bg-gray-900 text-white text-[8px] px-1 rounded absolute bottom-2 left-1/2 -translate-x-1/2 border border-gray-700 whitespace-nowrap z-10 shadow-lg">
                                    {d.value}
                                </div>
                            </foreignObject>
                        </g>
                    );
                })}
            </svg>
        </div>
        <div className="flex justify-between mt-2 text-[8px] text-gray-500 font-mono w-full px-1">
            <span>{data[0]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
        </div>
    </div>
  );
};

// --- BAR CHART ---
export const BarChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs">No Data</div>;
    const max = Math.max(...data.map(d => d.value)) || 1;

    return (
        <div className="w-full h-full flex items-end justify-between gap-1 pt-4">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div 
                        className="w-full rounded-t-sm transition-all duration-500 hover:brightness-110 relative min-h-[4px]"
                        style={{ 
                            height: `${(d.value / max) * 100}%`,
                            backgroundColor: d.color || '#60a5fa'
                        }}
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-700 shadow-xl">
                            <span className="font-bold block">{d.value}</span>
                            <span className="text-gray-400 text-[8px]">{d.label}</span>
                        </div>
                    </div>
                    <div className="text-[8px] text-gray-500 mt-1 truncate w-full text-center font-mono">
                        {d.label.substring(0, 3)}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- DONUT CHART ---
export const DonutChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-600 text-xs">No Data</div>;
    
    const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="w-full h-full flex items-center justify-center relative">
            <svg viewBox="-1 -1 2 2" className="w-full h-full transform -rotate-90">
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
                            className="transition-all duration-300 hover:scale-105 origin-center cursor-pointer"
                        >
                            <title>{slice.label}: {slice.value} ({Math.round(slicePercent * 100)}%)</title>
                        </path>
                    );
                })}
                {/* Inner Circle for Donut Effect */}
                <circle cx="0" cy="0" r="0.6" fill="#111827" />
            </svg>
            
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-white font-retro">{total.toLocaleString()}</span>
                <span className="text-[8px] text-gray-400 uppercase">Total</span>
            </div>
        </div>
    );
};
