namespace MiniCryptoSimulator.Domain.Entities;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Symbol { get; set; } = string.Empty; 
    public string Side { get; set; } = string.Empty;
    public string Type { get; set; } = "MARKET";
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}