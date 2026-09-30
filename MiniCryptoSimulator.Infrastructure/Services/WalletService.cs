using Microsoft.EntityFrameworkCore;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Domain.Entities;
using MiniCryptoSimulator.Domain.Enums;
using MiniCryptoSimulator.Infrastructure.Data;

namespace MiniCryptoSimulator.Infrastructure.Services;

public class WalletService : IWalletService
{
    private readonly AppDbContext _context;

    public WalletService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<WalletBalance?> GetUsdtBalanceAsync(Guid userId)
    {
        return await _context.WalletBalances
            .Include(b => b.Wallet)
            .FirstOrDefaultAsync(b => b.Wallet.UserId == userId && b.Asset == "USDT");
    }

    public async Task LockMarginAsync(Guid userId, decimal margin, decimal fee, Guid? referenceId = null)
    {
        var balance = await GetUsdtBalanceAsync(userId);
        if (balance == null) throw new InvalidOperationException("USDT balance not found");

        decimal required = margin + fee;
        if (balance.Available < required)
        {
            throw new InvalidOperationException("Insufficient balance");
        }

        balance.Available -= required;
        balance.UsedMargin += margin;
        
        // Fee is deducted forever
        
        var transaction = new Transaction
        {
            UserId = userId,
            Type = TransactionType.MarginLocked,
            Amount = -required,
            BalanceBefore = balance.Available + required,
            BalanceAfter = balance.Available,
            ReferenceId = referenceId
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task ReleaseMarginAsync(Guid userId, decimal margin, decimal grossPnl, decimal exitFee, Guid? referenceId = null)
    {
        var balance = await GetUsdtBalanceAsync(userId);
        if (balance == null) throw new InvalidOperationException("USDT balance not found");

        decimal balanceBefore = balance.Available;

        balance.UsedMargin -= margin;
        
        // Entry fee was deducted on open. We just need to add Margin + GrossPnl - ExitFee
        decimal amountToAdd = margin + grossPnl - exitFee;
        balance.Available += amountToAdd;

        // If bankrupt, cap at 0
        if (balance.Available < 0) balance.Available = 0;

        var transaction = new Transaction
        {
            UserId = userId,
            Type = TransactionType.MarginReleased,
            Amount = amountToAdd,
            BalanceBefore = balanceBefore,
            BalanceAfter = balance.Available,
            ReferenceId = referenceId
        };
        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();
    }
}
