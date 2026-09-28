using Microsoft.EntityFrameworkCore;
using MiniCryptoSimulator.Domain.Entities;

namespace MiniCryptoSimulator.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<User> Users { get; set; }
    public DbSet<Wallet> Wallets { get; set; }
    public DbSet<WalletBalance> WalletBalances { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<Trade> Trades { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<WalletBalance>().Property(x => x.Available).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<WalletBalance>().Property(x => x.Locked).HasColumnType("numeric(18, 8)");
        
        modelBuilder.Entity<Order>().Property(x => x.Quantity).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Order>().Property(x => x.Price).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Order>().Property(x => x.Total).HasColumnType("numeric(18, 8)");
        
        modelBuilder.Entity<Trade>().Property(x => x.Quantity).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.Price).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.Total).HasColumnType("numeric(18, 8)");
        modelBuilder.Entity<Trade>().Property(x => x.Fee).HasColumnType("numeric(18, 8)");
    }
}