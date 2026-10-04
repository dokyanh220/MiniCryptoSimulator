using MiniCryptoSimulator.Application.Models;
using MiniCryptoSimulator.Domain.Entities;
using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Application.Interfaces;

public interface IPnLService
{
    decimal CalculateNotional(decimal quantity, decimal price);
    decimal CalculateMargin(decimal notional, int leverage);
    decimal CalculateGrossPnl(PositionSide side, decimal entryPrice, decimal currentPrice, decimal quantity);
    decimal CalculateFee(decimal notional, decimal feeRate = 0.0005m); // 0.05% fee for MVP
    decimal CalculateNetPnl(decimal grossPnl, decimal entryFee, decimal exitFee);
    decimal CalculateROI(decimal netPnl, decimal margin);
}

public interface IWalletService
{
    Task<WalletBalance?> GetUsdtBalanceAsync(Guid userId);
    Task LockMarginAsync(Guid userId, decimal margin, decimal fee, Guid? referenceId = null);
    Task ReleaseMarginAsync(Guid userId, decimal margin, decimal grossPnl, decimal exitFee, Guid? referenceId = null);
}

public interface IPositionService
{
    Task<OrderResult> OpenPositionAsync(Guid userId, PlaceFuturesOrderRequest request);
    Task<ClosePositionResult> ClosePositionAsync(Guid userId, Guid positionId, CloseReason reason, decimal? overridePrice = null);
    Task<bool> UpdatePositionAsync(Guid userId, Guid positionId, decimal? stopLossPrice, decimal? takeProfitPrice);
    Task<List<Position>> GetOpenPositionsAsync(Guid userId);
    Task<bool> CancelOrderAsync(Guid userId, Guid orderId);
    Task<List<Order>> GetPendingOrdersAsync(Guid userId);
    Task<bool> ExecuteLimitOrderAsync(Guid orderId, decimal executedPrice);
}

public interface IRiskService
{
    Task EvaluateRiskAsync(string symbol, decimal currentPrice);
}
