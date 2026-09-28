"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { 
  Settings, Maximize, MousePointer2, Crosshair, TrendingUp, 
  PenTool, Type, Search, SlidersHorizontal, Bitcoin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTicker, getKlines } from "@/lib/api/market";

const TIMEFRAMES = [
  { label: "1m", interval: "1m", limit: 60 },
  { label: "15m", interval: "15m", limit: 96 },
  { label: "1H", interval: "1h", limit: 100 },
  { label: "4H", interval: "4h", limit: 120 },
  { label: "1D", interval: "1d", limit: 100 },
];

// Vẽ nến Nhật (Candlestick) thủ công
const CustomCandlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  const isUp = payload.close >= payload.open;
  const color = isUp ? "#0ECB81" : "#F6465D";

  // Tránh chia cho 0 nếu high == low
  const ratio = payload.high !== payload.low ? height / (payload.high - payload.low) : 0;
  
  const openY = y + (payload.high - payload.open) * ratio;
  const closeY = y + (payload.high - payload.close) * ratio;
  
  const candleTop = Math.min(openY, closeY);
  const candleBottom = Math.max(openY, closeY);
  const candleHeight = Math.max(1, candleBottom - candleTop); // Nến mỏng nhất là 1px

  const centerX = x + width / 2;

  return (
    <g>
      {/* Râu nến (Wick) */}
      <line x1={centerX} y1={y} x2={centerX} y2={y + height} stroke={color} strokeWidth={1} />
      {/* Thân nến (Body) */}
      <rect x={x} y={candleTop} width={width} height={candleHeight} fill={color} stroke={color} />
    </g>
  );
};

export default function TradingTerminal() {
  const searchParams = useSearchParams();
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  
  const [ticker, setTicker] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState(TIMEFRAMES[2]); // Default 1H
  
  // Trading Form State
  const [orderType, setOrderType] = useState("Market");
  const [amount, setAmount] = useState("");
  const balance = 100000.00; // Mock balance

  // Fetch Realtime
  useEffect(() => {
    const fetchRealtime = async () => {
      const data = await getTicker(symbol);
      if (data) setTicker(data);
    };
    fetchRealtime();
    const interval = setInterval(fetchRealtime, 2000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Fetch Chart
  useEffect(() => {
    const fetchChart = async () => {
      const data = await getKlines(symbol, activeTimeframe.interval, activeTimeframe.limit);
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => {
          const date = new Date(d.openTime);
          return {
            time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            fullDate: date.toLocaleString('vi-VN'),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            candleBounds: [d.low, d.high] // Dùng để vẽ y và height cho Bar
          };
        });
        setChartData(formatted);
      }
    };
    fetchChart();
  }, [symbol, activeTimeframe]);

  const isUp = ticker ? ticker.priceChangePercent >= 0 : true;
  const currentPrice = ticker ? ticker.lastPrice.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "---";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e222d] border border-[#2A2E39] text-[#8b92a5] p-2 text-xs rounded shadow-xl min-w-[150px]">
          <div className="font-bold text-white mb-2">{data.fullDate}</div>
          <div className="flex justify-between"><span>Mở:</span> <span className="text-white font-medium">{data.open.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span>Cao:</span> <span className="text-white font-medium">{data.high.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span>Thấp:</span> <span className="text-white font-medium">{data.low.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between mt-1 pt-1 border-t border-[#2A2E39]"><span>Đóng:</span> <span className="text-white font-medium">{data.close.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0D1117] text-[#8b92a5] overflow-hidden font-sans">
      
      {/* ═══════ TOP HEADER ═══════ */}
      <div className="h-14 border-b border-[#1f2937] flex items-center justify-between px-4 shrink-0 bg-[#0D1117]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">{symbol}</span>
            <span className={`text-sm font-medium ${isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
              {currentPrice}
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-1 border-l border-[#1f2937] pl-6">
            {TIMEFRAMES.map(tf => (
              <button 
                key={tf.label}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-3 py-1 text-xs rounded transition-colors ${activeTimeframe.label === tf.label ? 'text-white bg-[#1f2937]' : 'hover:text-white'}`}
              >
                {tf.label}
              </button>
            ))}
            <div className="w-[1px] h-4 bg-[#1f2937] mx-2"></div>
            <button className="p-1.5 hover:text-white rounded hover:bg-[#1f2937]"><SlidersHorizontal className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-white rounded hover:bg-[#1f2937]"><Settings className="w-4 h-4" /></button>
            <button className="p-1.5 hover:text-white rounded hover:bg-[#1f2937]"><Maximize className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[#8b92a5]">24h Thay đổi</span>
            <span className={isUp ? 'text-[#0ECB81]' : 'text-[#F6465D]'}>
              {ticker ? `${isUp ? '+' : ''}${ticker.priceChangePercent.toFixed(2)}%` : '---'}
            </span>
          </div>
          <div className="flex flex-col items-end hidden lg:flex">
            <span className="text-[#8b92a5]">24h Cao</span>
            <span className="text-white">{ticker ? ticker.highPrice.toLocaleString() : '---'}</span>
          </div>
          <div className="flex flex-col items-end hidden lg:flex">
            <span className="text-[#8b92a5]">24h Thấp</span>
            <span className="text-white">{ticker ? ticker.lowPrice.toLocaleString() : '---'}</span>
          </div>
        </div>
      </div>

      {/* ═══════ MAIN LAYOUT ═══════ */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT TOOLBAR */}
        <div className="w-12 border-r border-[#1f2937] flex flex-col items-center py-2 gap-2 shrink-0 bg-[#0D1117]">
          <button className="p-2 hover:text-white hover:bg-[#1f2937] rounded text-primary"><Crosshair className="w-5 h-5" /></button>
          <button className="p-2 hover:text-white hover:bg-[#1f2937] rounded"><MousePointer2 className="w-5 h-5" /></button>
          <button className="p-2 hover:text-white hover:bg-[#1f2937] rounded"><TrendingUp className="w-5 h-5" /></button>
          <button className="p-2 hover:text-white hover:bg-[#1f2937] rounded"><PenTool className="w-5 h-5" /></button>
          <button className="p-2 hover:text-white hover:bg-[#1f2937] rounded"><Type className="w-5 h-5" /></button>
          <div className="w-6 h-[1px] bg-[#1f2937] my-2"></div>
          <button className="p-2 hover:text-white hover:bg-[#1f2937] rounded"><Search className="w-5 h-5" /></button>
        </div>

        {/* CHART AREA */}
        <div className="flex-1 flex flex-col relative bg-[#131722]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="time" stroke="#4b5563" tick={{fill: '#8b92a5', fontSize: 11}} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis 
                domain={['auto', 'auto']} 
                orientation="right" 
                stroke="#4b5563" 
                tick={{fill: '#8b92a5', fontSize: 11}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => val.toLocaleString()}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
              />
              
              {/* Cột nến Nhật (Candlestick) */}
              <Bar dataKey="candleBounds" shape={<CustomCandlestick />} isAnimationActive={false} />
              
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ═══════ RIGHT PANEL (ORDER ENTRY) ═══════ */}
        <div className="w-80 border-l border-[#1f2937] flex flex-col bg-[#0D1117] shrink-0">
          
          {/* Balance */}
          <div className="p-4 border-b border-[#1f2937] flex flex-col items-center justify-center py-6">
            <span className="text-xs font-semibold tracking-wider text-gray-400 mb-1">VÍ KHẢ DỤNG</span>
            <span className="text-3xl font-bold text-white">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            <span className="text-sm text-[#0ECB81] mt-1">+ $0.00 (0.00%)</span>
          </div>

          {/* Trade Actions */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex gap-2 mb-4">
              <Button className="flex-1 bg-[#0ECB81] hover:bg-[#0b9c63] text-white font-bold h-12">MUA</Button>
              <Button className="flex-1 bg-[#F6465D] hover:bg-[#c9384b] text-white font-bold h-12">BÁN</Button>
            </div>

            <div className="flex bg-[#1f2937] rounded-md p-1 mb-6">
              {['Market', 'Limit', 'Stop'].map(type => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex-1 text-xs py-1.5 rounded-sm transition-colors ${orderType === type ? 'bg-[#374151] text-white shadow' : 'text-[#8b92a5] hover:text-white'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Giá (USDT)</span>
                </div>
                <div className="relative">
                  <Input 
                    disabled={orderType === "Market"}
                    placeholder={orderType === "Market" ? "Khớp lệnh thị trường" : currentPrice}
                    className="bg-[#1f2937] border-none text-white h-10 pr-12 focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                  {orderType !== "Market" && <span className="absolute right-3 top-2.5 text-xs text-gray-400">USDT</span>}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Số lượng</span>
                  <span>0.00 {symbol.replace('USDT', '')}</span>
                </div>
                <div className="relative">
                  <Input 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-[#1f2937] border-none text-white h-10 pr-12 focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">{symbol.replace('USDT', '')}</span>
                </div>
              </div>

              <div className="flex justify-between gap-1 pt-2">
                {['25%', '50%', '75%', 'Max'].map(pct => (
                  <button key={pct} className="flex-1 bg-[#1f2937] hover:bg-[#374151] text-xs py-1.5 rounded text-gray-300 hover:text-white transition-colors">
                    {pct}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-[#1f2937] pt-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold text-gray-300">VỊ THẾ HIỆN TẠI</span>
                <span className="text-[#0ECB81]">FLAT</span>
              </div>
              <div className="flex justify-between text-xs text-[#8b92a5]">
                <span>Khối lượng</span>
                <span>0.00 {symbol.replace('USDT', '')}</span>
              </div>
              <div className="flex justify-between text-xs text-[#8b92a5] mt-1">
                <span>Lãi/Lỗ chưa chốt</span>
                <span>$0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
