"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Bitcoin, RefreshCcw, Maximize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { getTicker, getKlines } from "@/lib/api/market";

interface MarketCoin {
  symbol: string;
  name: string;
  icon: any;
  iconColor: string;
}

const COINS: MarketCoin[] = [
  { symbol: "BTCUSDT", name: "Bitcoin", icon: Bitcoin, iconColor: "text-[#F7931A]" },
  { symbol: "ETHUSDT", name: "Đồng Ethereum", icon: Bitcoin, iconColor: "text-[#627EEA]" },
  { symbol: "BNBUSDT", name: "Đồng Binance", icon: Bitcoin, iconColor: "text-[#F3BA2F]" },
];

const TIMEFRAMES = [
  { label: "1Ngày", interval: "15m", limit: 96 },
  { label: "1Tháng", interval: "4h", limit: 180 },
  { label: "3Tháng", interval: "1d", limit: 90 },
  { label: "1Năm", interval: "1d", limit: 365 },
  { label: "Tất cả", interval: "1w", limit: 300 },
];

export default function MarketsPage() {
  const [selectedCoin, setSelectedCoin] = useState("BTCUSDT");
  const [activeTimeframe, setActiveTimeframe] = useState(TIMEFRAMES[1]); // Default 1 Tháng
  const [tickers, setTickers] = useState<Record<string, any>>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  // Fetch real-time ticker data
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const promises = COINS.map(c => getTicker(c.symbol));
        const results = await Promise.allSettled(promises);
        
        const newTickers: Record<string, any> = {};
        results.forEach((res) => {
          if (res.status === "fulfilled" && res.value) {
            newTickers[res.value.symbol] = res.value;
          }
        });
        
        setTickers(prev => ({ ...prev, ...newTickers }));
      } catch (e) {
        console.error("Lỗi lấy dữ liệu giá:", e);
      }
    };
    
    fetchTickers();
    const interval = setInterval(fetchTickers, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Kline (Chart) data when coin or timeframe changes
  useEffect(() => {
    const fetchKlinesData = async () => {
      setLoadingChart(true);
      try {
        const data = await getKlines(selectedCoin, activeTimeframe.interval, activeTimeframe.limit);
        
        if (Array.isArray(data)) {
          const formatted = data.map((d: any) => {
            const date = new Date(d.openTime);
            return {
              time: activeTimeframe.label === "1Ngày" 
                ? date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
              price: d.close,
              rawDate: d.openTime,
            }
          });
          setChartData(formatted);
        }
      } catch (e) {
        console.error("Lỗi lấy dữ liệu chart:", e);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchKlinesData();
  }, [selectedCoin, activeTimeframe]);

  const activeTicker = tickers[selectedCoin] || { lastPrice: 0, priceChangePercent: 0 };
  const isUp = activeTicker.priceChangePercent >= 0;
  const strokeColor = isUp ? "#0ECB81" : "#F6465D";
  const fillColor = isUp ? "url(#colorUp)" : "url(#colorDown)";

  // Component Tooltip tùy chỉnh
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const date = new Date(data.rawDate);
      const price = data.price.toLocaleString("en-US", { minimumFractionDigits: 2 });
      const dayStr = date.getDate().toString().padStart(2, '0');
      const monthStr = (date.getMonth() + 1).toString();
      const yearStr = date.getFullYear().toString().slice(-2);
      
      const dateStr = `${dayStr} Tháng ${monthStr} '${yearStr}`;
      const timeStr = date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) + " UTC+7";

      return (
        <div className="bg-[#2A2E39] border border-[#2A2E39] text-white p-3 rounded shadow-xl flex flex-col items-center justify-center min-w-[140px]">
          <div className="text-xl font-bold mb-1">{price}</div>
          <div className="text-sm text-gray-400 font-medium">{dateStr}</div>
          <div className="text-sm text-gray-400 font-medium">{timeStr}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          Tiền điện tử
          <span className="text-muted-foreground text-xl font-normal">›</span>
        </h1>

        {/* ═══════ TABS / PILLS ═══════ */}
        <div className="flex flex-wrap gap-4 mb-8">
          {COINS.map(coin => {
            const t = tickers[coin.symbol];
            const price = t ? t.lastPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "---";
            const change = t ? t.priceChangePercent.toFixed(2) : "0.00";
            const isCoinUp = t && t.priceChangePercent >= 0;

            return (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin.symbol)}
                className={`flex items-center gap-3 px-5 py-3 rounded-full transition-all duration-200 border cursor-pointer
                  ${selectedCoin === coin.symbol 
                    ? "bg-card border-border shadow-md" 
                    : "bg-transparent border-transparent hover:bg-muted"}`}
              >
                <div className={`flex items-center justify-center h-8 w-8 rounded-full bg-background border ${coin.iconColor}`}>
                  <coin.icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-muted-foreground">{coin.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tabular-nums">{price} <span className="text-xs font-normal text-muted-foreground">USDT</span></span>
                    <span className={`text-sm font-medium tabular-nums ${isCoinUp ? 'text-success' : 'text-danger'}`}>
                      {isCoinUp ? '+' : ''}{change}%
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ═══════ CHART AREA ═══════ */}
        <div className="bg-card border border-border rounded-lg p-6 relative">
          
          {/* Active Coin Header Info in Chart */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tabular-nums">
              {activeTicker.lastPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              <span className="text-base font-normal text-muted-foreground ml-2">USDT</span>
            </h2>
            <p className={`text-lg font-medium tabular-nums ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? '+' : ''}{activeTicker.priceChangePercent.toFixed(2)}%
            </p>
          </div>

          <div className="h-[500px] w-full">
            {loadingChart ? (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <RefreshCcw className="h-6 w-6 animate-spin mr-2" /> Đang tải biểu đồ...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ECB81" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ECB81" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F6465D" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F6465D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    orientation="right" 
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    tickFormatter={(value) => value.toLocaleString()}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={strokeColor} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill={fillColor} 
                    isAnimationActive={false} // Disable animation for smoother rapid updates if needed
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Timeframe Filters and Actions */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-2">
              {TIMEFRAMES.map((tf) => (
                <Button 
                  key={tf.label} 
                  variant={activeTimeframe.label === tf.label ? "secondary" : "ghost"}
                  size="sm"
                  className="text-muted-foreground cursor-pointer"
                  onClick={() => setActiveTimeframe(tf)}
                >
                  {tf.label}
                </Button>
              ))}
            </div>

            <Link href={`/dashboard/trade?symbol=${selectedCoin}`}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2 cursor-pointer">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Giao dịch ngay</span>
              </Button>
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
