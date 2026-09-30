using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Domain.Entities;

public class Transaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public Guid? ReferenceId { get; set; } // OrderId or PositionId
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
