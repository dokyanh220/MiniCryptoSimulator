using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Application.Models;

public class PlaceFuturesOrderRequest
{
    public string Symbol { get; set; } = string.Empty;
    public PositionSide Side { get; set; }
    public OrderType Type { get; set; } = OrderType.Market;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; } // Only for limit
    public int Leverage { get; set; }
    public decimal? StopLossPrice { get; set; }
    public decimal? TakeProfitPrice { get; set; }
}

public class OrderResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    public Guid? PositionId { get; set; }
    public decimal ExecutedPrice { get; set; }
    public decimal ExecutedQuantity { get; set; }
    public decimal Margin { get; set; }
    public decimal Fee { get; set; }
}

public class ClosePositionRequest
{
    public Guid PositionId { get; set; }
}

public class ClosePositionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public decimal ExitPrice { get; set; }
    public decimal GrossPnl { get; set; }
    public decimal NetPnl { get; set; }
    public decimal ExitFee { get; set; }
}
