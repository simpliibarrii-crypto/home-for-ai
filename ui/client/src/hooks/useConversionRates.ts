import { useState, useEffect, useCallback } from "react";

export interface ConversionRates {
  // Crypto (in USD)
  BTC: number;
  ETH: number;
  SOL: number;
  USDC: number;
  BNB: number;
  MATIC: number;
  ARB: number;
  // Stocks (mock price in USD)
  AAPL: number;
  MSFT: number;
  TSLA: number;
  NVDA: number;
  GOOGL: number;
  // Bonds (price in USD per unit)
  XBB: number;
  AGG: number;
  TLT: number;
  // Commodities (in USD)
  XAU: number;
  XAG: number;
  WTI: number;
  XPT: number;
  // Fiat (in USD)
  CAD: number;
  USD: number;
  EUR: number;
  GBP: number;
  JPY: number;
}

const BASE_RATES: ConversionRates = {
  BTC: 95000,
  ETH: 3800,
  SOL: 185,
  USDC: 1.0,
  BNB: 620,
  MATIC: 0.88,
  ARB: 1.12,
  AAPL: 228,
  MSFT: 415,
  TSLA: 248,
  NVDA: 875,
  GOOGL: 175,
  XBB: 28.5,
  AGG: 97.2,
  TLT: 88.4,
  XAU: 3100,
  XAG: 34.8,
  WTI: 78,
  XPT: 1020,
  CAD: 0.735,   // 1 CAD = 0.735 USD (i.e. 1 USD = 1.36 CAD)
  USD: 1.0,
  EUR: 1.085,
  GBP: 1.265,
  JPY: 0.00655,
};

function applyVariation(value: number, maxPct = 0.005): number {
  const delta = (Math.random() * 2 - 1) * maxPct;
  return value * (1 + delta);
}

function variedRates(base: ConversionRates): ConversionRates {
  const result = {} as ConversionRates;
  for (const key of Object.keys(base) as (keyof ConversionRates)[]) {
    result[key] = applyVariation(base[key]);
  }
  return result;
}

export function useConversionRates() {
  const [rates, setRates] = useState<ConversionRates>(() => variedRates(BASE_RATES));
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refresh = useCallback(() => {
    setRates(prev => variedRates(prev));
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Convert amount of assetA to assetB (both priced in USD)
  const convert = useCallback(
    (amount: number, fromAsset: string, toAsset: string): number => {
      const fromUSD = rates[fromAsset as keyof ConversionRates] ?? 1;
      const toUSD = rates[toAsset as keyof ConversionRates] ?? 1;
      return (amount * fromUSD) / toUSD;
    },
    [rates]
  );

  return { rates, lastUpdated, convert };
}
