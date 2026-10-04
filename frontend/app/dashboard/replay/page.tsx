"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, TrendingDown, ClockFading, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BtcCandlestickChart, ChartApiRef } from "@/components/charts/BtcCandlestickChart";
import { getKlines, KlineData } from "@/lib/api/market";
import { useReplayEngine } from "@/hooks/useReplayEngine";
import { useReplayTrading } from "@/hooks/useReplayTrading";
import { ReplayControls } from "@/components/replay/ReplayControls";
import { ReplaySessionSummary } from "@/components/replay/ReplaySessionSummary";
import { useOrderPriceLines } from "@/hooks/useOrderPriceLines";

const SYMBOLS = [
  { label: "BTC/USDT", value: "BTCUSDT" },
  { label: "ETH/USDT", value: "ETHUSDT" },
  { label: "BNB/USDT", value: "BNBUSDT" },
];

const TIMEFRAMES = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

function ReplayPageContent() {
  const router = useRouter();
  const chartRef = useRef<ChartApiRef>(null);

  // Setup state
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("15m");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });

  // Trading form state
  const [activeSide, setActiveSide] = useState<"Long" | "Short">("Long");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  // Hooks
  const engine = useReplayEngine();
  const trading = useReplayTrading();

  // Interactive price lines on chart
  const firstPosition = trading.positions.length > 0 ? trading.positions[0] : null;
  const { editingTarget, setEditingTarget, handlers } = useOrderPriceLines(
    () => chartRef.current?.getChart() || null,
    () => chartRef.current?.getSeries() || null,
    {
      entryPrice: firstPosition ? firstPosition.entryPrice : null,
      slPrice: stopLoss ? parseFloat(stopLoss) : (firstPosition?.stopLoss ?? null),
      tpPrice: takeProfit ? parseFloat(takeProfit) : (firstPosition?.takeProfit ?? null),
      currentPrice: engine.currentPrice,
      side: firstPosition ? firstPosition.side : activeSide,
      onSlChange: (p) => setStopLoss(p.toFixed(1)),
      onTpChange: (p) => setTakeProfit(p.toFixed(1)),
    }
  );

  // Load data
  const handleLoad = async () => {
    engine.load([]);
    trading.resetTrading();
    setShowSummary(false);

    const data = await getKlines(symbol, timeframe, 1000);
    if (data.length === 0) {
      alert("Không tải được dữ liệu. Vui lòng kiểm tra backend.");
      return;
    }
    engine.load(data);
  };

  // Update trading prices when cursor moves
  useEffect(() => {
    if (engine.status === "idle" || engine.status === "loading") return;
    if (engine.cursor < 0 || engine.cursor >= engine.buffer.length) return;

    const candle = engine.buffer[engine.cursor];
    trading.updatePrice(candle.close, engine.cursor, candle.high, candle.low);
  }, [engine.cursor, engine.status]);

  // Show summary when finished
  useEffect(() => {
    if (engine.status === "finished" && trading.closedTrades.length > 0) {
      setShowSummary(true);
    }
  }, [engine.status]);

  // Place order handler
  const handlePlaceOrder = () => {
    const qty = parseFloat(amount);
    if (isNaN(qty) || qty <= 0) return;

    const sl = stopLoss ? parseFloat(stopLoss) : null;
    const tp = takeProfit ? parseFloat(takeProfit) : null;

    const result = trading.openPosition(
      activeSide,
      qty,
      leverage,
      engine.currentPrice,
      sl,
      tp,
      engine.cursor,
    );

    if (result.success) {
      setAmount("");
      setStopLoss("");
      setTakeProfit("");
      setEditingTarget(null);
    } else {
      alert(result.message);
    }
  };

  // Close position handler
  const handleClosePosition = (posId: string) => {
    trading.closePosition(posId, engine.currentPrice, engine.cursor);
  };

  const handleUpdatePosition = (pos: any) => {
    const slInput = window.prompt(`Nhập giá Cắt lỗ (SL) mới:\n(Để trống nếu muốn hủy SL)`, pos.stopLoss?.toString() || "");
    if (slInput === null) return;
    
    const tpInput = window.prompt(`Nhập giá Chốt lời (TP) mới:\n(Để trống nếu muốn hủy TP)`, pos.takeProfit?.toString() || "");
    if (tpInput === null) return;

    const sl = slInput.trim() ? parseFloat(slInput) : undefined;
    const tp = tpInput.trim() ? parseFloat(tpInput) : undefined;

    // Call updatePosition from useReplayTrading
    trading.updatePosition(pos.id, sl, tp);
  };

  // Handle full reset
  const handleFullReset = () => {
    engine.reset();
    trading.resetTrading();
    setShowSummary(false);
    setAmount("");
    setStopLoss("");
    setTakeProfit("");
  };

  // Handle save
  const handleSave = () => {
    trading.saveSession(symbol, timeframe);
    alert("Đã lưu kết quả phiên replay!");
  };

  // Quick size helpers
  const applyPercentSize = (pct: number) => {
    if (engine.currentPrice <= 0) return;
    const maxNotional = trading.virtualBalance * leverage;
    const maxQty = maxNotional / engine.currentPrice;
    setAmount((maxQty * pct).toFixed(5));
  };

  // Price estimate
  const qty = parseFloat(amount) || 0;
  const estNotional = qty * engine.currentPrice;
  const estMargin = leverage > 0 ? estNotional / leverage : 0;

  const baseAsset = symbol.replace("USDT", "");
  const isReady = engine.status !== "idle" && engine.status !== "loading";

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] text-white">
      {/* Top Bar */}
      <div className="h-12 bg-[#181a20] border-b border-[#1f2937] flex items-center px-4 gap-4 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>

        <div className="h-6 w-px bg-[#1f2937]" />

        <span className="text-[#FCD535] font-bold text-sm flex items-center">
          <ClockFading size={16} className="mr-2"/>
          REPLAY
        </span>

        {/* Header Content when Ready */}
        {isReady && (
          <>
            <div className="h-6 w-px bg-[#1f2937]" />
            <span className="text-white font-bold text-sm bg-[#2b3139] px-2 py-1 rounded">
              {SYMBOLS.find(s => s.value === symbol)?.label || symbol}
            </span>

            <div className="flex gap-1 ml-2">
              <span className="px-2 py-1 text-[10px] rounded bg-[#FCD535] text-black font-bold">
                {TIMEFRAMES.find(t => t.value === timeframe)?.label || timeframe}
              </span>
            </div>

            <div className="h-6 w-px bg-[#1f2937] ml-2" />

            <span className="text-gray-400 text-xs ml-2 flex items-center">
              Từ {new Date(startDate).toLocaleDateString('vi-VN')}
            </span>

            <div className="h-6 w-px bg-[#1f2937] ml-2" />

            {/* Price Display */}
            <span className="text-white font-bold text-sm tabular-nums ml-2">
              ${engine.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            
            <div className="flex-1" />
            
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/trade?symbol=${symbol}`)}
              className="bg-[#0ECB81] hover:bg-[#0bb573] text-white font-bold text-xs px-4"
            >
              Thị trường thực
            </Button>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Chart */}
          <div className="flex-1 relative w-full h-full min-h-0" {...handlers}>
            {engine.status === "idle" ? (
              <div className="flex items-center justify-center h-full bg-[#0D1117]">
                <div className="text-center w-full max-w-2xl px-6 py-8 rounded-xl border border-[#1f2937] bg-[#181a20] shadow-2xl">
                  <div className="flex justify-center mb-4">
                    <div className="bg-[#2b3139] p-4 rounded-full shadow-inner shadow-black/50">
                       <ClockFading size={40} className="text-[#FCD535]" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Chế độ Market Replay</h2>
                  <p className="text-gray-400 mb-8 text-sm">
                    Luyện tập giao dịch bằng dữ liệu quá khứ. Không rủi ro, không mất tiền thật.
                  </p>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-left">
                    
                    {/* Symbol Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Cặp giao dịch</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SYMBOLS.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setSymbol(s.value)}
                            className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                              symbol === s.value 
                                ? "border-[#FCD535] bg-[#FCD535]/10 text-[#FCD535]" 
                                : "border-[#374151] bg-[#0D1117] text-white hover:border-gray-500"
                            }`}
                          >
                            <span className="font-bold">{s.label.split('/')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time & Date */}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Khung thời gian</label>
                        <div className="flex gap-1 flex-wrap">
                          {TIMEFRAMES.map(tf => (
                            <button
                              key={tf.value}
                              onClick={() => setTimeframe(tf.value)}
                              className={`px-3 py-2 text-xs rounded transition-all flex-1 text-center ${
                                timeframe === tf.value
                                  ? "bg-[#FCD535] text-black font-bold shadow-md"
                                  : "bg-[#0D1117] text-gray-400 border border-[#374151] hover:text-white hover:border-gray-500"
                              }`}
                            >
                              {tf.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">Ngày bắt đầu</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-[#0D1117] text-white text-sm px-4 py-2 rounded-lg border border-[#374151] focus:border-[#FCD535] outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleLoad}
                    className="w-full bg-[#0ECB81] hover:bg-[#0bb573] text-white font-bold text-lg h-14 rounded-lg shadow-lg shadow-[#0ECB81]/20 transition-all hover:scale-[1.01]"
                  >
                    Bắt đầu Replay
                  </Button>
                </div>
              </div>
            ) : (
              <BtcCandlestickChart
                ref={chartRef}
                historicalData={engine.visibleCandles}
                realtimeCandle={null}
              />
            )}
          </div>

          {/* Playback Controls */}
          {isReady && (
            <ReplayControls
              status={engine.status}
              progress={engine.progress}
              cursor={engine.cursor}
              totalCandles={engine.totalCandles}
              speed={engine.speed}
              speedOptions={engine.SPEED_OPTIONS}
              onPlay={engine.play}
              onPause={engine.pause}
              onStep={engine.step}
              onStepBack={engine.stepBack}
              onReset={handleFullReset}
              onSetSpeed={engine.setSpeed}
              onSeek={engine.seekTo}
            />
          )}
        </div>

        {/* Right Panel: Trading */}
        {isReady && (
          <div className="w-[320px] bg-[#181a20] border-l border-[#1f2937] flex flex-col h-full overflow-y-auto shrink-0">
            {/* Virtual Balance */}
            <div className="p-4 border-b border-[#1f2937]">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center">
                <Wallet size={20} className="mr-2"/>
                 Ví ảo Replay
              </h3>
              <div className="bg-[#1f2937]/50 rounded p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8b92a5]">Số dư</span>
                  <span className={`font-bold ${trading.virtualBalance >= trading.INITIAL_BALANCE ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                    ${trading.virtualBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8b92a5]">Vị thế mở</span>
                  <span className="text-white font-bold">{trading.positions.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8b92a5]">Lệnh đã đóng</span>
                  <span className="text-white font-bold">{trading.closedTrades.length}</span>
                </div>
              </div>
            </div>

            {/* Order Panel */}
            <div className="p-4 flex-1">
              {/* Long / Short Toggle */}
              <div className="flex gap-1 mb-4 bg-[#1f2937] rounded-lg p-1">
                <button
                  onClick={() => setActiveSide("Long")}
                  className={`flex-1 font-bold py-2 rounded text-sm transition-all ${
                    activeSide === "Long" ? "bg-[#0ECB81] text-white shadow-lg" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <TrendingUp className="inline h-3 w-3 mr-1" /> Long
                </button>
                <button
                  onClick={() => setActiveSide("Short")}
                  className={`flex-1 font-bold py-2 rounded text-sm transition-all ${
                    activeSide === "Short" ? "bg-[#F6465D] text-white shadow-lg" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <TrendingDown className="inline h-3 w-3 mr-1" /> Short
                </button>
              </div>

              <div className="space-y-4">
                {/* Leverage */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Đòn bẩy</span>
                    <span className="text-[#FCD535] font-bold">{leverage}x</span>
                  </div>
                  <input
                    type="range" min="1" max="100"
                    value={leverage} onChange={e => setLeverage(parseInt(e.target.value))}
                    className="w-full accent-[#FCD535]"
                  />
                </div>

                {/* Size */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Kích thước ({baseAsset})</span>
                  </div>
                  <Input
                    type="number" step="any" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#1f2937] border-none text-white h-10"
                  />
                  <div className="flex justify-between gap-1 pt-1">
                    <button onClick={() => applyPercentSize(0.25)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">25%</button>
                    <button onClick={() => applyPercentSize(0.50)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">50%</button>
                    <button onClick={() => applyPercentSize(0.75)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">75%</button>
                    <button onClick={() => applyPercentSize(0.99)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">Max</button>
                  </div>
                </div>

                {/* TP */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Chốt lời (TP) USDT</span></div>
                  <Input
                    type="number" step="any" value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    onFocus={() => setEditingTarget("TP")}
                    placeholder="Không đặt"
                    className="bg-[#1f2937] border-none text-white h-10"
                  />
                </div>

                {/* SL */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Cắt lỗ (SL) USDT</span></div>
                  <Input
                    type="number" step="any" value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    onFocus={() => setEditingTarget("SL")}
                    placeholder="Không đặt"
                    className="bg-[#1f2937] border-none text-white h-10"
                  />
                </div>

                {/* Estimate */}
                {qty > 0 && engine.currentPrice > 0 && (
                  <div className="bg-[#1f2937] rounded p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Quy mô vị thế</span><span className="text-white">${estNotional.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Ký quỹ</span><span className="text-[#FCD535]">${estMargin.toFixed(2)}</span></div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={!amount || qty <= 0 || engine.status === "idle"}
                  className={`w-full h-12 font-bold text-white text-base mt-2 transition-all ${
                    activeSide === "Long" ? "bg-[#0ECB81] hover:bg-[#0b9c63]" : "bg-[#F6465D] hover:bg-[#c9384b]"
                  }`}
                >
                  Mở {activeSide}
                </Button>
              </div>
            </div>

            {/* Open Positions */}
            {trading.positions.length > 0 && (
              <div className="border-t border-[#1f2937] p-3">
                <h4 className="text-xs text-[#8b92a5] mb-2 font-medium">Vị thế đang mở</h4>
                {trading.positions.map(pos => {
                  const pnlColor = pos.unrealizedPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]";
                  const roi = pos.margin > 0 ? (pos.unrealizedPnl / pos.margin) * 100 : 0;
                  return (
                    <div key={pos.id} className="bg-[#1f2937]/50 rounded p-2 mb-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className={pos.side === "Long" ? "text-[#0ECB81] font-bold" : "text-[#F6465D] font-bold"}>
                          {pos.side} {pos.leverage}x
                        </span>
                        <span className={`font-bold ${pnlColor}`}>
                          {pos.unrealizedPnl >= 0 ? "+" : ""}{pos.unrealizedPnl.toFixed(2)} USDT ({roi.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Vào: {pos.entryPrice.toLocaleString()}</span>
                        <span>SL: {pos.stopLoss?.toLocaleString() || "—"} | TP: {pos.takeProfit?.toLocaleString() || "—"}</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdatePosition(pos)}
                          className="flex-1 h-6 text-[10px] bg-[#2b3139] hover:bg-[#FCD535] hover:text-black"
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleClosePosition(pos.id)}
                          className="flex-1 h-6 text-[10px] bg-[#2b3139] hover:bg-white hover:text-black"
                        >
                          Đóng
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ReplaySessionSummary
              stats={trading.stats}
              closedTrades={trading.closedTrades}
              finalBalance={trading.virtualBalance}
              initialBalance={trading.INITIAL_BALANCE}
              onReset={() => {
                handleFullReset();
                setShowSummary(false);
              }}
              onSave={() => {
                handleSave();
                setShowSummary(false);
              }}
            />
            <button
              onClick={() => setShowSummary(false)}
              className="w-full mt-3 py-2 bg-[#2b3139] hover:bg-[#374151] text-gray-300 text-sm rounded"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0D1117] text-white">Đang tải Replay...</div>}>
      <ReplayPageContent />
    </Suspense>
  );
}
