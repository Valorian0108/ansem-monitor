import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { useAnsemData, Txn } from '@/hooks/useAnsemData';
import { AnsemChart } from '@/components/Chart';
import { MetricsBelt } from '@/components/MetricsBelt';
import { TransactionRiver } from '@/components/TransactionRiver';
import ansemBullPath from '@assets/images_(21)_1782777438913.jpeg';
import { formatPercent, formatDollars, formatTimeAgo } from '@/lib/format';

// ─── Shared sub-components ───────────────────────────────────────────────────

function AnimatedPrice({ value, direction, className }: {
  value: string;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  className?: string;
}) {
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
        ref.current.textContent = `$${current.toFixed(decimals)}`;
      }
    });
  }, [spring, value]);

  const color = direction === 'UP' ? '#39FF14' : direction === 'DOWN' ? '#FF2020' : '#e8f0e8';

  return (
    <motion.div
      animate={{ color }}
      transition={{ duration: 0.5 }}
      className={className ?? 'font-sans font-extrabold text-[clamp(56px,8vw,120px)] leading-[1] tabular-nums tracking-tight mt-1'}
    >
      <span ref={ref}>${numValue.toFixed(value.split('.')[1]?.length || 2)}</span>
    </motion.div>
  );
}

function ChangePill({ value, label }: { value: number; label: string }) {
  const positive = value >= 0;
  return (
    <div className={`px-3 py-1.5 font-mono text-[11px] font-bold rounded-[2px] leading-none ${
      positive
        ? 'bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/20'
        : 'bg-[#FF2020]/10 text-[#FF2020] border border-[#FF2020]/20'
    }`}>
      {formatPercent(value)} {label}
    </div>
  );
}

function LiveDot({ error }: { error: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="font-mono text-[10px] uppercase text-[#c8f0c8]">LIVE</div>
      <div className={`w-1.5 h-1.5 rounded-full ${
        error ? 'bg-[#FF2020]' : 'bg-[#39FF14] animate-pulse shadow-[0_0_8px_rgba(57,255,20,0.8)]'
      }`} />
    </div>
  );
}

function MobileTxnRow({ tx }: { tx: Txn }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <motion.div
      key={tx.id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between px-4 py-2 font-mono text-[11px] border-b border-[#0d1a0d]"
    >
      <div className="flex items-center gap-2">
        <span className={`font-bold w-9 ${tx.type === 'BUY' ? 'text-[#39FF14]' : 'text-[#FF2020]'}`}>
          {tx.type}
        </span>
        <span className="text-[#c8f0c8]">{formatDollars(tx.size)}</span>
        {tx.size > 5000 ? (
          <span className="bg-[#39FF14] text-[#050808] px-1 text-[9px] font-bold">BLACK BULL</span>
        ) : tx.size >= 500 ? (
          <span className="border border-[#39FF14] text-[#39FF14] px-1 text-[9px]">BULL</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-[#3d5c3d]">
        <span>{tx.wallet}</span>
        <span className="w-10 text-right">{formatTimeAgo(tx.timestamp)}</span>
      </div>
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
      <div className="font-mono text-[10px] text-[#3d5c3d]">
        {error ? 'CONNECTION LOST' : `Updated ${seconds}s ago`}
      </div>
      <LiveDot error={error} />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, history, transactions, error, lastUpdated, priceDirection } = useAnsemData();
  const [flash, setFlash] = useState(false);

  const triggerWhaleFlash = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
  }, []);

  if (!data && !error) return null;

  if (error && !data) {
    return (
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-[#050808] text-[#FF2020] font-mono text-sm">
        CONNECTION LOST. ATTEMPTING TO RECONNECT...
      </div>
    );
  }

  const d = data!;
  const totalH24 = d.txns.h24.buys + d.txns.h24.sells;
  const buyPct = totalH24 === 0 ? 50 : (d.txns.h24.buys / totalH24) * 100;
  const volumeRatio = Math.min(1, d.volume.h1 / 500000);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#050808] text-[#c8f0c8] select-none">

      {/* ── Shared backgrounds ── */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(80,0,140,0.15) 0%, rgba(80,0,140,0) 70%)', filter: 'blur(100px)' }}
      />
      <img
        src={ansemBullPath}
        alt=""
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 right-[10%] h-[80%] object-contain opacity-[0.08] pointer-events-none mix-blend-screen z-0 grayscale"
      />

      {/* ── Whale flash overlay ── */}
      {flash && (
        <div className="absolute inset-0 z-50 bg-[#39FF14] opacity-[0.03] pointer-events-none" />
      )}

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT  (< md, i.e. < 768px)
      ══════════════════════════════════════════════ */}
      <div className="flex md:hidden flex-col h-full relative z-10">

        {/* 1. Header */}
        <div className="flex items-start justify-between px-5 pt-6 pb-1 flex-shrink-0">
          <div>
            <div className="font-sans font-extrabold text-[18px] text-[#39FF14] tracking-[0.3em] leading-none">
              $ANSEM
            </div>
            <div className="font-mono text-[9px] text-[#3d5c3d] tracking-[0.5em] uppercase mt-0.5">
              THE BLACK BULL
            </div>
          </div>
          <LiveDot error={error} />
        </div>

        {/* 2. Price + changes */}
        <div className="px-5 pb-2 flex-shrink-0">
          <AnimatedPrice
            value={d.priceUsd}
            direction={priceDirection}
            className="font-sans font-extrabold text-[clamp(48px,13vw,80px)] leading-[1] tabular-nums tracking-tight"
          />
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ChangePill value={d.priceChange.h24} label="24H" />
            <ChangePill value={d.priceChange.h1} label="1H" />
          </div>
        </div>

        {/* 3. Metrics belt */}
        <MetricsBelt
          data={d}
          className="flex-shrink-0 flex items-center bg-[#030505] border-y border-[#1a2a1a] px-2 h-11 overflow-x-auto no-scrollbar"
        />

        {/* 4. Buy/sell pressure bar */}
        <div className="px-5 py-2 flex-shrink-0">
          <div className="h-[3px] w-full flex bg-[#1a2a1a] overflow-hidden">
            <div className="h-full bg-[#FF2020] transition-all duration-1000" style={{ width: `${100 - buyPct}%` }} />
            <div className="h-full bg-[#39FF14] transition-all duration-1000" style={{ width: `${buyPct}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[9px] uppercase mt-1">
            <span className="text-[#FF2020]">SELL {d.txns.h24.sells.toLocaleString()}</span>
            <span className="text-[#39FF14]">BUY {d.txns.h24.buys.toLocaleString()}</span>
          </div>
        </div>

        {/* 5. Chart */}
        <div className="flex-1 min-h-0 relative">
          <AnsemChart
            data={history}
            volumeRatio={volumeRatio}
            className="absolute inset-0 overflow-hidden pointer-events-none"
          />
        </div>

        {/* 6. Transaction tape */}
        <div className="h-[38vh] flex-shrink-0 border-t border-[#1a2a1a] flex flex-col">
          <div className="px-4 py-2 flex-shrink-0 flex items-center gap-2 border-b border-[#0d1a0d]">
            <span className="font-mono text-[10px] text-[#3d5c3d] tracking-widest uppercase">Live Tape</span>
            <span className="font-mono text-[9px] text-[#3d5c3d]/50">(simulated)</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <AnimatePresence initial={false}>
              {transactions.map(tx => <MobileTxnRow key={tx.id} tx={tx} />)}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT  (≥ md, i.e. ≥ 768px)
      ══════════════════════════════════════════════ */}
      <div className="hidden md:block h-full">

        {/* Chart layer */}
        <AnsemChart data={history} volumeRatio={volumeRatio} />

        {/* Top-left: name + price + change */}
        <div className="absolute top-12 left-12 z-20 flex flex-col">
          <div className="flex flex-col gap-1.5 mb-2">
            <div className="font-sans font-extrabold text-[22px] text-[#39FF14] tracking-[0.3em] opacity-90 leading-none">
              $ANSEM
            </div>
            <div className="font-mono text-[11px] text-[#3d5c3d] tracking-[0.5em] uppercase leading-none">
              THE BLACK BULL
            </div>
          </div>
          <AnimatedPrice value={d.priceUsd} direction={priceDirection} />
          <div className="flex items-center gap-3 mt-4">
            <ChangePill value={d.priceChange.h24} label="24H" />
          </div>
        </div>

        {/* Metrics belt */}
        <MetricsBelt data={d} />

        {/* Transaction river */}
        <TransactionRiver transactions={transactions} onBlackBullPulse={triggerWhaleFlash} />

        {/* Buy/sell meter */}
        <div className="absolute bottom-12 left-12 w-[55%] max-w-3xl z-20">
          <div className="h-1 w-full flex bg-[#1a2a1a] mb-2 overflow-hidden">
            <div className="h-full bg-[#FF2020] transition-all duration-1000 ease-out" style={{ width: `${100 - buyPct}%` }} />
            <div className="h-full bg-[#39FF14] transition-all duration-1000 ease-out" style={{ width: `${buyPct}%` }} />
          </div>
          <div className="flex justify-between font-mono text-[10px] uppercase">
            <div className="text-[#FF2020]">SELL 24H: {d.txns.h24.sells.toLocaleString()}</div>
            <div className="text-[#39FF14]">BUY 24H: {d.txns.h24.buys.toLocaleString()}</div>
          </div>
        </div>

        {/* Live indicator top-right */}
        <TopRightIndicator lastUpdated={lastUpdated} error={error} />

      </div>
    </div>
  );
}
