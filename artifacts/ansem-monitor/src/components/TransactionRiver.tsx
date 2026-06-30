import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Txn } from '@/hooks/useAnsemData';
import { formatDollars, formatTimeAgo } from '@/lib/format';

interface TransactionRiverProps {
  transactions: Txn[];
  onBlackBullPulse: () => void;
}

export function TransactionRiver({ transactions, onBlackBullPulse }: TransactionRiverProps) {
  const lastPulsedId = React.useRef<string | null>(null);

  // Trigger whale flash only once per unique BLACK BULL transaction
  useEffect(() => {
    if (transactions.length > 0) {
      const newest = transactions[0];
      if (
        newest.size > 5000 &&
        Date.now() - newest.timestamp < 15000 &&
        newest.id !== lastPulsedId.current
      ) {
        lastPulsedId.current = newest.id;
        onBlackBullPulse();
      }
    }
  }, [transactions, onBlackBullPulse]);

  const [now, setNow] = useState(Date.now());
  
  // Re-render time ago every second
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[280px] bg-[#020303]/80 border-l border-[#1a2a1a] z-30 flex flex-col pt-[5rem]">
      <div className="px-4 pb-2 border-b border-[#1a2a1a] mb-2 flex-shrink-0">
        <span className="font-mono text-[10px] text-[#3d5c3d] tracking-widest uppercase">Live Tape</span>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col justify-start">
        <AnimatePresence initial={false}>
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex items-center justify-between px-4 py-1.5 font-mono text-[11px]"
            >
              <div className="flex items-center gap-3">
                <span className={tx.type === 'BUY' ? 'text-[#39FF14] font-bold w-10' : 'text-[#FF2020] font-bold w-10'}>
                  {tx.type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[#c8f0c8]">{formatDollars(tx.size)}</span>
                  {tx.size > 5000 ? (
                    <span className="bg-[#39FF14] text-[#050808] px-1 text-[9px] font-bold">BLACK BULL</span>
                  ) : tx.size >= 500 ? (
                    <span className="border border-[#39FF14] text-[#39FF14] px-1 text-[9px]">BULL</span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[#3d5c3d]">{tx.wallet}</span>
                <span className="text-[#3d5c3d] w-12 text-right">{formatTimeAgo(tx.timestamp)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
