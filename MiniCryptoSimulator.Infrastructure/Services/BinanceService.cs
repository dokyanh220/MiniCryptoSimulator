using System.Text.Json;
using MiniCryptoSimulator.Application.Interfaces;
using MiniCryptoSimulator.Application.Models;

namespace MiniCryptoSimulator.Infrastructure.Services;

public class BinanceService : IBinanceService
{
    private readonly HttpClient _httpClient;

    public BinanceService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri("https://api.binance.com");
    }

    public async Task<List<CandleData>> GetKlinesAsync(string symbol, string interval, int limit = 100)
    {
        var response = await _httpClient.GetAsync($"/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        
        // Binance trả về dữ liệu dạng mảng lồng mảng
        var jsonArray = JsonSerializer.Deserialize<List<List<JsonElement>>>(content);
        var candles = new List<CandleData>();

        if (jsonArray != null)
        {
            foreach (var item in jsonArray)
            {
                candles.Add(new CandleData
                {
                    OpenTime = DateTimeOffset.FromUnixTimeMilliseconds(item[0].GetInt64()).UtcDateTime,
                    Open = decimal.Parse(item[1].GetString()!),
                    High = decimal.Parse(item[2].GetString()!),
                    Low = decimal.Parse(item[3].GetString()!),
                    Close = decimal.Parse(item[4].GetString()!),
                    Volume = decimal.Parse(item[5].GetString()!),
                    CloseTime = DateTimeOffset.FromUnixTimeMilliseconds(item[6].GetInt64()).UtcDateTime
                });
            }
        }

        return candles;
    }
}