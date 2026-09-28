using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.Application.Interfaces;

public interface ITradingService
{
    Task<OrderResult> PlaceMarketOrderAsync(Guid userId, string symbol, string side, decimal quantity);
}
