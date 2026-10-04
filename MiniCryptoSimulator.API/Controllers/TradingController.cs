using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;
using MiniCryptoSimulator.Domain.Enums;
using MiniCryptoSimulator.Infrastructure.Data;

namespace MiniCryptoSimulator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TradingController : ControllerBase
{
    private readonly IPositionService _positionService;
    private readonly AppDbContext _context;

    public TradingController(IPositionService positionService, AppDbContext context)
    {
        _positionService = positionService;
        _context = context;
    }

    [HttpPost("order")]
    public async Task<IActionResult> PlaceOrder([FromBody] PlaceFuturesOrderRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { message = "Invalid token or user ID not found." });

        if (request.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than 0." });

        var result = await _positionService.OpenPositionAsync(userId, request);

        if (!result.Success)
            return BadRequest(new { message = result.Message });

        return Ok(result);
    }

    [HttpPost("positions/{id}/close")]
    public async Task<IActionResult> ClosePosition(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { message = "Invalid token." });

        var result = await _positionService.ClosePositionAsync(userId, id, CloseReason.Manual);
        
        if (!result.Success) return BadRequest(new { message = result.Message });
        
        return Ok(result);
    }

    [HttpGet("positions")]
    public async Task<IActionResult> GetPositions()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var positions = await _positionService.GetOpenPositionsAsync(userId);
        return Ok(positions);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetTradeHistory([FromQuery] string? symbol)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized(new { message = "Invalid token." });

        var query = _context.Trades
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.ClosedAt); // Replaced CreatedAt with ClosedAt

        if (!string.IsNullOrEmpty(symbol))
        {
            var filteredQuery = query.Where(t => t.Symbol == symbol);
            var filteredTrades = await filteredQuery.Take(50).ToListAsync();
            return Ok(filteredTrades);
        }

        var trades = await query.Take(50).ToListAsync();
        return Ok(trades);
    }

    [HttpPut("position/{id}")]
    public async Task<IActionResult> UpdatePosition(Guid id, [FromBody] UpdatePositionRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        try
        {
            var success = await _positionService.UpdatePositionAsync(userId, id, request.StopLoss, request.TakeProfit);
            if (success) return Ok(new { success = true });
            return NotFound(new { success = false, message = "Position not found" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("orders/pending")]
    public async Task<IActionResult> GetPendingOrders()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var orders = await _positionService.GetPendingOrdersAsync(userId);
        return Ok(orders);
    }

    [HttpDelete("orders/{id}")]
    public async Task<IActionResult> CancelOrder(Guid id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var success = await _positionService.CancelOrderAsync(userId, id);
        if (success) return Ok(new { success = true });
        return NotFound(new { success = false, message = "Order not found or already executed" });
    }
}
public class UpdatePositionRequest
{
    public decimal? StopLoss { get; set; }
    public decimal? TakeProfit { get; set; }
}
