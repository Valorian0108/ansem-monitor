import React, { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, ReferenceLine } from 'recharts';
import { PricePoint } from '@/hooks/useAnsemData';

interface ChartProps {
  data: PricePoint[];
  volumeRatio: number; // 0 to 1, used for glow intensity
}

export function AnsemChart({ data, volumeRatio }: ChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // If we only have 1 point, duplicate it so we can draw a line
    if (data.length === 1) {
      return [
        { ...data[0], time: data[0].time - 15000 },
        data[0]
      ];
    }
    
    return data;
  }, [data]);

  // Calculate min and max for reference lines
  const { min, max } = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100 };
    const prices = chartData.map(d => d.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const padding = (maxP - minP) * 0.1;
    return {
      min: minP === maxP ? minP * 0.9 : minP - padding,
      max: minP === maxP ? maxP * 1.1 : maxP + padding,
    };
  }, [chartData]);

  const glowSize = Math.max(4, Math.min(12, volumeRatio * 12));

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-[35vh] absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none z-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(57, 255, 20, 0.12)" stopOpacity={1}/>
              <stop offset="100%" stopColor="rgba(57, 255, 20, 0)" stopOpacity={1}/>
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation={glowSize} floodColor="#39FF14" floodOpacity="1" />
            </filter>
          </defs>
          
          <YAxis domain={[min, max]} hide />
          
          <ReferenceLine y={min + (max - min) * 0.2} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <ReferenceLine y={min + (max - min) * 0.4} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <ReferenceLine y={min + (max - min) * 0.6} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />
          <ReferenceLine y={min + (max - min) * 0.8} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />

          <Area
            type="monotone"
            dataKey="price"
            stroke="#39FF14"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#colorPrice)"
            isAnimationActive={false}
            style={{ filter: 'url(#neonGlow)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
