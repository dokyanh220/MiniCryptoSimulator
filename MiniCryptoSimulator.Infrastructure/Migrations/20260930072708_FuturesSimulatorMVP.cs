using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MiniCryptoSimulator.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FuturesSimulatorMVP : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Total",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "Total",
                table: "Trades",
                newName: "NetPnl");

            migrationBuilder.RenameColumn(
                name: "Price",
                table: "Trades",
                newName: "GrossPnl");

            migrationBuilder.RenameColumn(
                name: "OrderId",
                table: "Trades",
                newName: "PositionId");

            migrationBuilder.RenameColumn(
                name: "Fee",
                table: "Trades",
                newName: "ExitPrice");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Trades",
                newName: "OpenedAt");

            migrationBuilder.AddColumn<decimal>(
                name: "RealizedPnl",
                table: "WalletBalances",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnrealizedPnl",
                table: "WalletBalances",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UsedMargin",
                table: "WalletBalances",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "CloseReason",
                table: "Trades",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAt",
                table: "Trades",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "EntryFee",
                table: "Trades",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "EntryPrice",
                table: "Trades",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExitFee",
                table: "Trades",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExecutedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Leverage",
                table: "Orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "StopLossPrice",
                table: "Orders",
                type: "numeric(18,8)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TakeProfitPrice",
                table: "Orders",
                type: "numeric(18,8)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Positions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Symbol = table.Column<string>(type: "text", nullable: false),
                    Side = table.Column<string>(type: "text", nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    EntryPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    Leverage = table.Column<int>(type: "integer", nullable: false),
                    Margin = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    StopLossPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    TakeProfitPrice = table.Column<decimal>(type: "numeric(18,8)", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Positions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Transactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    BalanceBefore = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    BalanceAfter = table.Column<decimal>(type: "numeric(18,8)", nullable: false),
                    ReferenceId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Transactions", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Positions");

            migrationBuilder.DropTable(
                name: "Transactions");

            migrationBuilder.DropColumn(
                name: "RealizedPnl",
                table: "WalletBalances");

            migrationBuilder.DropColumn(
                name: "UnrealizedPnl",
                table: "WalletBalances");

            migrationBuilder.DropColumn(
                name: "UsedMargin",
                table: "WalletBalances");

            migrationBuilder.DropColumn(
                name: "CloseReason",
                table: "Trades");

            migrationBuilder.DropColumn(
                name: "ClosedAt",
                table: "Trades");

            migrationBuilder.DropColumn(
                name: "EntryFee",
                table: "Trades");

            migrationBuilder.DropColumn(
                name: "EntryPrice",
                table: "Trades");

            migrationBuilder.DropColumn(
                name: "ExitFee",
                table: "Trades");

            migrationBuilder.DropColumn(
                name: "ExecutedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Leverage",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "StopLossPrice",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TakeProfitPrice",
                table: "Orders");

            migrationBuilder.RenameColumn(
                name: "PositionId",
                table: "Trades",
                newName: "OrderId");

            migrationBuilder.RenameColumn(
                name: "OpenedAt",
                table: "Trades",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "NetPnl",
                table: "Trades",
                newName: "Total");

            migrationBuilder.RenameColumn(
                name: "GrossPnl",
                table: "Trades",
                newName: "Price");

            migrationBuilder.RenameColumn(
                name: "ExitPrice",
                table: "Trades",
                newName: "Fee");

            migrationBuilder.AddColumn<decimal>(
                name: "Total",
                table: "Orders",
                type: "numeric(18,8)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
