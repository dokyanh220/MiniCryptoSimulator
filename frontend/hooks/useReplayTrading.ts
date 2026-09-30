"use client";

import { useState, useCallback, useRef } from "react";

export interface ReplayPosition {
  id: string;
  side: "Long" | "Short";
  entryPrice: number;
  quantity: number;
  leverage: number;
  margin: number;
  stopLoss: number | null;
  takeProfit: number | null;
  unrealizedPnl: number;
}

export interface ReplayTrade {
  id: string;
  side: "Long" | "Short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  margin: number;
  grossPnl: number;
  netPnl: number;
  roi: number;
  closeReason: "Thủ công" | "Chạm SL" | "Chạm TP";
  openedAt: number;  // cursor index
  closedAt: number;  // cursor index
}

export interface SessionStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  maxDrawdown: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
}

const INITIAL_BALANCE = 10000;

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function useReplayTrading() {
  const [virtualBalance, setVirtualBalance] = useState(INITIAL_BALANCE);
  const [positions, setPositions] = useState<ReplayPosition[]>([]);
  const [closedTrades, setClosedTrades] = useState<ReplayTrade[]>([]);
  const peakBalance = useRef(INITIAL_BALANCE);
  const maxDrawdown = useRef(0);

  // Calculate Gross PNL
  const calcGrossPnl = (side: "Long" | "Short", entryPrice: number, exitPrice: number, quantity: number): number => {
    return side === "Long"
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;
  };

  // Open a position
  const openPosition = useCallback((
    side: "Long" | "Short",
    quantity: number,
    leverage: number,
    entryPrice: number,
    stopLoss: number | null,
    takeProfit: number | null,
    cursorIndex: number,
  ) => {
    const notional = quantity * entryPrice;
    const margin = notional / leverage;

    if (margin > virtualBalance) {
      return { success: false, message: "Không đủ số dư ví ảo" };
    }

    // Validate SL/TP
    if (side === "Long") {
      if (stopLoss !== null && stopLoss >= entryPrice) return { success: false, message: "SL phải < Giá vào lệnh (Long)" };
      if (takeProfit !== null && takeProfit <= entryPrice) return { success: false, message: "TP phải > Giá vào lệnh (Long)" };
    } else {
      if (stopLoss !== null && stopLoss <= entryPrice) return { success: false, message: "SL phải > Giá vào lệnh (Short)" };
      if (takeProfit !== null && takeProfit >= entryPrice) return { success: false, message: "TP phải < Giá vào lệnh (Short)" };
    }

    const pos: ReplayPosition = {
      id: generateId(),
      side,
      entryPrice,
      quantity,
      leverage,
      margin,
      stopLoss,
      takeProfit,
      unrealizedPnl: 0,
    };

    setVirtualBalance(prev => prev - margin);
    setPositions(prev => [...prev, pos]);
    return { success: true, message: "Đã mở vị thế", position: pos };
  }, [virtualBalance]);

  // Close a position manually
  const closePosition = useCallback((positionId: string, exitPrice: number, cursorIndex: number, reason: "Thủ công" | "Chạm SL" | "Chạm TP" = "Thủ công") => {
    setPositions(prev => {
      const pos = prev.find(p => p.id === positionId);
      if (!pos) return prev;

      const grossPnl = calcGrossPnl(pos.side, pos.entryPrice, exitPrice, pos.quantity);
      const netPnl = grossPnl; // No fees in simulator
      const roi = pos.margin > 0 ? (netPnl / pos.margin) * 100 : 0;

      const trade: ReplayTrade = {
        id: pos.id,
        side: pos.side,
        entryPrice: pos.entryPrice,
        exitPrice,
        quantity: pos.quantity,
        leverage: pos.leverage,
        margin: pos.margin,
        grossPnl,
        netPnl,
        roi,
        closeReason: reason,
        openedAt: 0,
        closedAt: cursorIndex,
      };

      setClosedTrades(prev => [...prev, trade]);

      // Return margin + PNL
      const amountToReturn = pos.margin + grossPnl;
      setVirtualBalance(prev => {
        const newBalance = prev + Math.max(0, amountToReturn);
        // Track peak and drawdown
        if (newBalance > peakBalance.current) {
          peakBalance.current = newBalance;
        }
        const dd = peakBalance.current - newBalance;
        if (dd > maxDrawdown.current) {
          maxDrawdown.current = dd;
        }
        return newBalance;
      });

      return prev.filter(p => p.id !== positionId);
    });
  }, []);

  // Update unrealized PNL and check SL/TP triggers
  const updatePrice = useCallback((currentPrice: number, cursorIndex: number, candleHigh: number, candleLow: number) => {
    setPositions(prev => {
      const toClose: { id: string; price: number; reason: "Chạm SL" | "Chạm TP" }[] = [];

      const updated = prev.map(pos => {
        const unrealizedPnl = calcGrossPnl(pos.side, pos.entryPrice, currentPrice, pos.quantity);

        // Check SL/TP using candle High/Low for accuracy
        if (pos.side === "Long") {
          if (pos.stopLoss !== null && candleLow <= pos.stopLoss) {
            toClose.push({ id: pos.id, price: pos.stopLoss, reason: "Chạm SL" });
          } else if (pos.takeProfit !== null && candleHigh >= pos.takeProfit) {
            toClose.push({ id: pos.id, price: pos.takeProfit, reason: "Chạm TP" });
          }
        } else {
          if (pos.stopLoss !== null && candleHigh >= pos.stopLoss) {
            toClose.push({ id: pos.id, price: pos.stopLoss, reason: "Chạm SL" });
          } else if (pos.takeProfit !== null && candleLow <= pos.takeProfit) {
            toClose.push({ id: pos.id, price: pos.takeProfit, reason: "Chạm TP" });
          }
        }

        return { ...pos, unrealizedPnl };
      });

      // Trigger SL/TP closures
      if (toClose.length > 0) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          toClose.forEach(({ id, price, reason }) => {
            closePosition(id, price, cursorIndex, reason);
          });
        }, 0);
      }

      return updated;
    });
  }, [closePosition]);

  // Compute session stats
  const stats: SessionStats = (() => {
    const wins = closedTrades.filter(t => t.netPnl > 0);
    const losses = closedTrades.filter(t => t.netPnl <= 0);
    const totalPnl = closedTrades.reduce((s, t) => s + t.netPnl, 0);
    const totalWinPnl = wins.reduce((s, t) => s + t.netPnl, 0);
    const totalLossPnl = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));

    return {
      totalTrades: closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
      totalPnl,
      maxDrawdown: maxDrawdown.current,
      profitFactor: totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? Infinity : 0,
      bestTrade: closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.netPnl)) : 0,
      worstTrade: closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.netPnl)) : 0,
    };
  })();

  // Reset everything
  const resetTrading = useCallback(() => {
    setVirtualBalance(INITIAL_BALANCE);
    setPositions([]);
    setClosedTrades([]);
    peakBalance.current = INITIAL_BALANCE;
    maxDrawdown.current = 0;
  }, []);

  // Save session to localStorage
  const saveSession = useCallback((symbol: string, timeframe: string) => {
    const session = {
      id: generateId(),
      symbol,
      timeframe,
      date: new Date().toISOString(),
      stats,
      closedTrades,
      finalBalance: virtualBalance,
    };
    const saved = JSON.parse(localStorage.getItem("replay_sessions") || "[]");
    saved.unshift(session);
    // Keep last 50 sessions
    if (saved.length > 50) saved.length = 50;
    localStorage.setItem("replay_sessions", JSON.stringify(saved));
    return session;
  }, [stats, closedTrades, virtualBalance]);

  return {
    virtualBalance,
    positions,
    closedTrades,
    stats,
    openPosition,
    closePosition,
    updatePrice,
    resetTrading,
    saveSession,
    INITIAL_BALANCE,
  };
}
