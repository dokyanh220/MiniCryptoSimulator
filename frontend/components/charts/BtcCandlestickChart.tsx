"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, ColorType } from "lightweight-charts";
import { KlineData } from "@/lib/api/market";

export interface BtcCandlestickChartProps {
  historicalData: KlineData[];
  realtimeCandle?: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    isClosed: boolean;
  } | null;
  className?: string;
  onHover?: (candle: any) => void;
}

export interface ChartApiRef {
  getChart: () => IChartApi | null;
  getSeries: () => ISeriesApi<"Candlestick"> | null;
}

export const BtcCandlestickChart = React.forwardRef<ChartApiRef, BtcCandlestickChartProps>(({
  historicalData,
  realtimeCandle,
  className,
  onHover
}, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  React.useImperativeHandle(ref, () => ({
    getChart: () => chartRef.current,
    getSeries: () => seriesRef.current,
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Khởi tạo Lightweight Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#8b92a5",
      },
      grid: {
        vertLines: { color: "rgba(31, 41, 55, 0.5)" },
        horzLines: { color: "rgba(31, 41, 55, 0.5)" },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        borderColor: "#1f2937",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1f2937",
        autoScale: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ECB81",
      downColor: "#F6465D",
      borderVisible: false,
      wickUpColor: "#0ECB81",
      wickDownColor: "#F6465D",
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Xử lý sự kiện hover (crosshair move)
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point === undefined || !param.seriesData) {
        onHover?.(null);
        return;
      }
      const data = param.seriesData.get(candlestickSeries);
      if (data) {
        onHover?.(data);
      }
    });

    // Handle resize via ResizeObserver to catch flex-box/dragging changes
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const newRect = entries[0].contentRect;
      chart.applyOptions({
        width: newRect.width,
        height: newRect.height,
      });
    });
    
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Map historical data vào chart 
  // Chỉ set 1 lần khi historicalData thay đổi (lúc mới load)
  useEffect(() => {
    if (!seriesRef.current || historicalData.length === 0) return;

    // Deduplicate và sort
    const mappedData = historicalData
      .map((d) => ({
        time: (new Date(d.openTime).getTime() / 1000) as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    seriesRef.current.setData(mappedData);
  }, [historicalData]);

  // Cập nhật realtime candle
  // Sử dụng series.update thay vì push vào array (theo đúng spec Lightweight Charts)
  useEffect(() => {
    if (!seriesRef.current || !realtimeCandle) return;

    seriesRef.current.update({
      time: (realtimeCandle.time / 1000) as Time,
      open: realtimeCandle.open,
      high: realtimeCandle.high,
      low: realtimeCandle.low,
      close: realtimeCandle.close,
    });
  }, [realtimeCandle]);

  return <div ref={chartContainerRef} className={`w-full h-full ${className}`} />;
});
