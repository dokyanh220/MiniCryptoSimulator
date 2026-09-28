"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { getKlines, getTicker } from "@/lib/api/market";

export function MiniChartPreview({ symbol = "BTCUSDT" }: { symbol?: string }) {
  const [data, setData] = useState<any[]>([]);
  const [ticker, setTicker] = useState<any>(null);

  useEffect(() => {
    // Lấy giá Ticker hiện tại (để hiển thị con số)
    const fetchTicker = async () => {
      const t = await getTicker(symbol);
      if (t) setTicker(t);
    };
    fetchTicker();
    const tInterval = setInterval(fetchTicker, 3000);

    // Lấy dữ liệu biểu đồ (khung 30 phút, lấy 50 nến gần nhất)
    const fetchChart = async () => {
      const klines = await getKlines(symbol, "30m", 50);
      if (klines.length > 0) {
        setData(klines.map(k => ({ price: k.close })));
      }
    };
    fetchChart();

    return () => clearInterval(tInterval);
  }, [symbol]);

  const isUp = ticker ? ticker.priceChangePercent >= 0 : true;
  const strokeColor = isUp ? "#0ECB81" : "#F6465D";
  const fillColor = isUp ? "url(#miniColorUp)" : "url(#miniColorDown)";
  
  // Fake data if API fails to load quickly
  const chartData = data.length > 0 ? data : Array.from({length: 20}).map((_, i) => ({ price: 60000 + Math.random() * 2000 }));

  return (
    <div className="w-full h-24 relative overflow-hidden flex items-end">
      {/* Thông tin giá thu nhỏ */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center text-xs text-muted-foreground z-10 px-1">
        <span>30 Phút</span>
        {ticker && (
          <div className="flex gap-2">
            <span className="font-bold text-foreground">
              {ticker.lastPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <span className={isUp ? 'text-success' : 'text-danger'}>
              {isUp ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="w-full h-[80%] opacity-80 group-hover:opacity-100 transition-opacity mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="miniColorUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ECB81" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ECB81" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="miniColorDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F6465D" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F6465D" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke={strokeColor} 
              strokeWidth={2}
              fillOpacity={1} 
              fill={fillColor} 
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
