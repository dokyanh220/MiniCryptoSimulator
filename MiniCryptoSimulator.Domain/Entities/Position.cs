using System.ComponentModel.DataAnnotations;
using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Domain.Entities;

public class Position
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public PositionSide Side { get; set; }
    public decimal Quantity { get; set; }
    public decimal EntryPrice { get; set; }
    public int Leverage { get; set; }
    public decimal Margin { get; set; }
    public decimal? StopLossPrice { get; set; }
    public decimal? TakeProfitPrice { get; set; }
    public PositionStatus Status { get; set; } = PositionStatus.Open;
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
    
    [Timestamp]
    public uint Version { get; set; } // Concurrency token for PostgreSQL (xmin)
}
