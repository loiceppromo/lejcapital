import { describe, it, expect } from 'vitest';
import { getMarketFeed } from '../data-feed';

describe('getMarketFeed', () => {
  it('returns indices, stocks, tbills, and timestamp', () => {
    const feed = getMarketFeed();
    expect(feed.indices.length).toBe(2);
    expect(feed.stocks.length).toBe(10);
    expect(feed.tbills.length).toBe(3);
    expect(feed.source).toBe('SEED');
    expect(feed.timestamp).toBeTruthy();
  });

  it('indices have required fields', () => {
    const feed = getMarketFeed();
    for (const idx of feed.indices) {
      expect(idx.name).toBeTruthy();
      expect(typeof idx.value).toBe('number');
      expect(typeof idx.change).toBe('number');
      expect(typeof idx.changePct).toBe('number');
      expect(typeof idx.ytdReturn).toBe('number');
    }
  });

  it('stocks have required fields', () => {
    const feed = getMarketFeed();
    for (const stock of feed.stocks) {
      expect(stock.ticker).toBeTruthy();
      expect(stock.name).toBeTruthy();
      expect(typeof stock.price).toBe('number');
      expect(stock.price).toBeGreaterThan(0);
      expect(typeof stock.volume).toBe('number');
      expect(stock.sector).toBeTruthy();
    }
  });

  it('tbills cover all three tenors', () => {
    const feed = getMarketFeed();
    const tenors = feed.tbills.map((t) => t.tenor);
    expect(tenors).toContain('91-day');
    expect(tenors).toContain('182-day');
    expect(tenors).toContain('364-day');
  });

  it('tbill rates are in realistic range', () => {
    const feed = getMarketFeed();
    for (const bill of feed.tbills) {
      expect(bill.rate).toBeGreaterThan(10);
      expect(bill.rate).toBeLessThan(50);
    }
  });

  it('produces slightly different values on successive calls (jitter)', () => {
    const feed1 = getMarketFeed();
    const feed2 = getMarketFeed();
    // At least one stock should have a different price due to jitter
    const anyDifferent = feed1.stocks.some((s, i) => s.price !== feed2.stocks[i].price);
    expect(anyDifferent).toBe(true);
  });
});
