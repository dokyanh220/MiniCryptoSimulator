namespace MiniCryptoSimulator.Application.Models;

public class PlaceOrderRequest
{
    public string Symbol { get; set; } = string.Empty; // e.g. BTCUSDT
    public string Side { get; set; } = string.Empty;   // BUY or SELL
    public decimal Quantity { get; set; }              // Amount of base asset
}

public class OrderResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public Guid? OrderId { get; set; }
    public decimal ExecutedPrice { get; set; }
    public decimal ExecutedQuantity { get; set; }
    public decimal Total { get; set; }
    public decimal Fee { get; set; }
}
