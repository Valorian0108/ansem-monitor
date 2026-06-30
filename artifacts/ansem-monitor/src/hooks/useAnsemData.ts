import { useState, useEffect, useRef, useCallback } from 'react';

export interface AnsemData {
  priceUsd: string;
  priceChange: { h24: number; h1: number; m5: number };
  volume: { h24: number; h1: number };
  liquidity: { usd: number };
  marketCap: number;
  fdv: number;
  txns: { h24: { buys: number; sells: number }; h1: { buys: number; sells: number } };
  pairAddress: string;
}

export interface Txn {
  id: string;
  type: 'BUY' | 'SELL';
  size: number;
  wallet: string;
  timestamp: number;
}

export interface PricePoint {
  time: number;
  price: number;
}

const POLLING_INTERVAL = 15000; // 15 seconds
const API_URL = 'https://api.dexscreener.com/latest/dex/tokens/9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump';

function generateWallet() {
  return Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
}

function generateRandomTxns(data: AnsemData): Txn[] {
  const { buys, sells } = data.txns.h1;
  const totalTxns = buys + sells;
  if (totalTxns === 0) return [];

  const avgTxnSize = data.volume.h1 / totalTxns;
  const buyRatio = buys / totalTxns;

  // Generate 1-4 txns
  const count = Math.floor(Math.random() * 4) + 1;
  const txns: Txn[] = [];

  for (let i = 0; i < count; i++) {
    // Log-normal-ish distribution for size around the average
    const variance = (Math.random() * 1.5) + 0.2; // 0.2x to 1.7x multiplier roughly, or some spikes
    let size = avgTxnSize * variance;
    
    // Rare chance for a massive whale tx
    if (Math.random() > 0.95) {
      size = size * (Math.random() * 10 + 5); 
    }

    // Determine buy or sell based on real ratio
    const isBuy = Math.random() <= buyRatio;

    txns.push({
      id: Math.random().toString(36).substring(2, 9),
      type: isBuy ? 'BUY' : 'SELL',
      size: Math.max(10, size), // min $10
      wallet: generateWallet(),
      timestamp: Date.now() - Math.floor(Math.random() * 5000), // happened within last 5s
    });
  }

  // Sort by time descending (newest first)
  return txns.sort((a, b) => b.timestamp - a.timestamp);
}

export function useAnsemData() {
  const [data, setData] = useState<AnsemData | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [error, setError] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'UP' | 'DOWN' | 'NEUTRAL'>('NEUTRAL');

  const fetchInterval = useRef<NodeJS.Timeout | null>(null);
  // Monotonic request id — only the latest response is applied; stale ones are discarded.
  const requestIdRef = useRef<number>(0);

  const fetchData = async () => {
    const myRequestId = ++requestIdRef.current;
    const controller = new AbortController();

    try {
      const res = await fetch(API_URL, { signal: controller.signal });
      if (!res.ok) throw new Error('API fetch failed');
      const json = await res.json();

      // Discard stale responses that arrived out of order
      if (myRequestId !== requestIdRef.current) return;

      if (!json.pairs || json.pairs.length === 0) {
        throw new Error('No pairs found');
      }

      // Pick the Solana pair with the highest liquidity (most reliable price source)
      const solanaPairs = json.pairs.filter((p: { chainId: string }) => p.chainId === 'solana');
      const candidates = solanaPairs.length > 0 ? solanaPairs : json.pairs;
      const pair = candidates.reduce((best: { liquidity?: { usd?: number } }, p: { liquidity?: { usd?: number } }) =>
        (p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best, candidates[0]);

      const newData: AnsemData = {
        priceUsd: pair.priceUsd ?? '0',
        priceChange: pair.priceChange ?? { h24: 0, h1: 0, m5: 0 },
        volume: pair.volume ?? { h24: 0, h1: 0 },
        liquidity: pair.liquidity ?? { usd: 0 },
        marketCap: pair.marketCap || pair.fdv || 0,
        fdv: pair.fdv ?? 0,
        txns: pair.txns ?? { h24: { buys: 0, sells: 0 }, h1: { buys: 0, sells: 0 } },
        pairAddress: pair.pairAddress ?? '',
      };

      // Use the sanitized priceUsd string (guaranteed '0' fallback) for numeric ops.
      // Reject non-finite values so NaN never enters chart history.
      const currentPriceNum = parseFloat(newData.priceUsd);
      if (!Number.isFinite(currentPriceNum)) throw new Error('Invalid price from API');

      setData((prevData) => {
        if (prevData) {
          const prevPriceNum = parseFloat(prevData.priceUsd);
          if (currentPriceNum > prevPriceNum) setPriceDirection('UP');
          else if (currentPriceNum < prevPriceNum) setPriceDirection('DOWN');
          else setPriceDirection('NEUTRAL');
        }
        return newData;
      });

      setLastPrice(currentPriceNum);

      setHistory((prev) => {
        const newHistory = [...prev, { time: Date.now(), price: currentPriceNum }];
        // keep max 120 points
        if (newHistory.length > 120) return newHistory.slice(-120);
        return newHistory;
      });

      // Simulated transactions derived from real aggregate buy/sell ratio and volume.
      // Individual trades are not available from the DexScreener public API.
      const newTxns = generateRandomTxns(newData);
      setTransactions((prev) => {
        const merged = [...newTxns, ...prev];
        return merged.slice(0, 50); // Keep max 50
      });

      setLastUpdated(Date.now());
      setError(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return; // clean cancellation
      console.error(err);
      setError(true);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInterval.current = setInterval(fetchData, POLLING_INTERVAL);

    return () => {
      if (fetchInterval.current) clearInterval(fetchInterval.current);
      // Invalidate any in-flight request so its setState calls are ignored
      requestIdRef.current++;
    };
  }, []);

  return {
    data,
    history,
    transactions,
    error,
    lastUpdated,
    priceDirection
  };
}
