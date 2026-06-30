import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPath, buildUrl, parseArgs, validatePlan } from "../scripts/adanos.mjs";

test("builds stock trending endpoint with query params", () => {
  const spec = buildPath("trending", { platform: "reddit", days: "7", limit: "5", type: "stock" });
  assert.equal(spec.method, "GET");
  assert.equal(spec.path, "/reddit/stocks/v1/trending");
  assert.equal(spec.params.get("days"), "7");
  assert.equal(spec.params.get("limit"), "5");
  assert.equal(spec.params.get("type"), "stock");
});

test("builds crypto token detail endpoint", () => {
  const spec = buildPath("asset", { platform: "crypto", symbol: "btc", days: "3" });
  assert.equal(spec.path, "/reddit/crypto/v1/token/BTC");
  assert.equal(spec.params.get("days"), "3");
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
  assert.doesNotThrow(() => validatePlan({ plan: "free", days: "30" }));
  assert.throws(() => validatePlan({ plan: "free", days: "31" }), /supports up to 30/);
  assert.doesNotThrow(() => validatePlan({ plan: "hobby", days: "90" }));
  assert.throws(() => validatePlan({ plan: "hobby", days: "91" }), /supports up to 90/);
  assert.doesNotThrow(() => validatePlan({ plan: "professional", days: "365" }));
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
    "days=7",
    "--query",
    "limit=5",
  ]);
  const spec = buildPath(command, opts);
  assert.equal(spec.path, "/reddit/stocks/v1/trending");
  assert.equal(spec.params.get("days"), "7");
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
