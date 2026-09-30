using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Domain.Entities;

public class Trade
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid PositionId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public PositionSide Side { get; set; }
    public decimal Quantity { get; set; }
    public decimal EntryPrice { get; set; }
    public decimal ExitPrice { get; set; }
    public decimal GrossPnl { get; set; }
    public decimal EntryFee { get; set; }
    public decimal ExitFee { get; set; }
    public decimal NetPnl { get; set; }
    public CloseReason CloseReason { get; set; }
    public DateTime OpenedAt { get; set; }
    public DateTime ClosedAt { get; set; } = DateTime.UtcNow;
}