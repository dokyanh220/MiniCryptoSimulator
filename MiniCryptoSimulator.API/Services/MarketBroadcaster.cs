using Microsoft.AspNetCore.SignalR;
using MiniCryptoSimulator.API.Hubs;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.API.Services;

public class MarketBroadcaster : IMarketBroadcaster
{
    private readonly IHubContext<MarketHub> _hubContext;

    public MarketBroadcaster(IHubContext<MarketHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task BroadcastTickerAsync(TickerData ticker)
    {
        await _hubContext.Clients.All.SendAsync("TickerUpdated", ticker);
    }

    public async Task BroadcastCandleAsync(MarketCandleDto candle)
    {
        await _hubContext.Clients.All.SendAsync("CandleUpdated", candle);
    }
}