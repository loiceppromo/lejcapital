/**
 * Market data feed for LEJ Capital.
 *
 * Provides simulated real-time GSE equity prices and Ghana T-Bill rates.
 * In production, replace the seed data with live API calls to:
 *   - GSE: https://gse.com.gh (or a broker data API)
 *   - T-Bills: Bank of Ghana auction results
 *
 * The feed updates every 60 seconds via client-side polling.
 */

export interface GSEStock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  high52w: number;
  low52w: number;
  marketCap: string;
  sector: string;
  lastUpdated: string;
}

export interface TBillRate {
  tenor: '91-day' | '182-day' | '364-day';
  rate: number;
  previousRate: number;
  change: number;
  auctionDate: string;
  settlementDate: string;
  maturityDate: string;
}

export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePct: number;
  ytdReturn: number;
}

export interface MarketFeedData {
  indices: MarketIndex[];
  stocks: GSEStock[];
  tbills: TBillRate[];
  timestamp: string;
  source: 'SEED' | 'LIVE';
}

/**
 * Seed market data simulating realistic GSE/T-Bill environment.
 * Prices fluctuate slightly on each call to simulate live updates.
 */
function jitter(base: number, pctRange = 0.005): number {
  const delta = base * pctRange * (Math.random() * 2 - 1);
  return Math.round((base + delta) * 100) / 100;
}

export function getMarketFeed(): MarketFeedData {
  const now = new Date().toISOString();

  const gseBaseStocks: Omit<GSEStock, 'change' | 'changePct' | 'lastUpdated'>[] = [
    { ticker: 'MTNGH', name: 'MTN Ghana', price: 1.85, volume: 1245800, high52w: 2.10, low52w: 1.42, marketCap: 'GHS 24.1B', sector: 'Telecoms' },
    { ticker: 'GCB', name: 'GCB Bank', price: 6.20, volume: 342100, high52w: 7.05, low52w: 4.80, marketCap: 'GHS 1.6B', sector: 'Banking' },
    { ticker: 'SCB', name: 'Standard Chartered', price: 22.50, volume: 18400, high52w: 25.00, low52w: 18.20, marketCap: 'GHS 3.3B', sector: 'Banking' },
    { ticker: 'GOIL', name: 'GOIL PLC', price: 1.92, volume: 523600, high52w: 2.25, low52w: 1.55, marketCap: 'GHS 922M', sector: 'Oil & Gas' },
    { ticker: 'TOTAL', name: 'TotalEnergies GH', price: 5.60, volume: 87200, high52w: 6.30, low52w: 4.50, marketCap: 'GHS 582M', sector: 'Oil & Gas' },
    { ticker: 'FML', name: 'Fan Milk Ltd', price: 3.10, volume: 156300, high52w: 3.65, low52w: 2.40, marketCap: 'GHS 465M', sector: 'Consumer' },
    { ticker: 'CAL', name: 'CalBank', price: 0.85, volume: 892400, high52w: 1.02, low52w: 0.62, marketCap: 'GHS 512M', sector: 'Banking' },
    { ticker: 'EGH', name: 'Ecobank Ghana', price: 8.40, volume: 124500, high52w: 9.80, low52w: 6.50, marketCap: 'GHS 2.1B', sector: 'Banking' },
    { ticker: 'SOGEGH', name: 'SG Ghana', price: 1.05, volume: 345200, high52w: 1.35, low52w: 0.78, marketCap: 'GHS 278M', sector: 'Banking' },
    { ticker: 'UNIL', name: 'Unilever Ghana', price: 12.80, volume: 32100, high52w: 14.50, low52w: 10.20, marketCap: 'GHS 843M', sector: 'Consumer' },
  ];

  const stocks: GSEStock[] = gseBaseStocks.map((s) => {
    const price = jitter(s.price);
    const change = +(price - s.price).toFixed(4);
    const changePct = s.price === 0 ? 0 : +((change / s.price) * 100).toFixed(2);
    return { ...s, price, change, changePct, lastUpdated: now };
  });

  const tbills: TBillRate[] = [
    {
      tenor: '91-day',
      rate: 25.48,
      previousRate: 25.62,
      change: -0.14,
      auctionDate: '2026-06-06',
      settlementDate: '2026-06-09',
      maturityDate: '2026-09-08',
    },
    {
      tenor: '182-day',
      rate: 27.15,
      previousRate: 27.30,
      change: -0.15,
      auctionDate: '2026-06-06',
      settlementDate: '2026-06-09',
      maturityDate: '2026-12-08',
    },
    {
      tenor: '364-day',
      rate: 28.75,
      previousRate: 28.90,
      change: -0.15,
      auctionDate: '2026-06-06',
      settlementDate: '2026-06-09',
      maturityDate: '2027-06-07',
    },
  ];

  const indices: MarketIndex[] = [
    {
      name: 'GSE-CI',
      value: jitter(3845.20, 0.003),
      change: jitter(12.45, 0.5),
      changePct: jitter(0.32, 0.3),
      ytdReturn: 18.6,
    },
    {
      name: 'GSE-FSI',
      value: jitter(2156.80, 0.003),
      change: jitter(8.20, 0.5),
      changePct: jitter(0.38, 0.3),
      ytdReturn: 22.4,
    },
  ];

  return {
    indices,
    stocks,
    tbills,
    timestamp: now,
    source: 'SEED',
  };
}
