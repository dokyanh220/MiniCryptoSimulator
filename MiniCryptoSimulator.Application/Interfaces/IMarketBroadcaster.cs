using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.Application.Interfaces;

public interface IMarketBroadcaster
{
    Task BroadcastTickerAsync(TickerData ticker);
    Task BroadcastCandleAsync(MarketCandleDto candle);
}