import { useEffect, useRef, useState, useCallback } from "react";
import { IChartApi, ISeriesApi, IPriceLine, LineStyle } from "lightweight-charts";

export type EditingTarget = "SL" | "TP" | "Entry" | null;

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
    tickSize?: number;
    onSlChange?: (price: number) => void;
    onTpChange?: (price: number) => void;
    onEntryChange?: (price: number) => void;
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
      const slVal = options.slPrice ?? (options.side === "Long" ? basePrice - 200 : basePrice + 200);
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
      const tpVal = options.tpPrice ?? (options.side === "Long" ? basePrice + 200 : basePrice - 200);
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
    const chart = getChart();
    const series = getSeries();
    if (!chart || !series) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    let targetToDrag: EditingTarget = editingTarget;

    const basePrice = options.entryPrice || options.currentPrice;
    const actualSl = options.slPrice ?? (editingTarget === "SL" ? (options.side === "Long" ? basePrice - 200 : basePrice + 200) : null);
    const actualTp = options.tpPrice ?? (editingTarget === "TP" ? (options.side === "Long" ? basePrice + 200 : basePrice - 200) : null);

    // Check if clicked near ANY line to auto-select it
    const entryLineY = options.entryPrice !== null ? series.priceToCoordinate(options.entryPrice) : null;
    const slLineY = actualSl !== null ? series.priceToCoordinate(actualSl) : null;
    const tpLineY = actualTp !== null ? series.priceToCoordinate(actualTp) : null;

    if (slLineY !== null && Math.abs(y - slLineY) < 30) {
      targetToDrag = "SL";
      setEditingTarget("SL");
    } else if (tpLineY !== null && Math.abs(y - tpLineY) < 30) {
      targetToDrag = "TP";
      setEditingTarget("TP");
    } else if (entryLineY !== null && Math.abs(y - entryLineY) < 30) {
      // Allow dragging Entry only if onEntryChange is provided (meaning it's a Limit Order being setup)
      if (options.onEntryChange) {
        targetToDrag = "Entry";
        setEditingTarget("Entry");
      }
    }

    if (!targetToDrag) return;
    
    let activePrice = targetToDrag === "Entry" ? options.entryPrice : (targetToDrag === "SL" ? options.slPrice : options.tpPrice);
    
    // If null, it means it's a preview line, calculate its position
    if (activePrice === null) {
      const basePrice = options.entryPrice || options.currentPrice;
      if (targetToDrag === "SL") {
        activePrice = options.side === "Long" ? basePrice - 200 : basePrice + 200;
      } else {
        activePrice = options.side === "Long" ? basePrice + 200 : basePrice - 200;
      }
    }
    
    const lineY = series.priceToCoordinate(activePrice);
    if (lineY === null) return;
    
    if (Math.abs(y - lineY) < 30) { // 30px grab tolerance
      setIsDragging(true);
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      
      // Disable chart scrolling while dragging the line
      chart.applyOptions({ handleScroll: false, handleScale: false });
    }
  }, [editingTarget, options.slPrice, options.tpPrice, options.entryPrice, options.currentPrice, options.side, getChart, getSeries]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const series = getSeries();
    if (!series) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;

    // Handle cursor on hover
    if (!isDragging) {
      const basePrice = options.entryPrice || options.currentPrice;
      const actualSl = options.slPrice ?? (editingTarget === "SL" ? (options.side === "Long" ? basePrice - 200 : basePrice + 200) : null);
      const actualTp = options.tpPrice ?? (editingTarget === "TP" ? (options.side === "Long" ? basePrice + 200 : basePrice - 200) : null);

      const entryLineY = options.entryPrice !== null && options.onEntryChange ? series.priceToCoordinate(options.entryPrice) : null;
      const slLineY = actualSl !== null ? series.priceToCoordinate(actualSl) : null;
      const tpLineY = actualTp !== null ? series.priceToCoordinate(actualTp) : null;
      
      let isNearLine = false;
      if (slLineY !== null && Math.abs(y - slLineY) < 15) isNearLine = true;
      if (tpLineY !== null && Math.abs(y - tpLineY) < 15) isNearLine = true;
      if (entryLineY !== null && Math.abs(y - entryLineY) < 15) isNearLine = true;
      
      e.currentTarget.style.cursor = isNearLine ? "ns-resize" : "crosshair";
      return;
    }

    if (!editingTarget) return;
    
    e.stopPropagation();
    
    const price = series.coordinateToPrice(y);
    if (price === null) return;

    // Snap to tick size
    const tickSize = options.tickSize || 0.1;
    const snappedPrice = Math.round(price / tickSize) * tickSize;

    if (editingTarget === "SL") {
      options.onSlChange?.(snappedPrice);
    } else if (editingTarget === "TP") {
      options.onTpChange?.(snappedPrice);
    } else if (editingTarget === "Entry") {
      options.onEntryChange?.(snappedPrice);
    }
  }, [isDragging, editingTarget, options, getSeries]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
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
      onPointerDownCapture: handlePointerDown,
      onPointerMoveCapture: handlePointerMove,
      onPointerUpCapture: handlePointerUp,
      onPointerCancelCapture: handlePointerUp,
    }
  };
}
