const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5215";

export interface WalletBalance {
  asset: string;
  available: number;
  locked: number;
  usedMargin: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  balances: WalletBalance[];
}

export interface OrderResult {
  success: boolean;
  message: string;
  orderId?: string;
  positionId?: string;
  executedPrice: number;
  executedQuantity: number;
  margin: number;
  fee: number;
}

export interface PositionRecord {
  id: string;
  symbol: string;
  side: "Long" | "Short";
  quantity: number;
  entryPrice: number;
  leverage: number;
  margin: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  status: string;
  openedAt: string;
}

export interface TradeRecord {
  id: string;
  positionId: string;
  symbol: string;
  side: "Long" | "Short";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  grossPnl: number;
  entryFee: number;
  exitFee: number;
  netPnl: number;
  closeReason: string;
  openedAt: string;
  closedAt: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function placeOrder(
  symbol: string,
  side: "Long" | "Short",
  quantity: number,
  leverage: number,
  stopLossPrice?: number,
  takeProfitPrice?: number
): Promise<OrderResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trading/order`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ symbol, side, type: "Market", quantity, leverage, stopLossPrice, takeProfitPrice }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.message || "Failed to place order",
        executedPrice: 0,
        executedQuantity: 0,
        margin: 0,
        fee: 0,
      };
    }
    return data;
  } catch (error) {
    return {
      success: false,
      message: "Server connection error",
      executedPrice: 0,
      executedQuantity: 0,
      margin: 0,
      fee: 0,
    };
  }
}

export async function closePosition(positionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trading/positions/${positionId}/close`, {
      method: "POST",
      headers: authHeaders(),
    });
    const data = await res.json();
    return res.ok ? { success: true, message: "Closed" } : { success: false, message: data.message };
  } catch {
    return { success: false, message: "Server connection error" };
  }
}

export async function getPositions(): Promise<PositionRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/trading/positions`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getProfile(): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getTradeHistory(symbol?: string): Promise<TradeRecord[]> {
  try {
    const query = symbol ? `?symbol=${symbol}` : "";
    const res = await fetch(`${API_BASE_URL}/api/trading/history${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
