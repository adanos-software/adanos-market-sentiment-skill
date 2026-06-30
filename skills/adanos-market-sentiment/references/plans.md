# Adanos Plan Rules

Adanos endpoints are authenticated unless they are health or documentation
endpoints. Use the `X-API-Key` header for protected calls.

## Plan Matrix

| Plan | Monthly requests | Historical window | Burst limit |
|------|------------------|-------------------|-------------|
| Free | 250/month | 1-30 days | 100 req/min |
| Hobby | 250,000/month | 1-90 days | 1000 req/min |
| Professional | 2,500,000/month | 1-365 days | 1000 req/min |

## Endpoint Access

Free and Hobby:

- platform health
- trending
- stock/token detail
- compare
- market sentiment
- search
- stats
- sector/country trend dimensions for stock platforms
- AI explain endpoints where exposed by the platform

Professional only:

- raw mention endpoints ending in `/mentions`
- `POST /sentiment/v1/analyze`

## Historical Windows

When the user has not specified a plan, prefer conservative windows:

- use `days <= 30` for Free-safe answers
- ask before using a longer window
- use `--plan hobby` for windows up to 90 days
- use `--plan professional` for windows up to 365 days or raw evidence

The CLI validates `--days` against `--plan` when a plan is provided.

## Quota Headers

Successful protected GET responses may include:

- `X-RateLimit-Limit-Monthly`
- `X-RateLimit-Remaining-Monthly`
- `X-RateLimit-Used-Monthly`
- `X-RateLimit-Reset-Monthly`
- `X-RateLimit-Limit-Burst`
- `X-RateLimit-Remaining-Burst`
- `X-RateLimit-Reset-Burst`
- `X-Account-Type`

When a user is near quota exhaustion, prefer fewer broader calls:

- compare endpoint instead of many detail calls
- trending endpoint with a larger `limit` instead of repeated pages
- raw mentions only when evidence rows are specifically needed

