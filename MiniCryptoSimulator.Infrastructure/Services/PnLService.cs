using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Infrastructure.Services;

public class PnLService : IPnLService
{
    public decimal CalculateNotional(decimal quantity, decimal price)
    {
        return quantity * price;
    }

    public decimal CalculateMargin(decimal notional, int leverage)
    {
        if (leverage <= 0) throw new ArgumentException("Leverage must be > 0");
        return notional / leverage;
    }

    public decimal CalculateGrossPnl(PositionSide side, decimal entryPrice, decimal currentPrice, decimal quantity)
    {
        if (side == PositionSide.Long)
        {
            return (currentPrice - entryPrice) * quantity;
        }
        else // Short
        {
            return (entryPrice - currentPrice) * quantity;
        }
    }

    public decimal CalculateFee(decimal notional, decimal feeRate = 0m)
    {
        return notional * feeRate;
    }

    public decimal CalculateNetPnl(decimal grossPnl, decimal entryFee, decimal exitFee)
    {
        return grossPnl - entryFee - exitFee;
    }

    public decimal CalculateROI(decimal netPnl, decimal margin)
    {
        if (margin == 0) return 0;
        return (netPnl / margin) * 100m;
    }
}
