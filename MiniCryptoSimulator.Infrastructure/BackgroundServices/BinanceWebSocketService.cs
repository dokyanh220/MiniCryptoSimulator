using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.Infrastructure.BackgroundServices;

public class BinanceWebSocketService : BackgroundService
{
    private readonly TradingSettings _settings;
    private readonly ILogger<BinanceWebSocketService> _logger;
    private readonly IMemoryCache _cache;
    private readonly IMarketBroadcaster _broadcaster;
    private readonly IRiskService _riskService;

    public BinanceWebSocketService(
        IOptions<TradingSettings> settings, 
        ILogger<BinanceWebSocketService> logger,
        IMemoryCache cache,
        IMarketBroadcaster broadcaster,
        IRiskService riskService)
    {
        _settings = settings.Value;
        _logger = logger;
        _cache = cache;
        _broadcaster = broadcaster;
        _riskService = riskService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Subscribe to both ticker and kline (candlestick) streams for supported symbols
        var streams = new List<string>();
        var intervals = new[] { "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M" };
        foreach (var symbol in _settings.SupportedSymbols)
        {
            var s = symbol.ToLower();
            streams.Add($"{s}@ticker");
            foreach (var interval in intervals)
            {
                streams.Add($"{s}@kline_{interval}");
            }
        }
        
        var streamsParam = string.Join("/", streams);
        var wsUrl = $"wss://stream.binance.com:9443/ws/{streamsParam}";

        // Connection loop with exponential backoff
        int reconnectAttempts = 0;
        
        while (!stoppingToken.IsCancellationRequested)
        {
            using var client = new ClientWebSocket();
            try
            {
                await client.ConnectAsync(new Uri(wsUrl), stoppingToken);
                _logger.LogInformation("Đã kết nối thành công tới Binance WebSocket: {url}", wsUrl);
                reconnectAttempts = 0; // Reset attempts on successful connection

                var buffer = new byte[1024 * 64];

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
                reconnectAttempts++;
                // Max delay is 30 seconds
                int delayMs = Math.Min(30000, 1000 * (int)Math.Pow(2, reconnectAttempts)); 
                _logger.LogError(ex, "Lỗi WebSocket: {message}. Đang thử kết nối lại sau {delay}ms (Lần {attempt})...", ex.Message, delayMs, reconnectAttempts);
                try
                {
                    await Task.Delay(delayMs, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }
        }
    }

    private void ProcessMessage(string message)
    {
        try
        {
            using var doc = JsonDocument.Parse(message);
            var root = doc.RootElement;

            if (root.TryGetProperty("e", out var eventTypeElement))
            {
                var eventType = eventTypeElement.GetString();

                if (eventType == "24hrTicker")
                {
                    ProcessTicker(root);
                }
                else if (eventType == "kline")
                {
                    ProcessKline(root);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing WebSocket message");
        }
    }

    private void ProcessTicker(JsonElement root)
    {
        var symbol = root.GetProperty("s").GetString()!;
        var ticker = new TickerData
        {
            Symbol = symbol,
            LastPrice = ParseDecimalSafe(root, "c"),
            PriceChangePercent = ParseDecimalSafe(root, "P"),
            HighPrice = ParseDecimalSafe(root, "h"),
            LowPrice = ParseDecimalSafe(root, "l"),
            Volume = ParseDecimalSafe(root, "v"),
            UpdatedAt = DateTime.UtcNow
        };

        _cache.Set($"ticker_{ticker.Symbol}", ticker);
        _broadcaster.BroadcastTickerAsync(ticker).GetAwaiter().GetResult();
        
        // Evaluate Risk (SL/TP) in background fire-and-forget
        _ = _riskService.EvaluateRiskAsync(ticker.Symbol, ticker.LastPrice);
        
        // Reduce log noise for ticker
        // _logger.LogInformation("Giá Realtime - {Symbol}: {Price} USDT", ticker.Symbol, ticker.LastPrice);
    }

    private void ProcessKline(JsonElement root)
    {
        var symbol = root.GetProperty("s").GetString()!;
        var k = root.GetProperty("k");
        
        var interval = k.GetProperty("i").GetString()!;
        var time = k.GetProperty("t").GetInt64();
        var open = ParseDecimalSafe(k, "o");
        var high = ParseDecimalSafe(k, "h");
        var low = ParseDecimalSafe(k, "l");
        var close = ParseDecimalSafe(k, "c");
        var isClosed = k.GetProperty("x").GetBoolean();

        var candleDto = new MarketCandleDto(
            Symbol: symbol,
            Interval: interval,
            Time: time,
            Open: open,
            High: high,
            Low: low,
            Close: close,
            IsClosed: isClosed
        );

        _broadcaster.BroadcastCandleAsync(candleDto).GetAwaiter().GetResult();
    }

    private decimal ParseDecimalSafe(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop))
        {
            var strVal = prop.GetString();
            if (decimal.TryParse(strVal, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var val))
            {
                return val;
            }
        }
        return 0m;
    }
}