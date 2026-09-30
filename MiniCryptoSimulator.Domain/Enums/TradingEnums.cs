namespace MiniCryptoSimulator.Domain.Enums;

public enum PositionSide
{
    Long,
    Short
}

public enum PositionStatus
{
    Open,
    Closed,
    Liquidated
}

public enum OrderType
{
    Market,
    Limit
}

public enum OrderStatus
{
    Pending,
    Filled,
    Cancelled,
    Rejected
}

public enum CloseReason
{
    Manual,
    StopLoss,
    TakeProfit,
    Liquidation
}

public enum TransactionType
{
    Deposit,
    Withdraw,
    MarginLocked,
    MarginReleased,
    TradingFee,
    RealizedPnl,
    Liquidation
}
