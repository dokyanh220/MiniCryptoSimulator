const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5215";

export interface TickerData {
  symbol: string;
  lastPrice: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  updatedAt: string;
}

export interface KlineData {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: string;
}

/**
 * Fetch real-time ticker data for a specific symbol
 */
export async function getTicker(symbol: string): Promise<TickerData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/market/ticker?symbol=${symbol}`, {
      cache: "no-store",
    });
    // Trả về null nếu server báo 404 (chưa có data trong RAM)
    if (res.status === 404) return null; 
    
    if (!res.ok) {
      console.warn(`[getTicker] Failed to fetch for ${symbol}: ${res.statusText}`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error(`[getTicker] Network error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch candlestick (kline) chart data
 */
export async function getKlines(symbol: string, interval = "1h", limit = 100): Promise<KlineData[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[getKlines] Failed to fetch for ${symbol}: ${res.statusText}`);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error(`[getKlines] Network error for ${symbol}:`, error);
    return [];
  }
}
