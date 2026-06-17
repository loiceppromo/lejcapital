'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MarketFeedData } from '@/lib/market/data-feed';
import { getMarketFeed } from '@/lib/market/data-feed';
import { getExchangeRates, CURRENCIES, type CurrencyCode } from '@/lib/currency/converter';
import { MiniSparkline, generatePriceHistory } from '@/components/charts/mini-sparkline';

/**
 * Compact market ticker bar showing GSE indices and T-Bill rates.
 * Auto-refreshes every 60 seconds.
 */
export function MarketTicker() {
  const [data, setData] = useState<MarketFeedData | null>(null);
  const [scrollPaused, setScrollPaused] = useState(false);

  const refresh = useCallback(() => {
    setData(getMarketFeed());
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [refresh]);

  if (!data) return null;

  return (
    <div
      className="relative overflow-hidden border-b border-brand-line bg-[#07090d]"
      onMouseEnter={() => setScrollPaused(true)}
      onMouseLeave={() => setScrollPaused(false)}
    >
      <div
        className="flex items-center gap-6 whitespace-nowrap px-4 py-1.5 text-[11px] font-medium"
        style={{
          animation: scrollPaused ? 'none' : 'ticker-scroll 30s linear infinite',
        }}
      >
        {/* Source badge */}
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-slate-400 uppercase tracking-wider text-[9px]">Live Feed</span>
        </span>

        {/* Indices */}
        {data.indices.map((idx) => (
          <span key={idx.name} className="flex items-center gap-1.5">
            <span className="font-bold text-white">{idx.name}</span>
            <span className="text-slate-300 font-mono">{idx.value.toLocaleString('en', { minimumFractionDigits: 2 })}</span>
            <span className={idx.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)} ({idx.changePct >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%)
            </span>
          </span>
        ))}

        {/* Divider */}
        <span className="h-3 w-px bg-white/20" />

        {/* T-Bill rates */}
        {data.tbills.map((bill) => (
          <span key={bill.tenor} className="flex items-center gap-1.5">
            <span className="font-semibold text-[#9bb6cf]">{bill.tenor}</span>
            <span className="text-white font-mono">{bill.rate.toFixed(2)}%</span>
            <span className={bill.change >= 0 ? 'text-red-400' : 'text-emerald-400'}>
              {bill.change >= 0 ? '+' : ''}{bill.change.toFixed(2)}
            </span>
          </span>
        ))}

        {/* Divider */}
        <span className="h-3 w-px bg-white/20" />

        {/* Top movers */}
        {data.stocks.slice(0, 5).map((stock) => (
          <span key={stock.ticker} className="flex items-center gap-1.5">
              <span className="font-semibold text-[#d8c08d]">{stock.ticker}</span>
            <span className="text-slate-300 font-mono">GH₵{stock.price.toFixed(2)}</span>
            <span className={stock.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {stock.change >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
            </span>
          </span>
        ))}

        {/* FX rates */}
        <span className="h-3 w-px bg-white/20" />
        {getExchangeRates()
          .filter((r) => r.to === 'GHS' && r.from !== 'GHS')
          .map((r) => (
            <span key={r.from} className="flex items-center gap-1.5">
              <span className="font-semibold text-[#9bb6cf]">{CURRENCIES[r.from as CurrencyCode].symbol}{r.from}</span>
              <span className="text-slate-300 font-mono">{r.rate.toFixed(2)}</span>
            </span>
          ))}

        {/* Timestamp */}
        <span className="text-slate-500 text-[9px]">
          {new Date(data.timestamp).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Full market data dashboard panel for the market page.
 */
export function MarketDataPanel() {
  const [data, setData] = useState<MarketFeedData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setData(getMarketFeed());
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    const interval = setInterval(refresh, 60_000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [refresh]);

  if (!data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Refresh header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
            Real-time market data
          </span>
          <span className="text-[10px] text-brand-muted">
            ({data.source === 'SEED' ? 'Simulated' : 'Live'})
          </span>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-md border border-brand-line bg-white px-2.5 py-1.5 text-xs font-medium text-brand-charcoal hover:border-brand-charcoal disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Indices cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.indices.map((idx) => (
          <div key={idx.name} className="rounded-lg border border-brand-line bg-white p-4 card-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase text-brand-muted tracking-wider">{idx.name}</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-brand-black">
                  {idx.value.toLocaleString('en', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`rounded-md px-2 py-1 text-xs font-semibold ${
                idx.change >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {idx.change >= 0 ? '+' : ''}{idx.changePct.toFixed(2)}%
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-brand-muted">
              <span>Change: {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)}</span>
              <span>YTD: {idx.ytdReturn >= 0 ? '+' : ''}{idx.ytdReturn.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* T-Bill rates */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-brand-muted tracking-wider">T-Bill Rates (Bank of Ghana)</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.tbills.map((bill) => (
            <div key={bill.tenor} className="rounded-lg border border-brand-line bg-white p-4 card-scale-in">
              <p className="text-[10px] font-semibold uppercase text-blue-600 tracking-wider">{bill.tenor}</p>
              <p className="mt-1 text-xl font-bold tracking-tight text-brand-black font-mono">{bill.rate.toFixed(2)}%</p>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className={bill.change < 0 ? 'text-emerald-600' : 'text-red-600'}>
                  {bill.change >= 0 ? '+' : ''}{bill.change.toFixed(2)} bps
                </span>
                <span className="text-brand-muted">prev: {bill.previousRate.toFixed(2)}%</span>
              </div>
              <p className="mt-1 text-[10px] text-brand-muted">Auction: {bill.auctionDate}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stock table */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-brand-muted tracking-wider">GSE Equities</h4>
        <div className="overflow-hidden rounded-lg border border-brand-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-brand-line bg-brand-panel text-[10px] uppercase text-brand-muted">
                  <th className="px-3 py-2 text-left font-semibold">Ticker</th>
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-right font-semibold">Price</th>
                  <th className="px-3 py-2 text-center font-semibold">Trend</th>
                  <th className="px-3 py-2 text-right font-semibold">Change</th>
                  <th className="px-3 py-2 text-right font-semibold">Volume</th>
                  <th className="px-3 py-2 text-left font-semibold">Sector</th>
                  <th className="px-3 py-2 text-right font-semibold">Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.map((stock, i) => (
                  <tr
                    key={stock.ticker}
                    className={`border-b border-brand-line last:border-0 transition-colors hover:bg-brand-surface ${
                      i % 2 === 0 ? 'bg-white' : 'bg-brand-panel/50'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-bold text-brand-navy">{stock.ticker}</td>
                    <td className="px-3 py-2.5 text-brand-charcoal">{stock.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold">GH₵{stock.price.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <MiniSparkline data={generatePriceHistory(stock.price)} width={72} height={22} />
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${
                      stock.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d={stock.change >= 0 ? 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25' : 'M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25'} />
                        </svg>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-brand-muted">{stock.volume.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-brand-surface px-2 py-0.5 text-[10px] font-medium text-brand-charcoal">
                        {stock.sector}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-brand-muted">{stock.marketCap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FX Rates */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-brand-muted tracking-wider">Foreign Exchange (vs GHS)</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {getExchangeRates()
            .filter((r) => r.to === 'GHS' && r.from !== 'GHS')
            .map((r) => (
              <div key={r.from} className="rounded-lg border border-brand-line bg-white p-4 card-scale-in">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-[11px] font-bold text-white">
                    {CURRENCIES[r.from as CurrencyCode].symbol}
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-purple-600 tracking-wider">{r.from}/GHS</p>
                    <p className="text-[10px] text-brand-muted">{CURRENCIES[r.from as CurrencyCode].name}</p>
                  </div>
                </div>
                <p className="mt-2 text-xl font-bold tracking-tight text-brand-black font-mono">{r.rate.toFixed(2)}</p>
                <p className="text-[10px] text-brand-muted">1 {r.from} = {r.rate.toFixed(2)} GHS</p>
              </div>
            ))}
        </div>
      </div>

      {/* Timestamp */}
      <p className="text-center text-[10px] text-brand-muted">
        Last updated: {new Date(data.timestamp).toLocaleString('en-GH')} &middot; Source: {data.source === 'SEED' ? 'Simulated seed data' : 'Live market feed'} &middot; Auto-refreshes every 60s
      </p>
    </div>
  );
}
