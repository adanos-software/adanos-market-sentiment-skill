import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPath, buildUrl, parseArgs, requestedWindowDays, validatePlan } from "../scripts/adanos.mjs";

test("builds stock trending endpoint with query params", () => {
  const spec = buildPath("trending", { platform: "reddit", from: "2026-07-01", to: "2026-07-07", limit: "5", type: "stock" });
  assert.equal(spec.method, "GET");
  assert.equal(spec.path, "/reddit/stocks/v1/trending");
  assert.equal(spec.params.get("from"), "2026-07-01");
  assert.equal(spec.params.get("to"), "2026-07-07");
  assert.equal(spec.params.get("limit"), "5");
  assert.equal(spec.params.get("type"), "stock");
});

test("builds crypto token detail endpoint", () => {
  const spec = buildPath("asset", { platform: "crypto", symbol: "btc", from: "2026-07-01", to: "2026-07-03" });
  assert.equal(spec.path, "/reddit/crypto/v1/token/BTC");
  assert.equal(spec.params.get("from"), "2026-07-01");
  assert.equal(spec.params.get("to"), "2026-07-03");
});

test("builds stock comparison endpoint", () => {
  const spec = buildPath("compare", { platform: "news", tickers: "tsla,nvda", days: "30" });
  assert.equal(spec.path, "/news/stocks/v1/compare");
  assert.equal(spec.params.get("tickers"), "TSLA,NVDA");
});

test("marks raw mentions as professional only", () => {
  const spec = buildPath("mentions", { platform: "x", ticker: "nvda", days: "7" });
  assert.equal(spec.path, "/x/stocks/v1/stock/NVDA/mentions");
  assert.equal(spec.professionalOnly, true);
});

test("keeps source filters scoped to news endpoints", () => {
  const news = buildPath("trending-sectors", { platform: "news", source: "reuters", days: "14" });
  assert.equal(news.params.get("source"), "reuters");

  const reddit = buildPath("trending-sectors", { platform: "reddit", source: "reuters", days: "14" });
  assert.equal(reddit.params.has("source"), false);
});

test("keeps include_inherited scoped to Reddit mention endpoints", () => {
  const reddit = buildPath("mentions", { platform: "reddit", ticker: "tsla", include_inherited: "true" });
  assert.equal(reddit.params.get("include_inherited"), "true");

  const crypto = buildPath("mentions", { platform: "crypto", symbol: "btc", includeInherited: "false" });
  assert.equal(crypto.params.get("include_inherited"), "false");

  assert.throws(
    () => buildPath("mentions", { platform: "x", ticker: "nvda", include_inherited: "true" }),
    /supported only for Reddit stock and crypto mentions/
  );
});

test("marks text sentiment as professional only", () => {
  const spec = buildPath("analyze", { text: "Bullish setup" });
  assert.equal(spec.method, "POST");
  assert.equal(spec.path, "/sentiment/v1/analyze");
  assert.deepEqual(spec.body, { text: "Bullish setup" });
  assert.equal(spec.professionalOnly, true);
});

test("validates text sentiment length", () => {
  assert.throws(() => buildPath("analyze", { text: "" }), /Missing required --text/);
  assert.throws(() => buildPath("analyze", { text: "x".repeat(2049) }), /2048 characters or fewer/);
});

test("validates plan historical windows", () => {
  const now = new Date("2026-08-09T12:00:00Z");
  assert.doesNotThrow(() => validatePlan({ plan: "free", from: "2026-07-11", to: "2026-08-09" }, false, now));
  assert.throws(() => validatePlan({ plan: "free", from: "2026-07-10", to: "2026-08-09" }, false, now), /supports up to 30/);
  assert.doesNotThrow(() => validatePlan({ plan: "hobby", from: "2026-05-12", to: "2026-08-09" }, false, now));
  assert.throws(() => validatePlan({ plan: "hobby", from: "2026-05-11", to: "2026-08-09" }, false, now), /supports up to 90/);
  assert.doesNotThrow(() => validatePlan({ plan: "professional", from: "2025-08-10", to: "2026-08-09" }, false, now));
});

test("validates plan historical reach and future dates", () => {
  const now = new Date("2026-08-09T12:00:00Z");
  assert.throws(
    () => validatePlan({ plan: "free", from: "2020-01-01", to: "2020-01-01" }, false, now),
    /historical data starts at 2026-07-11/
  );
  assert.throws(
    () => validatePlan({ plan: "free", from: "2026-08-09", to: "2026-08-10" }, false, now),
    /current UTC date/
  );
});

test("validates explicit UTC dates before plan lookup", () => {
  assert.equal(requestedWindowDays({ from: "2026-07-01", to: "2026-07-07" }), 7);
  assert.throws(() => validatePlan({ from: "2026-02-30", to: "2026-03-01" }), /valid UTC calendar date/);
  assert.throws(() => validatePlan({ from: "2026-07-02", to: "2026-07-01" }), /must not be later/);
  assert.throws(() => validatePlan({ from: "2026-07-01" }), /provided together/);
  assert.throws(() => validatePlan({ days: "7", from: "2026-07-01", to: "2026-07-07" }), /not both/);
  assert.throws(() => validatePlan({ days: "1.5" }), /positive integer/);
});

test("blocks professional-only endpoints for free and hobby", () => {
  assert.throws(() => validatePlan({ plan: "free" }, true), /requires --plan professional/);
  assert.throws(() => validatePlan({ plan: "hobby" }, true), /requires --plan professional/);
  assert.doesNotThrow(() => validatePlan({ plan: "professional" }, true));
});

test("builds generic request endpoint with repeated query params", () => {
  const { command, opts } = parseArgs([
    "request",
    "GET",
    "/reddit/stocks/v1/trending",
    "--query",
    "from=2026-07-01",
    "--query",
    "to=2026-07-07",
    "--query",
    "limit=5",
  ]);
  const spec = buildPath(command, opts);
  assert.equal(spec.path, "/reddit/stocks/v1/trending");
  assert.equal(spec.params.get("from"), "2026-07-01");
  assert.equal(spec.params.get("to"), "2026-07-07");
  assert.equal(spec.params.get("limit"), "5");
});

test("marks generic professional-only paths", () => {
  const mentions = buildPath("request", { _: ["GET", "/reddit/stocks/v1/stock/TSLA/mentions"] });
  assert.equal(mentions.professionalOnly, true);
  const analyze = buildPath("request", { _: ["POST", "/sentiment/v1/analyze"], "body-json": '{"text":"bullish"}' });
  assert.equal(analyze.professionalOnly, true);
});

test("buildUrl joins base path and params", () => {
  const spec = buildPath("search", { platform: "crypto", q: "bitcoin", limit: "3" });
  const url = buildUrl(spec.path, spec.params);
  assert.equal(url.toString(), "https://api.adanos.org/reddit/crypto/v1/search?q=bitcoin&limit=3");
});

test("buildUrl rejects absolute and scheme-relative URLs", () => {
  assert.throws(() => buildUrl("https://attacker.example/capture", new URLSearchParams()), /relative Adanos API path/);
  assert.throws(() => buildUrl("//attacker.example/capture", new URLSearchParams()), /relative Adanos API path/);
  assert.throws(() => buildUrl("reddit/stocks/v1/trending", new URLSearchParams()), /relative Adanos API path/);
});
