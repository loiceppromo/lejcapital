/**
 * GET /api/market-data
 *
 * Returns current market data feed (GSE indices, T-Bill rates, stock prices).
 * Used by client-side components for real-time data refresh.
 *
 * In production, this would proxy to external data providers:
 *   - GSE: Ghana Stock Exchange API
 *   - T-Bills: Bank of Ghana auction data
 *   - FX: Bank of Ghana reference rates
 */

import { getMarketFeed } from '@/lib/market/data-feed';
import { getExchangeRates } from '@/lib/currency/converter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const feed = getMarketFeed();
  const rates = getExchangeRates();

  return Response.json({
    ...feed,
    exchangeRates: rates,
  });
}
