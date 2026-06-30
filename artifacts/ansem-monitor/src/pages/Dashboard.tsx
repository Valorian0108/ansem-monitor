import React, { useState, useEffect, useCallback } from 'react';
import { motion, useSpring } from 'framer-motion';
import { useAnsemData } from '@/hooks/useAnsemData';
import { AnsemChart } from '@/components/Chart';
import { MetricsBelt } from '@/components/MetricsBelt';
import { TransactionRiver } from '@/components/TransactionRiver';
import ansemBullPath from '@assets/images_(21)_1782777438913.jpeg';
import { formatPercent } from '@/lib/format';

function AnimatedPrice({ value, direction }: { value: string; direction: 'UP' | 'DOWN' | 'NEUTRAL' }) {
  const numValue = parseFloat(value);
  const spring = useSpring(numValue, { mass: 0.8, stiffness: 75, damping: 15 });
  const ref = React.useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(numValue);
  }, [numValue, spring]);

  useEffect(() => {
    return spring.on('change', (current) => {
      if (ref.current) {
        const decimals = value.split('.')[1]?.length || 2;
        ref.current.textContent = `${current.toFixed(decimals)}`;
      }
    });
  }, [spring, value]);

  const color = direction === 'UP' ? '#39FF14' : direction === 'DOWN' ? '#FF2020' : '#e8f0e8';

  return (
    <motion.div
      animate={{ color }}
      transition={{ duration: 0.5 }}
      className="font-sans font-extrabold text-[clamp(64px,8vw,120px)] leading-[1] tabular-nums tracking-tight mt-1"
    >
      <span ref={ref}>${numValue.toFixed(value.split('.')[1]?.length || 2)}</span>
    </motion.div>
  );
}

function TopRightIndicator({ lastUpdated, error }: { lastUpdated: number; error: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="absolute top-12 right-[312px] flex items-center gap-4 z-20">
      <div className="flex flex-col items-end">
        <div className="font-mono text-[10px] text-[#3d5c3d]">
          {error ? 'CONNECTION LOST' : `Updated ${seconds}s ago`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="font-mono text-[10px] uppercase text-[#c8f0c8]">LIVE</div>
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            error ? 'bg-[#FF2020]' : 'bg-[#39FF14] animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.8)]'
          }`}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, history, transactions, error, lastUpdated, priceDirection } = useAnsemData();
  const [flash, setFlash] = useState(false);

  const triggerWhaleFlash = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
  }, []);

  if (!data && !error) return null; // Wait for initial load

  // If there's an error and no data, show connection lost
  if (error && !data) {
    return (
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-[#050808] text-[#FF2020] font-mono text-sm">
        CONNECTION LOST. ATTEMPTING TO RECONNECT...
      </div>
    );
  }

  // At this point data is definitely not null
  const nonNullData = data!; 
  const totalH24 = nonNullData.txns.h24.buys + nonNullData.txns.h24.sells;
  const buyPct = totalH24 === 0 ? 50 : (nonNullData.txns.h24.buys / totalH24) * 100;

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#050808] text-[#c8f0c8] select-none">
      {/* Layer 0: Backgrounds */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(80,0,140,0.15) 0%, rgba(80,0,140,0) 70%)',
          filter: 'blur(100px)',
        }}
      />
      <img
        src={ansemBullPath}
        alt="Bull Watermark"
        className="absolute top-1/2 -translate-y-1/2 right-[10%] h-[80%] object-contain opacity-[0.08] pointer-events-none mix-blend-screen z-0 grayscale"
      />

      {/* Whale Flash Overlay */}
      {flash && (
        <div className="absolute inset-0 z-50 bg-[#39FF14] opacity-[0.03] pointer-events-none transition-opacity duration-300" />
      )}

      {/* Layer 1: Chart */}
      <AnsemChart data={history} volumeRatio={Math.min(1, nonNullData.volume.h1 / 500000)} />

      {/* Layer 2: Top Section */}
      <div className="absolute top-12 left-12 z-20 flex flex-col">
        <div className="flex flex-col gap-1.5 mb-2">
          <div className="font-sans font-extrabold text-[22px] text-[#39FF14] tracking-[0.3em] opacity-90 leading-none">
            $ANSEM
          </div>
          <div className="font-mono text-[11px] text-[#3d5c3d] tracking-[0.5em] uppercase leading-none">
            THE BLACK BULL
          </div>
        </div>

        <AnimatedPrice value={nonNullData.priceUsd} direction={priceDirection} />

        <div className="flex items-center gap-3 mt-4">
          <div
            className={`px-3 py-1.5 font-mono text-[11px] font-bold rounded-[2px] leading-none ${
              nonNullData.priceChange.h24 >= 0
                ? 'bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20'
                : 'bg-[#FF2020]/10 text-[#FF2020] border border-[#FF2020]/20'
            }`}
          >
            {formatPercent(nonNullData.priceChange.h24)} (24H)
          </div>
        </div>
      </div>

      {/* Layer 3: Metrics Belt */}
      <MetricsBelt data={nonNullData} />

      {/* Layer 4: Transaction River */}
      <TransactionRiver transactions={transactions} onBlackBullPulse={triggerWhaleFlash} />

      {/* Layer 5: Buy/Sell Meter */}
      <div className="absolute bottom-12 left-12 w-[55%] max-w-3xl z-20">
        <div className="h-1 w-full flex bg-[#1a2a1a] mb-2 rounded-none overflow-hidden">
          <div
            className="h-full bg-[#FF2020] transition-all duration-1000 ease-out"
            style={{ width: `${100 - buyPct}%` }}
          />
          <div
            className="h-full bg-[#39FF14] transition-all duration-1000 ease-out"
            style={{ width: `${buyPct}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10px] uppercase">
          <div className="text-[#FF2020]">SELL 24H: {nonNullData.txns.h24.sells.toLocaleString()}</div>
          <div className="text-[#39FF14]">BUY 24H: {nonNullData.txns.h24.buys.toLocaleString()}</div>
        </div>
      </div>

      {/* Layer 6: Top-right Live indicator */}
      <TopRightIndicator lastUpdated={lastUpdated} error={error} />
    </div>
  );
}
