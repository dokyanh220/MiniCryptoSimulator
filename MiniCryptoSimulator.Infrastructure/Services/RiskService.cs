using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Domain.Enums;
using MiniCryptoSimulator.Infrastructure.Data;

namespace MiniCryptoSimulator.Infrastructure.Services;

public class RiskService : IRiskService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RiskService> _logger;

    public RiskService(IServiceScopeFactory scopeFactory, ILogger<RiskService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task EvaluateRiskAsync(string symbol, decimal currentPrice)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var positionService = scope.ServiceProvider.GetRequiredService<IPositionService>();
        
        // MVP: Fetch all open positions for this symbol
        var openPositions = await context.Positions
            .Where(p => p.Symbol == symbol && p.Status == PositionStatus.Open)
            .ToListAsync();

        foreach (var position in openPositions)
        {
            try
            {
                if (position.Side == PositionSide.Long)
                {
                    if (position.StopLossPrice.HasValue && currentPrice <= position.StopLossPrice.Value)
                    {
                        await positionService.ClosePositionAsync(position.UserId, position.Id, CloseReason.StopLoss, currentPrice);
                        _logger.LogInformation("Position {Id} closed by Stop Loss", position.Id);
                    }
                    else if (position.TakeProfitPrice.HasValue && currentPrice >= position.TakeProfitPrice.Value)
                    {
                        await positionService.ClosePositionAsync(position.UserId, position.Id, CloseReason.TakeProfit, currentPrice);
                        _logger.LogInformation("Position {Id} closed by Take Profit", position.Id);
                    }
                }
                else // Short
                {
                    if (position.StopLossPrice.HasValue && currentPrice >= position.StopLossPrice.Value)
                    {
                        await positionService.ClosePositionAsync(position.UserId, position.Id, CloseReason.StopLoss, currentPrice);
                        _logger.LogInformation("Position {Id} closed by Stop Loss", position.Id);
                    }
                    else if (position.TakeProfitPrice.HasValue && currentPrice <= position.TakeProfitPrice.Value)
                    {
                        await positionService.ClosePositionAsync(position.UserId, position.Id, CloseReason.TakeProfit, currentPrice);
                        _logger.LogInformation("Position {Id} closed by Take Profit", position.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error evaluating risk for position {Id}", position.Id);
            }
        }
    }
}
