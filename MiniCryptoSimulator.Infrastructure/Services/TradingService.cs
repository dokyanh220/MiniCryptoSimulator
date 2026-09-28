using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;
using MiniCryptoSimulator.Domain.Entities;
using MiniCryptoSimulator.Infrastructure.Data;

namespace MiniCryptoSimulator.Infrastructure.Services;

public class TradingService : ITradingService
{
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TradingService> _logger;

    public TradingService(AppDbContext context, IMemoryCache cache, ILogger<TradingService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<OrderResult> PlaceMarketOrderAsync(Guid userId, string symbol, string side, decimal quantity)
    {
        side = side.ToUpper();
        if (side != "BUY" && side != "SELL")
            return new OrderResult { Success = false, Message = "Invalid side. Must be BUY or SELL." };
        if (quantity <= 0)
            return new OrderResult { Success = false, Message = "Quantity must be greater than 0." };

        // Parse assets from symbol (e.g., BTCUSDT -> Base: BTC, Quote: USDT)
        // Simplified approach: assume Quote is always USDT, Base is the rest
        if (!symbol.EndsWith("USDT"))
            return new OrderResult { Success = false, Message = "Only USDT pairs are supported." };
        
        string baseAsset = symbol.Substring(0, symbol.Length - 4);
        string quoteAsset = "USDT";

        // 1. Lấy giá hiện tại từ cache
        if (!_cache.TryGetValue($"ticker_{symbol}", out TickerData? ticker) || ticker == null)
            return new OrderResult { Success = false, Message = "Current price not available. Try again later." };

        decimal currentPrice = ticker.LastPrice;
        decimal total = quantity * currentPrice;
        decimal feeRate = 0.001m; // 0.1%

        // 2. Lấy ví của user
        var wallet = await _context.Wallets
            .Include(w => w.Balances)
            .FirstOrDefaultAsync(w => w.UserId == userId);

        if (wallet == null)
            return new OrderResult { Success = false, Message = "Wallet not found." };

        var baseBalance = wallet.Balances.FirstOrDefault(b => b.Asset == baseAsset);
        if (baseBalance == null)
        {
            baseBalance = new WalletBalance { WalletId = wallet.Id, Asset = baseAsset, Available = 0, Locked = 0 };
            _context.WalletBalances.Add(baseBalance);
        }

        var quoteBalance = wallet.Balances.FirstOrDefault(b => b.Asset == quoteAsset);
        if (quoteBalance == null)
        {
            quoteBalance = new WalletBalance { WalletId = wallet.Id, Asset = quoteAsset, Available = 0, Locked = 0 };
            _context.WalletBalances.Add(quoteBalance);
        }

        // 3. Xử lý Logic & Transaction
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            decimal fee = 0;
            if (side == "BUY")
            {
                if (quoteBalance.Available < total)
                    return new OrderResult { Success = false, Message = $"Insufficient {quoteAsset} balance." };

                fee = quantity * feeRate;
                decimal quantityAfterFee = quantity - fee;

                quoteBalance.Available -= total;
                baseBalance.Available += quantityAfterFee;
            }
            else // SELL
            {
                if (baseBalance.Available < quantity)
                    return new OrderResult { Success = false, Message = $"Insufficient {baseAsset} balance." };

                fee = total * feeRate;
                decimal totalAfterFee = total - fee;

                baseBalance.Available -= quantity;
                quoteBalance.Available += totalAfterFee;
            }

            // Tạo Order
            var order = new Order
            {
                UserId = userId,
                Symbol = symbol,
                Side = side,
                Type = "MARKET",
                Quantity = quantity,
                Price = currentPrice,
                Total = total,
                Status = "FILLED"
            };
            _context.Orders.Add(order);

            // Tạo Trade
            var trade = new Trade
            {
                OrderId = order.Id,
                UserId = userId,
                Symbol = symbol,
                Side = side,
                Quantity = quantity,
                Price = currentPrice,
                Total = total,
                Fee = fee
            };
            _context.Trades.Add(trade);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Market {Side} order for {Quantity} {Symbol} executed at {Price}. Fee: {Fee}", 
                side, quantity, symbol, currentPrice, fee);

            return new OrderResult
            {
                Success = true,
                Message = "Order executed successfully",
                OrderId = order.Id,
                ExecutedPrice = currentPrice,
                ExecutedQuantity = quantity,
                Total = total,
                Fee = fee
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Error processing market order");
            return new OrderResult { Success = false, Message = "An internal error occurred while processing your order." };
        }
    }
}
