using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Domain.Entities;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Symbol { get; set; } = string.Empty; 
    public PositionSide Side { get; set; }
    public OrderType Type { get; set; } = OrderType.Market;
    public decimal Quantity { get; set; }
    public decimal Price { get; set; } // for Limit
    public int Leverage { get; set; }
    public decimal? StopLossPrice { get; set; }
    public decimal? TakeProfitPrice { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExecutedAt { get; set; }
}