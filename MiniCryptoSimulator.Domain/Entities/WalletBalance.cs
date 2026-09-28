namespace MiniCryptoSimulator.Domain.Entities;

public class WalletBalance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WalletId { get; set; }
    public string Asset { get; set; } = string.Empty;
    public decimal Available { get; set; }
    public decimal Locked { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Wallet Wallet { get; set; } = null!;
}