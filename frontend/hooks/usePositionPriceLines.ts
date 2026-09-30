import { useEffect, useRef } from "react";
import { ISeriesApi, IPriceLine, LineStyle } from "lightweight-charts";

export function usePositionPriceLines(
  getSeries: () => ISeriesApi<"Candlestick"> | null,
  positions: any[]
) {
  const linesMap = useRef<Map<string, { entry: IPriceLine; sl: IPriceLine | null; tp: IPriceLine | null }>>(new Map());

  useEffect(() => {
    const series = getSeries();
    if (!series) return;

    // Clear old lines for positions that no longer exist
    const currentPosIds = new Set(positions.map(p => p.id));
    for (const [posId, lines] of linesMap.current.entries()) {
      if (!currentPosIds.has(posId)) {
        series.removePriceLine(lines.entry);
        if (lines.sl) series.removePriceLine(lines.sl);
        if (lines.tp) series.removePriceLine(lines.tp);
        linesMap.current.delete(posId);
      }
    }

    // Update or create lines for current positions
    positions.forEach(pos => {
      let lines = linesMap.current.get(pos.id);
      
      if (!lines) {
        const entry = series.createPriceLine({
          price: pos.entryPrice,
          color: "white",
          
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: `${pos.side === "Long" ? "BUY" : "SELL"}`,
        });
        
        let sl = null;
        if (pos.stopLossPrice) {
          sl = series.createPriceLine({
            price: pos.stopLossPrice,
            color: "#FCD535",
            
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `SL`,
          });
        }

        let tp = null;
        if (pos.takeProfitPrice) {
          tp = series.createPriceLine({
            price: pos.takeProfitPrice,
            color: "#FCD535",
            
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `TP`,
          });
        }

        linesMap.current.set(pos.id, { entry, sl, tp });
      } else {
        // Update existing lines
        lines.entry.applyOptions({ price: pos.entryPrice, title: `${pos.side === "Long" ? "BUY" : "SELL"}` });
        
        if (pos.stopLossPrice) {
          if (!lines.sl) {
            lines.sl = series.createPriceLine({ price: pos.stopLossPrice, color: "#FCD535",  lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `SL` });
          } else {
            lines.sl.applyOptions({ price: pos.stopLossPrice });
          }
        } else if (lines.sl) {
          series.removePriceLine(lines.sl);
          lines.sl = null;
        }

        if (pos.takeProfitPrice) {
          if (!lines.tp) {
            lines.tp = series.createPriceLine({ price: pos.takeProfitPrice, color: "#FCD535",  lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `TP` });
          } else {
            lines.tp.applyOptions({ price: pos.takeProfitPrice });
          }
        } else if (lines.tp) {
          series.removePriceLine(lines.tp);
          lines.tp = null;
        }
      }
    });

  }, [positions, getSeries]);
}
