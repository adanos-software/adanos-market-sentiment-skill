# Adanos Market Sentiment Skill

Official agent skill for the [Adanos Market Sentiment API](https://adanos.org/).

Adanos provides API-first market sentiment data for stocks and crypto from
Reddit, X / FinTwit, financial news, and Polymarket signals.

## Install

```bash
npx skills add adanos-software/adanos-market-sentiment-skill
```

Use without installing:

```bash
npx skills use adanos-software/adanos-market-sentiment-skill@adanos-market-sentiment
```

## API Key

Protected endpoints require an Adanos API key.

```bash
export ADANOS_API_KEY="sk_live_your_key_here"
```

Get a key at [adanos.org/register](https://adanos.org/register).

## Included Skill

- `adanos-market-sentiment`: read-only access patterns for all public Adanos
  sentiment endpoints, plus Professional-only raw mention and text sentiment
  endpoints.

## Local CLI

The skill includes a small dependency-free Node.js helper:

```bash
node skills/adanos-market-sentiment/scripts/adanos.mjs trending --platform reddit --days 7 --limit 5
node skills/adanos-market-sentiment/scripts/adanos.mjs asset --platform news --ticker NVDA --days 14
node skills/adanos-market-sentiment/scripts/adanos.mjs analyze --text "TSLA looks like a short squeeze setup"
```

The helper prints JSON and preserves Adanos rate-limit headers in a `_headers`
object when available.

## Plans

| Plan | Monthly requests | Historical window | Burst limit | Raw mentions | Text sentiment |
|------|------------------|-------------------|-------------|--------------|----------------|
| Free | 250/month | 1-30 days | 100 req/min | No | No |
| Hobby | 250,000/month | 1-90 days | 1000 req/min | No | No |
| Professional | 2,500,000/month | 1-365 days | 1000 req/min | Yes | Yes |

See [plans.md](skills/adanos-market-sentiment/references/plans.md) for details.

## Development

```bash
npm test
npm run check:openapi
npx skills add . --list
npx skills use .@adanos-market-sentiment
```

`npm run check:openapi` compares the structured CLI commands against the live
OpenAPI document at `https://api.adanos.org/openapi.json`.
