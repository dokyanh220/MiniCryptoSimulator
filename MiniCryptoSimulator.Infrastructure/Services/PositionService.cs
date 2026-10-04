using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;
using MiniCryptoSimulator.Domain.Entities;
using MiniCryptoSimulator.Domain.Enums;
using MiniCryptoSimulator.Infrastructure.Data;

namespace MiniCryptoSimulator.Infrastructure.Services;

public class PositionService : IPositionService
{
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IPnLService _pnlService;
    private readonly IWalletService _walletService;
    private readonly ILogger<PositionService> _logger;

    public PositionService(AppDbContext context, IMemoryCache cache, IPnLService pnlService, IWalletService walletService, ILogger<PositionService> logger)
    {
        _context = context;
        _cache = cache;
        _pnlService = pnlService;
        _walletService = walletService;
        _logger = logger;
    }

    public async Task<OrderResult> OpenPositionAsync(Guid userId, PlaceFuturesOrderRequest request)
    {
        if (request.Quantity <= 0) return new OrderResult { Success = false, Message = "Quantity must be > 0" };
        if (request.Leverage <= 0 || request.Leverage > 100) return new OrderResult { Success = false, Message = "Leverage must be between 1 and 100" };

        if (!_cache.TryGetValue($"ticker_{request.Symbol}", out TickerData? ticker) || ticker == null)
            return new OrderResult { Success = false, Message = "Current price not available" };

        decimal executionPrice = request.Type == OrderType.Limit ? request.Price : ticker.LastPrice;

        // Risk Validation: SL/TP logic
        if (request.Side == PositionSide.Long)
        {
            if (request.StopLossPrice.HasValue && request.StopLossPrice >= executionPrice)
                return new OrderResult { Success = false, Message = "StopLoss must be < EntryPrice for Long" };
            if (request.TakeProfitPrice.HasValue && request.TakeProfitPrice <= executionPrice)
                return new OrderResult { Success = false, Message = "TakeProfit must be > EntryPrice for Long" };
        }
        else
        {
            if (request.StopLossPrice.HasValue && request.StopLossPrice <= executionPrice)
                return new OrderResult { Success = false, Message = "StopLoss must be > EntryPrice for Short" };
            if (request.TakeProfitPrice.HasValue && request.TakeProfitPrice >= executionPrice)
                return new OrderResult { Success = false, Message = "TakeProfit must be < EntryPrice for Short" };
        }

        decimal notional = _pnlService.CalculateNotional(request.Quantity, executionPrice);
        decimal margin = _pnlService.CalculateMargin(notional, request.Leverage);
        // For limit orders, we might not deduct fee immediately, but let's lock it for simplicity.
        decimal entryFee = _pnlService.CalculateFee(notional);

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Lock margin and deduct fee
            await _walletService.LockMarginAsync(userId, margin, entryFee);

            var order = new Order
            {
                UserId = userId,
                Symbol = request.Symbol,
                Side = request.Side,
                Type = request.Type,
                Quantity = request.Quantity,
                Price = executionPrice,
                Leverage = request.Leverage,
                StopLossPrice = request.StopLossPrice,
                TakeProfitPrice = request.TakeProfitPrice,
                Status = request.Type == OrderType.Limit ? OrderStatus.Pending : OrderStatus.Filled,
                CreatedAt = DateTime.UtcNow
            };

            if (request.Type == OrderType.Market)
            {
                order.ExecutedAt = DateTime.UtcNow;
            }

            _context.Orders.Add(order);

            Position? position = null;
            if (request.Type == OrderType.Market)
            {
                position = new Position
                {
                    UserId = userId,
                    Symbol = request.Symbol,
                    Side = request.Side,
                    Quantity = request.Quantity,
                    EntryPrice = executionPrice,
                    Leverage = request.Leverage,
                    Margin = margin,
                    StopLossPrice = request.StopLossPrice,
                    TakeProfitPrice = request.TakeProfitPrice,
                    Status = PositionStatus.Open
                };
                _context.Positions.Add(position);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new OrderResult
            {
                Success = true,
                Message = request.Type == OrderType.Limit ? "Limit order placed" : "Position opened",
                OrderId = order.Id,
                PositionId = position?.Id,
                ExecutedPrice = executionPrice,
                ExecutedQuantity = request.Quantity,
                Margin = margin,
                Fee = entryFee
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to open position");
            return new OrderResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<ClosePositionResult> ClosePositionAsync(Guid userId, Guid positionId, CloseReason reason, decimal? overridePrice = null)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var position = await _context.Positions.FirstOrDefaultAsync(p => p.Id == positionId && p.UserId == userId);
            if (position == null || position.Status != PositionStatus.Open)
            {
                return new ClosePositionResult { Success = false, Message = "Position not found or already closed" };
            }

            decimal exitPrice = overridePrice ?? 0;
            if (overridePrice == null)
            {
                if (!_cache.TryGetValue($"ticker_{position.Symbol}", out TickerData? ticker) || ticker == null)
                    return new ClosePositionResult { Success = false, Message = "Current price not available" };
                exitPrice = ticker.LastPrice;
            }

            decimal entryNotional = _pnlService.CalculateNotional(position.Quantity, position.EntryPrice);
            decimal exitNotional = _pnlService.CalculateNotional(position.Quantity, exitPrice);
            
            decimal grossPnl = _pnlService.CalculateGrossPnl(position.Side, position.EntryPrice, exitPrice, position.Quantity);
            decimal entryFee = _pnlService.CalculateFee(entryNotional);
            decimal exitFee = _pnlService.CalculateFee(exitNotional);
            decimal netPnl = _pnlService.CalculateNetPnl(grossPnl, entryFee, exitFee);

            // Release margin and add/subtract PnL
            await _walletService.ReleaseMarginAsync(userId, position.Margin, grossPnl, exitFee, position.Id);

            position.Status = PositionStatus.Closed;
            position.ClosedAt = DateTime.UtcNow;

            var trade = new Trade
            {
                UserId = userId,
                PositionId = position.Id,
                Symbol = position.Symbol,
                Side = position.Side,
                Quantity = position.Quantity,
                EntryPrice = position.EntryPrice,
                ExitPrice = exitPrice,
                GrossPnl = grossPnl,
                EntryFee = entryFee,
                ExitFee = exitFee,
                NetPnl = netPnl,
                CloseReason = reason
            };
            _context.Trades.Add(trade);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new ClosePositionResult
            {
                Success = true,
                ExitPrice = exitPrice,
                GrossPnl = grossPnl,
                NetPnl = netPnl,
                ExitFee = exitFee
            };
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            return new ClosePositionResult { Success = false, Message = "Position was updated concurrently" };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to close position");
            return new ClosePositionResult { Success = false, Message = ex.Message };
        }
    }

    public async Task<List<Position>> GetOpenPositionsAsync(Guid userId)
    {
        return await _context.Positions.Where(p => p.UserId == userId && p.Status == PositionStatus.Open).ToListAsync();
    }

    public async Task<bool> UpdatePositionAsync(Guid userId, Guid positionId, decimal? stopLossPrice, decimal? takeProfitPrice)
    {
        var position = await _context.Positions.FirstOrDefaultAsync(p => p.Id == positionId && p.UserId == userId && p.Status == PositionStatus.Open);
        if (position == null) return false;

        // Validations
        if (position.Side == PositionSide.Long)
        {
            if (stopLossPrice >= position.EntryPrice) throw new Exception("SL must be < Entry for LONG");
            if (takeProfitPrice <= position.EntryPrice) throw new Exception("TP must be > Entry for LONG");
        }
        else
        {
            if (stopLossPrice <= position.EntryPrice) throw new Exception("SL must be > Entry for SHORT");
            if (takeProfitPrice >= position.EntryPrice) throw new Exception("TP must be < Entry for SHORT");
        }

        position.StopLossPrice = stopLossPrice;
        position.TakeProfitPrice = takeProfitPrice;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<Order>> GetPendingOrdersAsync(Guid userId)
    {
        return await _context.Orders
            .Where(o => o.UserId == userId && o.Status == OrderStatus.Pending)
            .ToListAsync();
    }

    public async Task<bool> CancelOrderAsync(Guid userId, Guid orderId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId && o.Status == OrderStatus.Pending);
            if (order == null) return false;

            order.Status = OrderStatus.Cancelled;

            // Release locked margin
            decimal notional = _pnlService.CalculateNotional(order.Quantity, order.Price);
            decimal margin = _pnlService.CalculateMargin(notional, order.Leverage);
            decimal entryFee = _pnlService.CalculateFee(notional);
            
            // We just refund the margin and fee that were locked
            await _walletService.ReleaseMarginAsync(userId, margin, 0, -entryFee); // -entryFee to refund it

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to cancel order");
            return false;
        }
    }

    public async Task<bool> ExecuteLimitOrderAsync(Guid orderId, decimal executedPrice)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.Status == OrderStatus.Pending);
            if (order == null) return false;

            order.Status = OrderStatus.Filled;
            order.ExecutedAt = DateTime.UtcNow;

            // Margin and fee were already locked when placing the order using order.Price.
            // If executedPrice is different, we might have a slight difference, but for simplicity, we keep the original locked margin.
            decimal notional = _pnlService.CalculateNotional(order.Quantity, order.Price);
            decimal margin = _pnlService.CalculateMargin(notional, order.Leverage);

            var position = new Position
            {
                UserId = order.UserId,
                Symbol = order.Symbol,
                Side = order.Side,
                Quantity = order.Quantity,
                EntryPrice = executedPrice,
                Leverage = order.Leverage,
                Margin = margin,
                StopLossPrice = order.StopLossPrice,
                TakeProfitPrice = order.TakeProfitPrice,
                Status = PositionStatus.Open
            };

            _context.Positions.Add(position);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return true;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Failed to execute limit order");
            return false;
        }
    }
}
