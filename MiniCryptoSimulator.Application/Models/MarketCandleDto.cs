namespace MiniCryptoSimulator.Application.Models;

/// <summary>
/// DTO cho dữ liệu nến (candlestick) gửi từ Backend xuống Frontend qua SignalR.
/// Frontend chỉ phụ thuộc vào DTO này, không phụ thuộc trực tiếp vào Binance.
/// </summary>
public sealed record MarketCandleDto(
    string Symbol,
    string Interval,
    long Time,
    decimal Open,
    decimal High,
    decimal Low,
    decimal Close,
    bool IsClosed
);
