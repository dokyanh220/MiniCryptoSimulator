using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;
using MiniCryptoSimulator.Domain.Entities;
using MiniCryptoSimulator.Domain.Enums;
using MiniCryptoSimulator.Infrastructure.Data;
using MiniCryptoSimulator.Infrastructure.Services;
using Xunit;

namespace MiniCryptoSimulator.Tests;

public class TradingLogicTests
{
    private DbContextOptions<AppDbContext> GetInMemoryOptions(string dbName)
    {
        return new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
    }

    private async Task<(AppDbContext, PositionService, WalletService, Guid)> SetupServices(string dbName, decimal initialBalance = 1000m)
    {
        var options = GetInMemoryOptions(dbName);
        var context = new AppDbContext(options);
        
        var userId = Guid.NewGuid();
        var wallet = new Wallet { UserId = userId };
        context.Wallets.Add(wallet);
        
        var balance = new WalletBalance 
        { 
            WalletId = wallet.Id, 
            Asset = "USDT", 
            Available = initialBalance 
        };
        context.WalletBalances.Add(balance);
        await context.SaveChangesAsync();

        var pnlService = new PnLService();
        var walletService = new WalletService(context);
        
        var cache = new MemoryCache(new MemoryCacheOptions());
        // Mock current price to 70000
        cache.Set("ticker_BTCUSDT", new TickerData { Symbol = "BTCUSDT", LastPrice = 70000m });

        var positionService = new PositionService(
            context, 
            cache, 
            pnlService, 
            walletService, 
            new NullLogger<PositionService>());

        return (context, positionService, walletService, userId);
    }

    [Fact]
    public async Task Long_Profit_Should_Increase_Balance()
    {
        var (context, positionService, walletService, userId) = await SetupServices(nameof(Long_Profit_Should_Increase_Balance));
        
        var req = new PlaceFuturesOrderRequest { Symbol = "BTCUSDT", Side = PositionSide.Long, Quantity = 0.01m, Leverage = 10 };
        var orderRes = await positionService.OpenPositionAsync(userId, req);
        Assert.True(orderRes.Success);

        var balanceAfterOpen = (await walletService.GetUsdtBalanceAsync(userId))!.Available;
        
        // Price goes up to 71000
        var closeRes = await positionService.ClosePositionAsync(userId, orderRes.PositionId!.Value, CloseReason.Manual, overridePrice: 71000m);
        Assert.True(closeRes.Success);
        
        // Expected PnL = (71000 - 70000) * 0.01 = +10
        Assert.Equal(10m, closeRes.GrossPnl);
        
        var finalBalance = (await walletService.GetUsdtBalanceAsync(userId))!.Available;
        Assert.Equal(1000m + closeRes.NetPnl, finalBalance);
    }

    [Fact]
    public async Task Long_Loss_Should_Decrease_Balance()
    {
        var (context, positionService, walletService, userId) = await SetupServices(nameof(Long_Loss_Should_Decrease_Balance));
        
        var req = new PlaceFuturesOrderRequest { Symbol = "BTCUSDT", Side = PositionSide.Long, Quantity = 0.01m, Leverage = 10 };
        var orderRes = await positionService.OpenPositionAsync(userId, req);
        
        // Price goes down to 69000
        var closeRes = await positionService.ClosePositionAsync(userId, orderRes.PositionId!.Value, CloseReason.Manual, overridePrice: 69000m);
        
        // Expected PnL = (69000 - 70000) * 0.01 = -10
        Assert.Equal(-10m, closeRes.GrossPnl);
        
        var finalBalance = (await walletService.GetUsdtBalanceAsync(userId))!.Available;
        Assert.Equal(1000m + closeRes.NetPnl, finalBalance);
    }

    [Fact]
    public async Task Short_Profit_Should_Increase_Balance()
    {
        var (context, positionService, walletService, userId) = await SetupServices(nameof(Short_Profit_Should_Increase_Balance));
        
        var req = new PlaceFuturesOrderRequest { Symbol = "BTCUSDT", Side = PositionSide.Short, Quantity = 0.01m, Leverage = 10 };
        var orderRes = await positionService.OpenPositionAsync(userId, req);
        
        // Price goes down to 69000
        var closeRes = await positionService.ClosePositionAsync(userId, orderRes.PositionId!.Value, CloseReason.Manual, overridePrice: 69000m);
        
        // Expected PnL = (70000 - 69000) * 0.01 = +10
        Assert.Equal(10m, closeRes.GrossPnl);
        
        var finalBalance = (await walletService.GetUsdtBalanceAsync(userId))!.Available;
        Assert.Equal(1000m + closeRes.NetPnl, finalBalance);
    }

    [Fact]
    public async Task Short_Loss_Should_Decrease_Balance()
    {
        var (context, positionService, walletService, userId) = await SetupServices(nameof(Short_Loss_Should_Decrease_Balance));
        
        var req = new PlaceFuturesOrderRequest { Symbol = "BTCUSDT", Side = PositionSide.Short, Quantity = 0.01m, Leverage = 10 };
        var orderRes = await positionService.OpenPositionAsync(userId, req);
        
        // Price goes up to 71000
        var closeRes = await positionService.ClosePositionAsync(userId, orderRes.PositionId!.Value, CloseReason.Manual, overridePrice: 71000m);
        
        // Expected PnL = (70000 - 71000) * 0.01 = -10
        Assert.Equal(-10m, closeRes.GrossPnl);
        
        var finalBalance = (await walletService.GetUsdtBalanceAsync(userId))!.Available;
        Assert.Equal(1000m + closeRes.NetPnl, finalBalance);
    }

    [Fact]
    public async Task Short_TP_Should_Trigger_Properly()
    {
        var (context, positionService, walletService, userId) = await SetupServices(nameof(Short_TP_Should_Trigger_Properly));
        
        // Short at 70000, TP at 69000
        var req = new PlaceFuturesOrderRequest 
        { 
            Symbol = "BTCUSDT", Side = PositionSide.Short, Quantity = 0.01m, Leverage = 10, TakeProfitPrice = 69000m 
        };
        var orderRes = await positionService.OpenPositionAsync(userId, req);
        
        // Trigger TP with a price that jumped past TP (e.g. 68500)
        var riskService = new RiskService(
            new Microsoft.Extensions.DependencyInjection.ServiceCollection()
                .AddScoped(sp => context)
                .AddScoped<IPositionService>(sp => positionService)
                .BuildServiceProvider()
                .GetRequiredService<Microsoft.Extensions.DependencyInjection.IServiceScopeFactory>(),
            new NullLogger<RiskService>()
        );

        await riskService.EvaluateRiskAsync("BTCUSDT", 68500m);

        // Position should be closed
        var positions = await positionService.GetOpenPositionsAsync(userId);
        Assert.Empty(positions);

        var finalBalance = (await walletService.GetUsdtBalanceAsync(userId))!.Available;
        // Gross PnL = (70000 - 68500) * 0.01 = +15
        Assert.Equal(1015m, finalBalance);
    }
}
