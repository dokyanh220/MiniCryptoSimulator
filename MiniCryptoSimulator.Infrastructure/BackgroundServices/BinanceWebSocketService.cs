using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.Infrastructure.BackgroundServices;

public class BinanceWebSocketService : BackgroundService
{
    private readonly TradingSettings _settings;
    private readonly ILogger<BinanceWebSocketService> _logger;
    private readonly IMemoryCache _cache;

    public BinanceWebSocketService(
        IOptions<TradingSettings> settings, 
        ILogger<BinanceWebSocketService> logger,
        IMemoryCache cache)
    {
        _settings = settings.Value;
        _logger = logger;
        _cache = cache;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var streams = string.Join("/", _settings.SupportedSymbols.Select(s => $"{s.ToLower()}@ticker"));
        var wsUrl = $"wss://stream.binance.com:9443/ws/{streams}";

        while (!stoppingToken.IsCancellationRequested)
        {
            using var client = new ClientWebSocket();
            try
            {
                await client.ConnectAsync(new Uri(wsUrl), stoppingToken);
                _logger.LogInformation("Đã kết nối thành công tới Binance WebSocket: {url}", wsUrl);

                var buffer = new byte[1024 * 4];

                while (client.State == WebSocketState.Open && !stoppingToken.IsCancellationRequested)
                {
                    var result = await client.ReceiveAsync(new ArraySegment<byte>(buffer), stoppingToken);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await client.CloseAsync(WebSocketCloseStatus.NormalClosure, string.Empty, stoppingToken);
                    }
                    else
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        ProcessMessage(message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Lỗi WebSocket: {message}. Đang thử kết nối lại sau 5s...", ex.Message);
                await Task.Delay(5000, stoppingToken);
            }
        }
    }

    private void ProcessMessage(string message)
    {
        using var doc = JsonDocument.Parse(message);
        var root = doc.RootElement;

        if (root.TryGetProperty("s", out var symbolElement))
        {
            var ticker = new TickerData
            {
                Symbol = symbolElement.GetString()!,
                LastPrice = decimal.Parse(root.GetProperty("c").GetString()!),
                PriceChangePercent = decimal.Parse(root.GetProperty("P").GetString()!),
                HighPrice = decimal.Parse(root.GetProperty("h").GetString()!),
                LowPrice = decimal.Parse(root.GetProperty("l").GetString()!),
                Volume = decimal.Parse(root.GetProperty("v").GetString()!),
                UpdatedAt = DateTime.UtcNow
            };

            // TODO: đẩy cái ticker này vào MemoryCache và gửi xuống Frontend qua SignalR
            // LƯU VÀO RAM VỚI TÊN CHÌA KHÓA LÀ "ticker_BTCUSDT"
            _cache.Set($"ticker_{ticker.Symbol}", ticker);
            
            _logger.LogInformation("Giá Realtime - {Symbol}: {Price} USDT ({Change}%)", 
                ticker.Symbol, ticker.LastPrice.ToString("N2"), ticker.PriceChangePercent.ToString("N2"));
        }
    }
}