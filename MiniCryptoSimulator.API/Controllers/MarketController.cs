using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MarketController : ControllerBase
{
    private readonly IBinanceService _binanceService;
    private readonly TradingSettings _settings;
    private readonly IMemoryCache _cache;

    public MarketController(IBinanceService binanceService, IOptions<TradingSettings> settings, IMemoryCache cache)
    {
        _binanceService = binanceService;
        _settings = settings.Value;
        _cache = cache;
    }

    [HttpGet("ticker")]
    public IActionResult GetTicker([FromQuery] string? symbol)
    {
        var targetSymbol = string.IsNullOrEmpty(symbol) ? _settings.DefaultSymbol : symbol.ToUpper();

        if (!_settings.SupportedSymbols.Contains(targetSymbol))
        {
            return BadRequest(new { message = $"Symbol {targetSymbol} is not supported." });
        }

        if (_cache.TryGetValue($"ticker_{targetSymbol}", out TickerData? ticker))
        {
            return Ok(ticker);
        }

        return NotFound(new { message = "Data is loading from Binance..." });
    }

    [HttpGet("klines")]
    public async Task<IActionResult> GetKlines([FromQuery] string? symbol, [FromQuery] string interval = "1h", [FromQuery] int limit = 100)
    {
        var targetSymbol = string.IsNullOrEmpty(symbol) ? _settings.DefaultSymbol : symbol;

        if (!_settings.SupportedSymbols.Contains(targetSymbol))
        {
            return BadRequest(new { message = $"Symbol {targetSymbol} is not supported." });
        }

        try
        {
            var data = await _binanceService.GetKlinesAsync(targetSymbol, interval, limit);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error fetching market data", details = ex.Message });
        }
    }
}