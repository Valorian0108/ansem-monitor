import React from 'react';
import { formatDollars } from '@/lib/format';
import { AnsemData } from '@/hooks/useAnsemData';

interface MetricsBeltProps {
  data: AnsemData;
  className?: string; // outer container override
}

export function MetricsBelt({ data, className }: MetricsBeltProps) {
  const total24h = data.txns.h24.buys + data.txns.h24.sells;
  const buyRatio = total24h > 0 ? (data.txns.h24.buys / total24h) * 100 : 0;

  let ratioColor = '#c8f0c8';
  if (buyRatio > 60) ratioColor = '#39FF14';
  else if (buyRatio < 40) ratioColor = '#FF2020';

  const containerClass = className ??
    'absolute top-[45%] left-0 right-[280px] flex items-center bg-[#030505] border-y border-[#1a2a1a] px-8 h-12 z-20 overflow-x-auto no-scrollbar';

  return (
    <div className={containerClass}>
      <MetricItem label="MCAP" value={formatDollars(data.marketCap)} />
      <Divider />
      <MetricItem label="FDV" value={formatDollars(data.fdv)} />
      <Divider />
      <MetricItem label="VOLUME 24H" value={formatDollars(data.volume.h24)} />
      <Divider />
      <MetricItem label="VOLUME 1H" value={formatDollars(data.volume.h1)} />
      <Divider />
      <MetricItem label="LIQUIDITY" value={formatDollars(data.liquidity.usd)} />
      <Divider />
      <MetricItem label="BUYS 24H" value={data.txns.h24.buys.toLocaleString()} />
      <Divider />
      <MetricItem label="SELLS 24H" value={data.txns.h24.sells.toLocaleString()} />
      <Divider />

      <div className="flex flex-col items-start px-6 whitespace-nowrap min-w-fit">
        <span className="font-mono text-[10px] uppercase text-[#3d5c3d]">B/S RATIO</span>
        <span className="font-mono text-[14px] font-bold" style={{ color: ratioColor }}>
          {buyRatio.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-start px-6 whitespace-nowrap min-w-fit">
      <span className="font-mono text-[10px] uppercase text-[#3d5c3d] tracking-wider">{label}</span>
      <span className="font-mono text-[14px] font-bold text-[#c8f0c8]">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-full w-[1px] bg-[#1a2a1a] flex-shrink-0" />;
}
