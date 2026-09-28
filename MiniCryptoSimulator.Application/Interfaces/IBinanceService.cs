using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.Application.Interfaces;

public interface IBinanceService
{
    Task<List<CandleData>> GetKlinesAsync(string symbol, string interval, int limit = 100);
}