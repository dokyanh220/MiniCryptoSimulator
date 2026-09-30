"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Settings, Wifi, WifiOff, PanelRightClose, PanelRight, PanelBottomClose, PanelBottom
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTicker, getKlines } from "@/lib/api/market";
import { placeOrder, closePosition, getProfile, getPositions, getTradeHistory, type WalletBalance, type TradeRecord, type PositionRecord } from "@/lib/api/trading";
import { useSignalR, type TickerUpdate, type CandleUpdate } from "@/hooks/use-signalr";
import { BtcCandlestickChart, ChartApiRef } from "@/components/charts/BtcCandlestickChart";
import { useOrderPriceLines } from "@/hooks/useOrderPriceLines";
import { usePositionPriceLines } from "@/hooks/usePositionPriceLines";

const ALL_TIMEFRAMES = [
  { label: "1m", interval: "1m" },
  { label: "3m", interval: "3m" },
  { label: "5m", interval: "5m" },
  { label: "15m", interval: "15m" },
  { label: "30m", interval: "30m" },
  { label: "1h", interval: "1h" },
  { label: "2h", interval: "2h" },
  { label: "4h", interval: "4h" },
  { label: "6h", interval: "6h" },
  { label: "8h", interval: "8h" },
  { label: "12h", interval: "12h" },
  { label: "1d", interval: "1d" },
  { label: "3d", interval: "3d" },
  { label: "1w", interval: "1w" },
  { label: "1M", interval: "1M" },
];

function TradingTerminalContent() {
  const searchParams = useSearchParams();
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const baseAsset = symbol.replace("USDT", "");
  const router = useRouter();

  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [high24h, setHigh24h] = useState(0);
  const [low24h, setLow24h] = useState(0);
  const [volume24h, setVolume24h] = useState(0);

  const [activeSide, setActiveSide] = useState<"Long" | "Short">("Long");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [usdtBalance, setUsdtBalance] = useState<WalletBalance | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");

  const chartRef = useRef<ChartApiRef>(null);

  const { editingTarget, setEditingTarget, handlers } = useOrderPriceLines(
    () => chartRef.current?.getChart() || null,
    () => chartRef.current?.getSeries() || null,
    {
      entryPrice: parseFloat(amount) > 0 ? currentPrice : null,
      slPrice: stopLoss ? parseFloat(stopLoss) : null,
      tpPrice: takeProfit ? parseFloat(takeProfit) : null,
      currentPrice,
      side: activeSide,
      onSlChange: (p) => setStopLoss(p.toString()),
      onTpChange: (p) => setTakeProfit(p.toString()),
    }
  );

  usePositionPriceLines(() => chartRef.current?.getSeries() || null, positions);

  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [realtimeCandle, setRealtimeCandle] = useState<any>(null);
  const [activeTimeframe, setActiveTimeframe] = useState("15m");
  const [favoriteTimeframes, setFavoriteTimeframes] = useState<string[]>(["1m", "5m", "15m", "1h", "4h"]);
  const [showTfSettings, setShowTfSettings] = useState(false);

  // Panel resizing states
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);

  const { isConnected, on } = useSignalR();

  useEffect(() => {
    const saved = localStorage.getItem("favoriteTimeframes");
    if (saved) {
      try {
        setFavoriteTimeframes(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const toggleFavoriteTf = (tf: string) => {
    setFavoriteTimeframes(prev => {
      let next = [...prev];
      if (next.includes(tf)) {
        if (next.length > 1) next = next.filter(t => t !== tf);
      } else {
        if (next.length < 8) next.push(tf); // Max 8 favorites
      }
      next.sort((a, b) => ALL_TIMEFRAMES.findIndex(x => x.interval === a) - ALL_TIMEFRAMES.findIndex(x => x.interval === b));
      localStorage.setItem("favoriteTimeframes", JSON.stringify(next));
      return next;
    });
  };

  const loadProfileAndPositions = useCallback(async () => {
    if (!localStorage.getItem("accessToken")) return;
    const profile = await getProfile();
    if (profile) {
      setIsLoggedIn(true);
      const usdt = profile.balances.find((b) => b.asset === "USDT");
      if (usdt) setUsdtBalance(usdt);
    }
    const pos = await getPositions();
    setPositions(pos.filter(p => p.symbol === symbol));
    
    const hist = await getTradeHistory(symbol);
    setTrades(hist);
  }, [symbol]);

  useEffect(() => {
    loadProfileAndPositions();
    const interval = setInterval(loadProfileAndPositions, 5000);
    return () => clearInterval(interval);
  }, [loadProfileAndPositions]);

  useEffect(() => {
    setHistoricalData([]); 
    getKlines(symbol, activeTimeframe, 300).then(data => {
        if (data) setHistoricalData(data);
    });
  }, [symbol, activeTimeframe]);

  useEffect(() => {
    getTicker(symbol).then(data => {
      if (data) {
        setCurrentPrice(data.lastPrice);
        setPriceChange(data.priceChangePercent);
        setHigh24h(data.highPrice);
        setLow24h(data.lowPrice);
        setVolume24h(data.volume);
      }
    });
  }, [symbol]);

  useEffect(() => {
    if (isConnected) {
      const unsubscribeTicker = on("TickerUpdated", (data: TickerUpdate) => {
        if (data.symbol === symbol) {
            setCurrentPrice(data.lastPrice);
            setPriceChange(data.priceChangePercent);
            setHigh24h(data.highPrice);
            setLow24h(data.lowPrice);
            setVolume24h(data.volume);
        }
      });
      
      const unsubscribeCandle = on("CandleUpdated", (data: CandleUpdate) => {
          if (data.symbol === symbol && data.interval === activeTimeframe) {
              setRealtimeCandle(data);
          }
      });
      
      return () => {
          unsubscribeTicker();
          unsubscribeCandle();
      };
    }
  }, [symbol, activeTimeframe, isConnected, on]);

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    const qty = parseFloat(amount);
    if (isNaN(qty) || qty <= 0) return;

    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    setIsSubmitting(true);
    const res = await placeOrder(symbol, activeSide, qty, leverage, sl, tp);
    setIsSubmitting(false);

    if (res.success) {
      setAmount("");
      setStopLoss("");
      setTakeProfit("");
      loadProfileAndPositions();
    } else {
      alert("Lỗi: " + res.message);
    }
  };

  const handleClosePosition = async (id: string) => {
    const res = await closePosition(id);
    if (res.success) {
      loadProfileAndPositions();
    } else {
      alert("Lỗi: " + res.message);
    }
  };

  const applyPercentSize = (pct: number) => {
    if (!usdtBalance || currentPrice <= 0) return;
    const availableUsdt = usdtBalance.available;
    const allocatableMargin = availableUsdt * pct;
    const maxNotional = allocatableMargin * leverage;
    const feeRate = 0;
    const safeQty = allocatableMargin / (currentPrice * (1/leverage + feeRate));
    setAmount(Math.floor(safeQty * 10000) / 10000 + "");
  };

  const startRightDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = "col-resize";
    const onMouseMove = (ev: MouseEvent) => {
      let newWidth = document.body.clientWidth - ev.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setRightPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      document.body.style.cursor = "default";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const startBottomDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = "row-resize";
    const onMouseMove = (ev: MouseEvent) => {
      let newHeight = document.body.clientHeight - ev.clientY;
      if (newHeight < 100) newHeight = 100;
      if (newHeight > document.body.clientHeight * 0.8) newHeight = document.body.clientHeight * 0.8;
      setBottomPanelHeight(newHeight);
    };
    const onMouseUp = () => {
      document.body.style.cursor = "default";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const estNotional = parseFloat(amount || "0") * currentPrice;
  const estMargin = estNotional / leverage;
  const estFee = estNotional * 0.0005;
  const isPositiveChange = priceChange >= 0;

  return (
    <div className="flex h-screen flex-col bg-[#0b0e11] text-[#8b92a5] font-sans overflow-hidden">
      {/* HEADER */}
      <header className="flex h-14 items-center justify-between border-b border-[#1f2937] bg-[#181a20] px-4 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2" onClick={() => router.push("/dashboard")} style={{cursor: 'pointer'}}>
            <span className="text-xl font-bold tracking-tight text-white">
              Mini<span className="text-[#FCD535]">Crypto</span>
            </span>
            <span className="bg-[#2b3139] text-[#EAECEF] text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Futures</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#EAECEF]">{symbol}</span>
              <a href="#" className="text-xs underline hover:text-white decoration-dashed underline-offset-4">Bitcoin TetherUS</a>
            </div>

            <div className="flex flex-col">
              <span className={`text-lg font-bold tabular-nums ${isPositiveChange ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                {currentPrice > 0 ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
              </span>
              <span className="text-xs text-gray-500">
                ${currentPrice > 0 ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
              </span>
            </div>

            <div className="hidden flex-col sm:flex">
              <span className="text-[11px]">Thay đổi 24h</span>
              <span className={`text-sm font-medium tabular-nums ${isPositiveChange ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
                {isPositiveChange ? "+" : ""}{priceChange.toFixed(2)}%
              </span>
            </div>
            
            <div className="hidden flex-col md:flex">
              <span className="text-[11px]">Cao nhất 24h</span>
              <span className="text-sm font-medium text-[#EAECEF] tabular-nums">{high24h.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            </div>

            <div className="hidden flex-col md:flex">
              <span className="text-[11px]">Thấp nhất 24h</span>
              <span className="text-sm font-medium text-[#EAECEF] tabular-nums">{low24h.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-2">
            <button 
              onClick={() => setShowBottomPanel(!showBottomPanel)} 
              className={`p-1.5 rounded transition-colors ${showBottomPanel ? "text-[#FCD535] bg-[#2b3139]" : "text-gray-500 hover:text-white hover:bg-[#1f2937]"}`} 
              title="Toggle Bottom Panel"
            >
              {showBottomPanel ? <PanelBottom className="w-4 h-4" /> : <PanelBottomClose className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setShowRightPanel(!showRightPanel)} 
              className={`p-1.5 rounded transition-colors ${showRightPanel ? "text-[#FCD535] bg-[#2b3139]" : "text-gray-500 hover:text-white hover:bg-[#1f2937]"}`} 
              title="Toggle Right Panel"
            >
              {showRightPanel ? <PanelRight className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>

          <Button
            onClick={() => router.push("/dashboard/replay")}
            size="sm"
            variant="ghost"
            className="h-8 text-xs bg-[#2b3139] hover:bg-[#FCD535] hover:text-black text-[#FCD535] font-bold rounded-sm"
          >
            🔄 Replay
          </Button>

          <div className="flex items-center gap-1.5 text-xs">
            {isConnected ? <Wifi className="h-4 w-4 text-[#0ECB81]" /> : <WifiOff className="h-4 w-4 text-[#F6465D]" />}
            <span className={isConnected ? "text-[#0ECB81]" : "text-[#F6465D]"}>
              {isConnected ? "Đã kết nối" : "Mất kết nối"}
            </span>
          </div>
          {!isLoggedIn ? (
            <Button onClick={() => router.push("/login")} size="sm" className="bg-[#FCD535] text-black hover:bg-[#FCD535]/90 font-semibold h-8 rounded-sm ml-2">
              Đăng nhập
            </Button>
          ) : (
            <Button onClick={() => { localStorage.clear(); window.location.reload(); }} size="sm" variant="ghost" className="h-8 hover:bg-[#2b3139] hover:text-white rounded-sm ml-2">
              Đăng xuất
            </Button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT COLUMN: Chart + Positions */}
        <div className="flex flex-col" style={{ width: showRightPanel ? `calc(100% - ${rightPanelWidth}px)` : '100%' }}>
          
          {/* CHART */}
          <div className="flex flex-col bg-[#131722]" style={{ height: showBottomPanel ? `calc(100% - ${bottomPanelHeight}px)` : '100%' }}>
            <div className="flex h-10 items-center justify-between border-b border-[#1f2937] px-2 bg-[#181a20] relative shrink-0">
              <div className="flex h-full items-center">
                {favoriteTimeframes.map((tf) => (
                  <button 
                    key={tf} 
                    onClick={() => setActiveTimeframe(tf)}
                    className={`h-full px-3 text-xs font-medium transition-colors ${activeTimeframe === tf ? "text-[#FCD535] border-b-2 border-[#FCD535]" : "text-[#8b92a5] hover:text-white"}`}
                  >
                    {tf}
                  </button>
                ))}
                
                <div className="relative">
                  <button 
                    onClick={() => setShowTfSettings(!showTfSettings)}
                    className="h-full px-3 text-xs font-medium text-[#8b92a5] hover:text-white flex items-center gap-1 border-l border-[#1f2937] ml-2"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  {showTfSettings && (
                    <div className="absolute top-10 left-0 w-64 bg-[#1f2937] border border-[#374151] rounded-md shadow-xl p-3 z-50">
                      <h4 className="text-white text-xs font-semibold mb-2">Chọn khung thời gian yêu thích</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {ALL_TIMEFRAMES.map(tf => (
                          <button
                            key={tf.interval}
                            onClick={() => toggleFavoriteTf(tf.interval)}
                            className={`text-xs py-1 rounded ${favoriteTimeframes.includes(tf.interval) ? "bg-[#FCD535] text-black font-bold" : "bg-[#374151] text-gray-300 hover:text-white"}`}
                          >
                            {tf.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 relative w-full h-full min-h-0" {...handlers}>
              <BtcCandlestickChart ref={chartRef} historicalData={historicalData} realtimeCandle={realtimeCandle} />
            </div>
          </div>

          {/* HORIZONTAL RESIZER */}
          {showBottomPanel && (
            <div 
              onMouseDown={startBottomDrag}
              className="h-1 bg-[#1f2937] hover:bg-[#FCD535] cursor-row-resize flex-shrink-0 transition-colors z-20"
            />
          )}

          {/* POSITIONS & HISTORY */}
          {showBottomPanel && (
            <div className="flex flex-col bg-[#181a20] overflow-hidden" style={{ height: bottomPanelHeight }}>
              <div className="flex h-10 items-center border-b border-[#1f2937] px-4 shrink-0">
                <button 
                  onClick={() => setActiveTab("positions")}
                  className={`h-full px-4 text-sm font-medium ${activeTab === "positions" ? "text-[#FCD535] border-b-2 border-[#FCD535]" : "text-[#8b92a5] hover:text-white"}`}
                >
                  Vị thế ({positions.length})
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  className={`h-full px-4 text-sm font-medium ${activeTab === "history" ? "text-[#FCD535] border-b-2 border-[#FCD535]" : "text-[#8b92a5] hover:text-white"}`}
                >
                  Lịch sử giao dịch
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-0 min-h-0">
                {activeTab === "positions" && (
                  <table className="w-full text-xs text-left">
                    <thead className="text-[#8b92a5] sticky top-0 bg-[#181a20] z-10">
                      <tr>
                        <th className="font-normal py-2 px-4">Cặp giao dịch</th>
                        <th className="font-normal py-2 px-4">Kích thước</th>
                        <th className="font-normal py-2 px-4">Giá vào lệnh</th>
                        <th className="font-normal py-2 px-4">Giá đánh dấu</th>
                        <th className="font-normal py-2 px-4">Ký quỹ</th>
                        <th className="font-normal py-2 px-4">PNL chưa thực hiện</th>
                        <th className="font-normal py-2 px-4">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">Không có vị thế mở</td></tr>
                      ) : positions.map(p => {
                        const feeRate = 0;
                        const estEntryFee = p.entryPrice * p.quantity * feeRate;
                        const estExitFee = currentPrice * p.quantity * feeRate;
                        const grossPnl = p.side === "Long" 
                          ? (currentPrice - p.entryPrice) * p.quantity 
                          : (p.entryPrice - currentPrice) * p.quantity;
                        const netPnl = grossPnl - estEntryFee - estExitFee;
                        const roi = p.margin > 0 ? (netPnl / p.margin) * 100 : 0;
                        const pnlColor = netPnl >= 0 ? "text-[#0ECB81]" : "text-[#F6465D]";
                        
                        return (
                          <tr key={p.id} className="border-t border-[#1f2937] hover:bg-[#2b3139]">
                            <td className="py-2 px-4">
                              <div className="font-bold text-white">
                                <span className={p.side === "Long" ? "text-[#0ECB81]" : "text-[#F6465D]"}>{p.side}</span> {p.leverage}x
                              </div>
                            </td>
                            <td className="py-2 px-4 text-white">{p.quantity}</td>
                            <td className="py-2 px-4 text-white">{p.entryPrice.toLocaleString("en-US", {minimumFractionDigits: 2})}</td>
                            <td className="py-2 px-4 text-white">{currentPrice.toLocaleString("en-US", {minimumFractionDigits: 2})}</td>
                            <td className="py-2 px-4 text-white">{p.margin.toLocaleString("en-US", {minimumFractionDigits: 2})}</td>
                            <td className={`py-2 px-4 ${pnlColor} font-medium`}>
                              {netPnl >= 0 ? "+" : ""}{netPnl.toFixed(2)} USDT ({roi.toFixed(2)}%)
                            </td>
                            <td className="py-2 px-4">
                              <Button onClick={() => handleClosePosition(p.id)} size="sm" variant="ghost" className="h-6 text-xs bg-[#2b3139] hover:bg-white hover:text-black">
                                Đóng
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {activeTab === "history" && (
                  <table className="w-full text-xs text-left">
                    <thead className="text-[#8b92a5] sticky top-0 bg-[#181a20] z-10">
                      <tr>
                        <th className="font-normal py-2 px-4">Thời gian</th>
                        <th className="font-normal py-2 px-4">Vị thế</th>
                        <th className="font-normal py-2 px-4">Kích thước</th>
                        <th className="font-normal py-2 px-4">Vào lệnh</th>
                        <th className="font-normal py-2 px-4">Đóng lệnh</th>
                        <th className="font-normal py-2 px-4">Lợi nhuận ròng</th>
                        <th className="font-normal py-2 px-4">Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8 text-gray-500">Không có lịch sử giao dịch</td></tr>
                      ) : trades.map(t => {
                        const isProfit = t.netPnl >= 0;
                        return (
                          <tr key={t.id} className="border-t border-[#1f2937] hover:bg-[#2b3139]">
                            <td className="py-2 px-4 text-white">{new Date(t.closedAt).toLocaleString()}</td>
                            <td className={`py-2 px-4 ${t.side === "Long" ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{t.side}</td>
                            <td className="py-2 px-4 text-white">{t.quantity}</td>
                            <td className="py-2 px-4 text-white">{t.entryPrice.toLocaleString()}</td>
                            <td className="py-2 px-4 text-white">{t.exitPrice.toLocaleString()}</td>
                            <td className={`py-2 px-4 ${isProfit ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>{isProfit ? "+" : ""}{t.netPnl.toFixed(2)} USDT</td>
                            <td className="py-2 px-4 text-white">{t.closeReason === "Manual" ? "Thủ công" : t.closeReason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* VERTICAL RESIZER */}
        {showRightPanel && (
          <div 
            onMouseDown={startRightDrag}
            className="w-1 bg-[#1f2937] hover:bg-[#FCD535] cursor-col-resize flex-shrink-0 transition-colors z-20"
          />
        )}

        {/* RIGHT COLUMN: Order Panel */}
        {showRightPanel && (
          <div className="bg-[#181a20] flex flex-col h-full overflow-y-auto shrink-0" style={{ width: rightPanelWidth }}>
            <div className="p-4 border-b border-[#1f2937]">
              <h3 className="text-white font-semibold text-sm mb-3">Ví Futures</h3>
              <div className="bg-[#1f2937]/50 rounded p-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8b92a5]">Khả dụng</span>
                  <span className="text-white font-bold">${(usdtBalance?.available || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8b92a5]">Ký quỹ</span>
                  <span className="text-white font-bold">${(usdtBalance?.usedMargin || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="p-4 flex-1">
              <div className="flex gap-1 mb-4 bg-[#1f2937] rounded-lg p-1">
                <button
                  onClick={() => setActiveSide("Long")}
                  className={`flex-1 font-bold py-2 rounded text-sm transition-all ${
                    activeSide === "Long" ? "bg-[#0ECB81] text-white shadow-lg" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Mở Long
                </button>
                <button
                  onClick={() => setActiveSide("Short")}
                  className={`flex-1 font-bold py-2 rounded text-sm transition-all ${
                    activeSide === "Short" ? "bg-[#F6465D] text-white shadow-lg" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Mở Short
                </button>
              </div>

              <div className="space-y-4">
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
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>1x</span><span>50x</span><span>100x</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Giá vào lệnh (USDT)</span></div>
                  <Input disabled placeholder="Thị trường" className="bg-[#1f2937] border-none text-white h-10" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Kích thước ({baseAsset})</span>
                  </div>
                  <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-[#1f2937] border-none text-white h-10" />
                  
                  {/* Size suggestions */}
                  <div className="pt-2">
                    <div className="flex justify-between gap-1 mb-1">
                      <button onClick={() => applyPercentSize(0.25)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">25%</button>
                      <button onClick={() => applyPercentSize(0.50)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">50%</button>
                      <button onClick={() => applyPercentSize(0.75)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">75%</button>
                      <button onClick={() => applyPercentSize(0.99)} className="flex-1 bg-[#2b3139] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-300">Max</button>
                    </div>
                    <div className="flex justify-between gap-1">
                      <button onClick={() => setAmount("0.01")} className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-400 border border-[#374151]">0.01</button>
                      <button onClick={() => setAmount("0.1")} className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-400 border border-[#374151]">0.1</button>
                      <button onClick={() => setAmount("0.5")} className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-400 border border-[#374151]">0.5</button>
                      <button onClick={() => setAmount("1.0")} className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-[10px] py-1 rounded text-gray-400 border border-[#374151]">1.0</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Chốt lời (TP) USDT</span></div>
                  <Input type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="Không đặt" className="bg-[#1f2937] border-none text-white h-10" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span>Cắt lỗ (SL) USDT</span></div>
                  <Input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="Không đặt" className="bg-[#1f2937] border-none text-white h-10" />
                </div>

                {parseFloat(amount) > 0 && currentPrice > 0 && (
                  <div className="bg-[#1f2937] rounded p-3 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-400">Quy mô vị thế</span><span className="text-white">${estNotional.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Margin yêu cầu</span><span className="text-[#FCD535]">${estMargin.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Phí giao dịch</span><span className="text-gray-300">${estFee.toFixed(2)}</span></div>
                  </div>
                )}

                <Button 
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
                  className={`w-full h-12 font-bold text-white text-base mt-2 transition-all ${
                    activeSide === "Long" ? "bg-[#0ECB81] hover:bg-[#0b9c63]" : "bg-[#F6465D] hover:bg-[#c9384b]"
                  }`}
                >
                  {isSubmitting ? "Đang xử lý..." : `Mở ${activeSide}`}
                </Button>

                {!isLoggedIn && <p className="text-xs text-center text-[#FCD535] mt-2">Vui lòng đăng nhập</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TradingTerminal() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#0D1117] text-white">Loading Terminal...</div>}>
      <TradingTerminalContent />
    </Suspense>
  );
}
