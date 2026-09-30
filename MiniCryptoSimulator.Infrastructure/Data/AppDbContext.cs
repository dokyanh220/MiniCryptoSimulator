using Microsoft.EntityFrameworkCore;
using MiniCryptoSimulator.Domain.Entities;
using MiniCryptoSimulator.Domain.Enums;

namespace MiniCryptoSimulator.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Wallet> Wallets { get; set; }
    public DbSet<WalletBalance> WalletBalances { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<Trade> Trades { get; set; }
    public DbSet<Position> Positions { get; set; }
    public DbSet<Transaction> Transactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Convert Enums to strings for DB readability
        modelBuilder.Entity<Position>().Property(e => e.Side).HasConversion<string>();
        modelBuilder.Entity<Position>().Property(e => e.Status).HasConversion<string>();
        modelBuilder.Entity<Order>().Property(e => e.Side).HasConversion<string>();
        modelBuilder.Entity<Order>().Property(e => e.Type).HasConversion<string>();
        modelBuilder.Entity<Order>().Property(e => e.Status).HasConversion<string>();
        modelBuilder.Entity<Trade>().Property(e => e.Side).HasConversion<string>();
        modelBuilder.Entity<Trade>().Property(e => e.CloseReason).HasConversion<string>();
        modelBuilder.Entity<Transaction>().Property(e => e.Type).HasConversion<string>();

        // Postgres Concurrency Token
        modelBuilder.Entity<Position>()
            .Property(p => p.Version)
            .IsRowVersion();

        // Configure Decimals
        modelBuilder.Entity<WalletBalance>().Property(x => x.Available).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<WalletBalance>().Property(x => x.Locked).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<WalletBalance>().Property(x => x.UsedMargin).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<WalletBalance>().Property(x => x.RealizedPnl).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<WalletBalance>().Property(x => x.UnrealizedPnl).HasColumnType("numeric(18, 8)");
        
        modelBuilder.Entity<Order>().Property(x => x.Quantity).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Order>().Property(x => x.Price).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Order>().Property(x => x.StopLossPrice).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Order>().Property(x => x.TakeProfitPrice).HasColumnType("numeric(18, 8)");
        
        modelBuilder.Entity<Trade>().Property(x => x.Quantity).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.EntryPrice).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.ExitPrice).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.GrossPnl).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.EntryFee).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.ExitFee).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.NetPnl).HasColumnType("numeric(18, 8)");

        modelBuilder.Entity<Position>().Property(x => x.Quantity).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Position>().Property(x => x.EntryPrice).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Position>().Property(x => x.Margin).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Position>().Property(x => x.StopLossPrice).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Position>().Property(x => x.TakeProfitPrice).HasColumnType("numeric(18, 8)");

        modelBuilder.Entity<Transaction>().Property(x => x.Amount).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Transaction>().Property(x => x.BalanceBefore).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Transaction>().Property(x => x.BalanceAfter).HasColumnType("numeric(18, 8)");
    }
}