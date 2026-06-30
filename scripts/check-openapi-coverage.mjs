#!/usr/bin/env node

import { buildPath } from "../skills/adanos-market-sentiment/scripts/adanos.mjs";

const OPENAPI_URL = process.env.ADANOS_OPENAPI_URL || "https://api.adanos.org/openapi.json";

const stockPlatforms = ["reddit", "x", "news", "polymarket"];
const allPlatforms = [...stockPlatforms, "crypto"];

function toTemplate(path) {
  return path.replace(/\/stock\/[^/?]+/g, "/stock/{ticker}").replace(/\/token\/[^/?]+/g, "/token/{symbol}");
}

function opKey(spec) {
  return `${spec.method.toUpperCase()} ${toTemplate(spec.path)}`;
}

function addCommand(covered, command, opts) {
  covered.add(opKey(buildPath(command, opts)));
}

function buildCommandCoverage() {
  const covered = new Set();

  addCommand(covered, "health", {});
  addCommand(covered, "analyze", { text: "NVDA guidance looks bullish" });

  for (const platform of allPlatforms) {
    const assetOpts = platform === "crypto" ? { platform, symbol: "BTC" } : { platform, ticker: "TSLA" };
    const compareOpts = platform === "crypto" ? { platform, symbols: "BTC,ETH" } : { platform, tickers: "TSLA,NVDA" };

    addCommand(covered, "platform-health", { platform });
    addCommand(covered, "trending", { platform, days: "7", limit: "5" });
    addCommand(covered, "asset", assetOpts);
    addCommand(covered, "market-sentiment", { platform, days: "7" });
    addCommand(covered, "compare", compareOpts);
    addCommand(covered, "search", { platform, q: platform === "crypto" ? "bitcoin" : "tesla" });
    addCommand(covered, "stats", { platform });
    addCommand(covered, "mentions", assetOpts);
  }

  for (const platform of stockPlatforms) {
    addCommand(covered, "trending-sectors", { platform, days: "7" });
    addCommand(covered, "trending-countries", { platform, days: "7" });
  }

  for (const platform of ["reddit", "x", "news"]) {
    addCommand(covered, "explain", { platform, ticker: "TSLA" });
  }

  return covered;
}

function isSupportedPath(path) {
  return (
    path === "/health" ||
    path === "/sentiment/v1/analyze" ||
    path.startsWith("/reddit/stocks/v1/") ||
    path.startsWith("/reddit/crypto/v1/") ||
    path.startsWith("/x/stocks/v1/") ||
    path.startsWith("/polymarket/stocks/v1/") ||
    path.startsWith("/news/stocks/v1/")
  );
}

async function main() {
  const response = await fetch(OPENAPI_URL);
  if (!response.ok) throw new Error(`Failed to fetch OpenAPI spec: HTTP ${response.status}`);
  const spec = await response.json();

  const apiOps = new Set();
  for (const [path, operations] of Object.entries(spec.paths || {})) {
    if (!isSupportedPath(path)) continue;
    for (const method of Object.keys(operations)) {
      apiOps.add(`${method.toUpperCase()} ${path}`);
    }
  }

  const commandOps = buildCommandCoverage();
  const missing = [...apiOps].filter((key) => !commandOps.has(key)).sort();
  const stale = [...commandOps].filter((key) => !apiOps.has(key)).sort();

  console.log(`OpenAPI version: ${spec.info?.version || "unknown"}`);
  console.log(`OpenAPI operations checked: ${apiOps.size}`);
  console.log(`Structured command operations covered: ${commandOps.size}`);

  if (missing.length || stale.length) {
    if (missing.length) {
      console.error("\nMissing structured command coverage:");
      for (const key of missing) console.error(`- ${key}`);
    }
    if (stale.length) {
      console.error("\nStructured command targets not present in OpenAPI:");
      for (const key of stale) console.error(`- ${key}`);
    }
    process.exit(1);
  }

  console.log("OpenAPI coverage: complete");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
