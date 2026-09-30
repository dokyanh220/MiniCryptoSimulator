"use client";

import React from "react";
import type { SessionStats, ReplayTrade } from "@/hooks/useReplayTrading";

interface ReplaySessionSummaryProps {
  stats: SessionStats;
  closedTrades: ReplayTrade[];
  finalBalance: number;
  initialBalance: number;
  onReset: () => void;
  onSave: () => void;
}

export function ReplaySessionSummary({
  stats,
  closedTrades,
  finalBalance,
  initialBalance,
  onReset,
  onSave,
}: ReplaySessionSummaryProps) {
  const balanceChange = finalBalance - initialBalance;
  const balanceChangePercent = (balanceChange / initialBalance) * 100;

  return (
    <div className="bg-[#181a20] rounded-lg border border-[#1f2937] overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#0ECB81]/10 to-[#FCD535]/10 border-b border-[#1f2937]">
        <h3 className="text-lg font-bold text-white mb-1">📊 Kết quả phiên Replay</h3>
        <p className="text-xs text-gray-400">Tổng kết hiệu suất giao dịch</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1f2937]">
        <StatCard label="Tổng lệnh" value={stats.totalTrades.toString()} />
        <StatCard
          label="Thắng / Thua"
          value={`${stats.wins} / ${stats.losses}`}
          valueColor={stats.wins > stats.losses ? "text-[#0ECB81]" : stats.wins < stats.losses ? "text-[#F6465D]" : "text-white"}
        />
        <StatCard
          label="Tỷ lệ thắng"
          value={`${stats.winRate.toFixed(1)}%`}
          valueColor={stats.winRate >= 50 ? "text-[#0ECB81]" : "text-[#F6465D]"}
        />
        <StatCard
          label="Tổng PNL"
          value={`${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)} USDT`}
          valueColor={stats.totalPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
        />
        <StatCard
          label="Số dư cuối"
          value={`${finalBalance.toFixed(2)} USDT`}
          subValue={`${balanceChange >= 0 ? "+" : ""}${balanceChangePercent.toFixed(1)}%`}
          valueColor={balanceChange >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}
        />
        <StatCard
          label="Max Drawdown"
          value={`-${stats.maxDrawdown.toFixed(2)} USDT`}
          valueColor="text-[#F6465D]"
        />
        <StatCard
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
          valueColor={stats.profitFactor >= 1 ? "text-[#0ECB81]" : "text-[#F6465D]"}
        />
        <StatCard
          label="Lệnh tốt / xấu nhất"
          value={`+${stats.bestTrade.toFixed(0)} / ${stats.worstTrade.toFixed(0)}`}
          valueColor="text-white"
        />
      </div>

      {/* Trade List */}
      {closedTrades.length > 0 && (
        <div className="border-t border-[#1f2937] max-h-[200px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-[#8b92a5] sticky top-0 bg-[#181a20]">
              <tr>
                <th className="font-normal py-2 px-3 text-left">#</th>
                <th className="font-normal py-2 px-3 text-left">Vị thế</th>
                <th className="font-normal py-2 px-3 text-right">Vào lệnh</th>
                <th className="font-normal py-2 px-3 text-right">Đóng lệnh</th>
                <th className="font-normal py-2 px-3 text-right">PNL</th>
                <th className="font-normal py-2 px-3 text-right">ROI</th>
                <th className="font-normal py-2 px-3 text-left">Lý do</th>
              </tr>
            </thead>
            <tbody>
              {closedTrades.map((t, i) => (
                <tr key={t.id} className="border-t border-[#1f2937]/50 hover:bg-[#2b3139]">
                  <td className="py-1.5 px-3 text-gray-500">{i + 1}</td>
                  <td className={`py-1.5 px-3 font-medium ${t.side === "Long" ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {t.side} {t.leverage}x
                  </td>
                  <td className="py-1.5 px-3 text-right text-white">{t.entryPrice.toLocaleString()}</td>
                  <td className="py-1.5 px-3 text-right text-white">{t.exitPrice.toLocaleString()}</td>
                  <td className={`py-1.5 px-3 text-right font-medium ${t.netPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {t.netPnl >= 0 ? "+" : ""}{t.netPnl.toFixed(2)}
                  </td>
                  <td className={`py-1.5 px-3 text-right ${t.roi >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    {t.roi >= 0 ? "+" : ""}{t.roi.toFixed(1)}%
                  </td>
                  <td className="py-1.5 px-3 text-gray-400">{t.closeReason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-[#1f2937] flex gap-3">
        <button
          onClick={onSave}
          className="flex-1 py-2 bg-[#FCD535] hover:bg-[#e5c22f] text-black font-bold text-sm rounded transition-colors"
        >
          💾 Lưu kết quả
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-2 bg-[#2b3139] hover:bg-[#374151] text-white font-bold text-sm rounded transition-colors"
        >
          🔄 Chơi lại
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  valueColor = "text-white",
}: {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-[#181a20] p-3">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className={`text-sm font-bold ${valueColor}`}>
        {value}
        {subValue && <span className="text-[10px] ml-1 opacity-70">({subValue})</span>}
      </div>
    </div>
  );
}
