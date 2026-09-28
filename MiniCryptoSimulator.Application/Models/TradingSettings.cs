namespace MiniCryptoSimulator.Application.Models;

public class TradingSettings
{
    public List<string> SupportedSymbols { get; set; } = new();
    public string DefaultSymbol { get; set; } = "BTCUSDT";
}