import { useEffect, useRef, useState, useCallback } from "react";
import { IChartApi, ISeriesApi, IPriceLine, LineStyle } from "lightweight-charts";

export type EditingTarget = "SL" | "TP" | null;

interface PriceLineConfig {
  price: number;
  color: string;
  title: string;
  style: LineStyle;
  interactive?: boolean;
}

export function useOrderPriceLines(
  getChart: () => IChartApi | null,
  getSeries: () => ISeriesApi<"Candlestick"> | null,
  options: {
    entryPrice: number | null;
    slPrice: number | null;
    tpPrice: number | null;
    currentPrice: number;
    side: "Long" | "Short" | null;
    onSlChange?: (price: number) => void;
    onTpChange?: (price: number) => void;
  }
) {
  const linesRef = useRef<{
    entry: IPriceLine | null;
    sl: IPriceLine | null;
    tp: IPriceLine | null;
  }>({ entry: null, sl: null, tp: null });

  const [editingTarget, setEditingTarget] = useState<EditingTarget>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartPrice = useRef<number>(0);

  // Sync lines when prices change (from outside or inside)
  useEffect(() => {
    const series = getSeries();
    if (!series) return;

    // Entry Line
    if (options.entryPrice !== null) {
      if (!linesRef.current.entry) {
        linesRef.current.entry = series.createPriceLine({
          price: options.entryPrice,
          color: "white",
          
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `ENTRY`,
        });
      } else {
        linesRef.current.entry.applyOptions({ price: options.entryPrice });
      }
    } else {
      if (linesRef.current.entry) {
        series.removePriceLine(linesRef.current.entry);
        linesRef.current.entry = null;
      }
    }

    // SL Line
    if (options.slPrice !== null || editingTarget === "SL") {
      const basePrice = options.entryPrice || options.currentPrice;
      const slVal = options.slPrice ?? (basePrice * (options.side === "Long" ? 0.99 : 1.01));
      const isInvalid = options.entryPrice && (
        (options.side === "Long" && slVal >= options.entryPrice) ||
        (options.side === "Short" && slVal <= options.entryPrice)
      );
      
      const slOptions = {
        price: slVal,
        color: isInvalid && editingTarget === "SL" ? "red" : "#FCD535",
        
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL`,
      };

      if (!linesRef.current.sl) {
        linesRef.current.sl = series.createPriceLine(slOptions);
      } else {
        linesRef.current.sl.applyOptions(slOptions);
      }
    } else {
      if (linesRef.current.sl) {
        series.removePriceLine(linesRef.current.sl);
        linesRef.current.sl = null;
      }
    }

    // TP Line
    if (options.tpPrice !== null || editingTarget === "TP") {
      const basePrice = options.entryPrice || options.currentPrice;
      const tpVal = options.tpPrice ?? (basePrice * (options.side === "Long" ? 1.01 : 0.99));
      const isInvalid = options.entryPrice && (
        (options.side === "Long" && tpVal <= options.entryPrice) ||
        (options.side === "Short" && tpVal >= options.entryPrice)
      );

      const tpOptions = {
        price: tpVal,
        color: isInvalid && editingTarget === "TP" ? "red" : "#FCD535",
        
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP`,
      };

      if (!linesRef.current.tp) {
        linesRef.current.tp = series.createPriceLine(tpOptions);
      } else {
        linesRef.current.tp.applyOptions(tpOptions);
      }
    } else {
      if (linesRef.current.tp) {
        series.removePriceLine(linesRef.current.tp);
        linesRef.current.tp = null;
      }
    }

  }, [options.entryPrice, options.slPrice, options.tpPrice, editingTarget, options.side]);

  // Handle Dragging Logic
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!editingTarget) return; // Only allow drag if we are in editing mode
    const chart = getChart();
    const series = getSeries();
    if (!chart || !series) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // Check if clicked near the active line
    const activePrice = editingTarget === "SL" ? options.slPrice : options.tpPrice;
    if (activePrice === null) return;
    
    const lineY = series.priceToCoordinate(activePrice);
    if (lineY === null) return;
    
    if (Math.abs(y - lineY) < 15) { // 15px grab tolerance
      setIsDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      
      // Disable chart scrolling while dragging the line
      chart.applyOptions({ handleScroll: false, handleScale: false });
    }
  }, [editingTarget, options.slPrice, options.tpPrice, getChart, getSeries]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !editingTarget) return;
    const series = getSeries();
    if (!series) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    const price = series.coordinateToPrice(y);
    if (price === null) return;

    // Snap to tick size (e.g. 0.1)
    const tickSize = 0.1;
    const snappedPrice = Math.round(price / tickSize) * tickSize;

    if (editingTarget === "SL") {
      options.onSlChange?.(snappedPrice);
    } else if (editingTarget === "TP") {
      options.onTpChange?.(snappedPrice);
    }
  }, [isDragging, editingTarget, options, getSeries]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const chart = getChart();
    if (chart) {
      // Re-enable chart scrolling
      chart.applyOptions({ handleScroll: true, handleScale: true });
    }
  }, [isDragging, getChart]);

  return {
    editingTarget,
    setEditingTarget,
    isDragging,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    }
  };
}
