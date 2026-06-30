# Adanos API Endpoint Catalog

Base URL: `https://api.adanos.org`

Protected endpoints require:

```bash
-H "X-API-Key: $ADANOS_API_KEY"
```

## Common Query Parameters

Most aggregate endpoints accept:

- `days`: integer historical lookback
- `from`: `YYYY-MM-DD` lower bound
- `to`: `YYYY-MM-DD` upper bound
- `limit`: page size
- `offset`: page offset

Use either `days` or `from`/`to`, not both unless the user explicitly asks for
debugging.

## Stock Platforms

The stock platform bases are:

- Reddit stocks: `/reddit/stocks/v1`
- X / FinTwit stocks: `/x/stocks/v1`
- News stocks: `/news/stocks/v1`
- Polymarket stocks: `/polymarket/stocks/v1`

Each stock platform supports:

| Method | Path | Purpose | Plan |
|--------|------|---------|------|
| GET | `/{platform}/health` | platform health/freshness | public |
| GET | `/{platform}/trending` | ranked trending stocks | Free+ |
| GET | `/{platform}/trending/sectors` | ranked sectors | Free+ |
| GET | `/{platform}/trending/countries` | ranked countries | Free+ |
| GET | `/{platform}/stock/{ticker}` | one ticker detail | Free+ |
| GET | `/{platform}/compare?tickers=...` | compare up to 10 tickers | Free+ |
| GET | `/{platform}/market-sentiment` | platform-wide market mood | Free+ |
| GET | `/{platform}/search?q=...` | search supported stocks | Free+ |
| GET | `/{platform}/stats` | service coverage stats | Free+ |
| GET | `/{platform}/stock/{ticker}/mentions` | raw evidence rows | Professional |

Additional stock explain endpoints:

| Method | Path | Purpose | Plan |
|--------|------|---------|------|
| GET | `/reddit/stocks/v1/stock/{ticker}/explain` | Reddit trend explanation | Free+ |
| GET | `/x/stocks/v1/stock/{ticker}/explain` | X trend explanation | Free+ |
| GET | `/news/stocks/v1/stock/{ticker}/explain` | News trend explanation | Free+ |

Polymarket does not expose an explain endpoint in the current OpenAPI spec.

## Crypto Platform

The crypto platform base is `/reddit/crypto/v1`.

| Method | Path | Purpose | Plan |
|--------|------|---------|------|
| GET | `/reddit/crypto/v1/health` | crypto Reddit health/freshness | public |
| GET | `/reddit/crypto/v1/trending` | ranked trending tokens | Free+ |
| GET | `/reddit/crypto/v1/token/{symbol}` | one token detail | Free+ |
| GET | `/reddit/crypto/v1/compare?symbols=...` | compare up to 10 symbols | Free+ |
| GET | `/reddit/crypto/v1/market-sentiment` | crypto-wide Reddit market mood | Free+ |
| GET | `/reddit/crypto/v1/search?q=...` | search supported crypto assets | Free+ |
| GET | `/reddit/crypto/v1/stats` | service coverage stats | Free+ |
| GET | `/reddit/crypto/v1/token/{symbol}/mentions` | raw evidence rows | Professional |

Raw Reddit mention endpoints accept `include_inherited=true|false`.

## Text Sentiment

| Method | Path | Purpose | Plan |
|--------|------|---------|------|
| POST | `/sentiment/v1/analyze` | finance-tuned text sentiment analysis | Professional |

Request body:

```json
{
  "text": "TSLA looks like a short squeeze setup, loading calls"
}
```

`text` is limited to 2048 characters by the API.

## Root Health

| Method | Path | Purpose | Plan |
|--------|------|---------|------|
| GET | `/health` | deep diagnostic API health | public |

## Curl Examples

```bash
curl "https://api.adanos.org/reddit/stocks/v1/trending?days=7&limit=5" \
  -H "X-API-Key: $ADANOS_API_KEY"

curl "https://api.adanos.org/news/stocks/v1/stock/NVDA?days=30" \
  -H "X-API-Key: $ADANOS_API_KEY"

curl "https://api.adanos.org/reddit/crypto/v1/token/BTC?days=7" \
  -H "X-API-Key: $ADANOS_API_KEY"

curl -X POST "https://api.adanos.org/sentiment/v1/analyze" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ADANOS_API_KEY" \
  -d '{"text":"NVDA guidance looks bullish after the earnings call"}'
```

