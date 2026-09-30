using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniCryptoSimulator.Infrastructure.Data;
using System.Security.Claims;

namespace MiniCryptoSimulator.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly AppDbContext _context;

    public UserController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        // 1. Lấy User ID từ Token (do Middleware JWT đã giải mã)
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized();

        // 2. Lấy thông tin User kèm theo Ví và Số dư từ Database
        var user = await _context.Users
            .Include(u => u.Wallet)
            .ThenInclude(w => w.Balances)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound(new { message = "Không tìm thấy người dùng!" });

        // 3. Trả về dữ liệu Profile & Balances
        var profile = new
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Balances = user.Wallet?.Balances.Select(b => new
            {
                Asset = b.Asset,
                Available = b.Available,
                Locked = b.Locked,
                UsedMargin = b.UsedMargin,
                RealizedPnl = b.RealizedPnl,
                UnrealizedPnl = b.UnrealizedPnl
            })
        };

        return Ok(profile);
    }
}
