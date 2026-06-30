#!/usr/bin/env node

const BASE_URL = process.env.ADANOS_BASE_URL || "https://api.adanos.org";

const STOCK_BASES = {
  reddit: "/reddit/stocks/v1",
  x: "/x/stocks/v1",
  news: "/news/stocks/v1",
  polymarket: "/polymarket/stocks/v1",
};

const PLATFORM_BASES = {
  ...STOCK_BASES,
  crypto: "/reddit/crypto/v1",
};

const PLAN_LIMITS = {
  free: { maxDays: 30, professional: false },
  hobby: { maxDays: 90, professional: false },
  professional: { maxDays: 365, professional: true },
};

const RATE_LIMIT_HEADERS = [
  "x-ratelimit-limit-monthly",
  "x-ratelimit-remaining-monthly",
  "x-ratelimit-used-monthly",
  "x-ratelimit-reset-monthly",
  "x-ratelimit-limit-burst",
  "x-ratelimit-remaining-burst",
  "x-ratelimit-reset-burst",
  "x-account-type",
  "cache-control",
];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = { _: [] };
  const setOpt = (key, value) => {
    if (opts[key] === undefined) {
      opts[key] = value;
    } else if (Array.isArray(opts[key])) {
      opts[key].push(value);
    } else {
      opts[key] = [opts[key], value];
    }
  };

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith("--")) {
      opts._.push(arg);
      continue;
    }

    const eq = arg.indexOf("=");
    if (eq !== -1) {
      setOpt(arg.slice(2, eq), arg.slice(eq + 1));
      continue;
    }

    const key = arg.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) {
      setOpt(key, true);
    } else {
      setOpt(key, next);
      i++;
    }
  }

  return { command, opts };
}

function requireOption(opts, key) {
  const value = opts[key];
  if (value === undefined || value === true || value === "") {
    throw new Error(`Missing required --${key}`);
  }
  return String(value);
}

function normalizePlatform(platform) {
  const value = String(platform || "").toLowerCase();
  if (!PLATFORM_BASES[value]) {
    throw new Error(
      `Unsupported --platform "${platform}". Use one of: ${Object.keys(PLATFORM_BASES).join(", ")}`
    );
  }
  return value;
}

function assertStockPlatform(platform, command) {
  if (!STOCK_BASES[platform]) {
    throw new Error(`${command} supports stock platforms only: reddit, x, news, polymarket`);
  }
}

function appendWindowParams(params, opts) {
  for (const key of ["days", "from", "to", "limit", "offset", "type", "source"]) {
    if (opts[key] !== undefined && opts[key] !== true) params.set(key, String(opts[key]));
  }
  if (opts.include_inherited !== undefined) {
    params.set("include_inherited", String(opts.include_inherited));
  }
  if (opts.includeInherited !== undefined) {
    params.set("include_inherited", String(opts.includeInherited));
  }
}

function validatePlan(opts, professionalOnly = false) {
  const rawPlan = opts.plan ? String(opts.plan).toLowerCase() : undefined;
  if (!rawPlan) return;
  const plan = PLAN_LIMITS[rawPlan];
  if (!plan) {
    throw new Error(`Unsupported --plan "${opts.plan}". Use free, hobby, or professional.`);
  }
  if (professionalOnly && !plan.professional) {
    throw new Error(`This endpoint requires --plan professional. ${rawPlan} cannot access it.`);
  }
  if (opts.days !== undefined) {
    const days = Number(opts.days);
    if (!Number.isFinite(days) || days < 1) throw new Error("--days must be a positive number.");
    if (days > plan.maxDays) {
      throw new Error(`${rawPlan} plan supports up to ${plan.maxDays} historical days; requested ${days}.`);
    }
  }
}

function buildPath(command, opts) {
  const params = new URLSearchParams();

  switch (command) {
    case "health":
      return { method: "GET", path: "/health", params };

    case "platform-health": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/health`, params };
    }

    case "trending": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      appendWindowParams(params, opts);
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/trending`, params };
    }

    case "trending-sectors":
    case "trending-countries": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      assertStockPlatform(platform, command);
      appendWindowParams(params, opts);
      const dimension = command === "trending-sectors" ? "sectors" : "countries";
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/trending/${dimension}`, params };
    }

    case "asset": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      appendWindowParams(params, opts);
      if (platform === "crypto") {
        return { method: "GET", path: `${PLATFORM_BASES[platform]}/token/${encodeURIComponent(requireOption(opts, "symbol").toUpperCase())}`, params };
      }
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/stock/${encodeURIComponent(requireOption(opts, "ticker").toUpperCase())}`, params };
    }

    case "mentions": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      appendWindowParams(params, opts);
      if (platform === "crypto") {
        return { method: "GET", path: `${PLATFORM_BASES[platform]}/token/${encodeURIComponent(requireOption(opts, "symbol").toUpperCase())}/mentions`, params, professionalOnly: true };
      }
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/stock/${encodeURIComponent(requireOption(opts, "ticker").toUpperCase())}/mentions`, params, professionalOnly: true };
    }

    case "compare": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      appendWindowParams(params, opts);
      if (platform === "crypto") {
        params.set("symbols", requireOption(opts, "symbols").toUpperCase());
      } else {
        params.set("tickers", requireOption(opts, "tickers").toUpperCase());
      }
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/compare`, params };
    }

    case "market-sentiment": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      appendWindowParams(params, opts);
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/market-sentiment`, params };
    }

    case "search": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      params.set("q", requireOption(opts, "q"));
      if (opts.limit !== undefined) params.set("limit", String(opts.limit));
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/search`, params };
    }

    case "stats": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/stats`, params };
    }

    case "explain": {
      const platform = normalizePlatform(requireOption(opts, "platform"));
      if (!["reddit", "x", "news"].includes(platform)) {
        throw new Error("explain supports reddit, x, and news stock platforms.");
      }
      return { method: "GET", path: `${PLATFORM_BASES[platform]}/stock/${encodeURIComponent(requireOption(opts, "ticker").toUpperCase())}/explain`, params };
    }

    case "analyze":
      return {
        method: "POST",
        path: "/sentiment/v1/analyze",
        params,
        professionalOnly: true,
        body: { text: requireOption(opts, "text") },
      };

    case "request": {
      const [method, rawPath] = opts._;
      if (!method || !rawPath) throw new Error("Usage: request GET /path --query key=value");
      for (const q of [].concat(opts.query || [])) {
        if (q === true) continue;
        const eq = String(q).indexOf("=");
        if (eq === -1) throw new Error(`Invalid --query "${q}". Use key=value.`);
        params.append(String(q).slice(0, eq), String(q).slice(eq + 1));
      }
      const body = opts["body-json"] ? JSON.parse(String(opts["body-json"])) : undefined;
      const path = String(rawPath);
      return {
        method: String(method).toUpperCase(),
        path,
        params,
        body,
        professionalOnly: path.includes("/mentions") || path === "/sentiment/v1/analyze",
      };
    }

    default:
      throw new Error(`Unknown command "${command || ""}". Run with --help for examples.`);
  }
}

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of params.entries()) url.searchParams.append(key, value);
  return url;
}

function authHeaders(path, method) {
  const headers = { Accept: "application/json" };
  if (method !== "GET") headers["Content-Type"] = "application/json";
  if (path !== "/health" && process.env.ADANOS_API_KEY) {
    headers["X-API-Key"] = process.env.ADANOS_API_KEY;
  }
  return headers;
}

function extractHeaders(headers) {
  const result = {};
  for (const key of RATE_LIMIT_HEADERS) {
    const value = headers.get(key);
    if (value !== null) result[key] = value;
  }
  return result;
}

async function request(spec) {
  validatePlan(spec.opts || {}, spec.professionalOnly);
  const url = buildUrl(spec.path, spec.params);
  const res = await fetch(url, {
    method: spec.method,
    headers: authHeaders(spec.path, spec.method),
    body: spec.body ? JSON.stringify(spec.body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { body: text };
  }
  if (!res.ok) {
    const err = new Error(`Adanos API request failed: HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    err.headers = extractHeaders(res.headers);
    throw err;
  }
  return { ...data, _headers: extractHeaders(res.headers) };
}

function help() {
  return `Adanos Market Sentiment CLI

Usage:
  adanos.mjs health
  adanos.mjs platform-health --platform reddit
  adanos.mjs trending --platform reddit|x|news|polymarket|crypto [--days 7] [--limit 10]
  adanos.mjs trending-sectors --platform reddit|x|news|polymarket
  adanos.mjs trending-countries --platform reddit|x|news|polymarket
  adanos.mjs asset --platform reddit|x|news|polymarket --ticker TSLA [--days 30]
  adanos.mjs asset --platform crypto --symbol BTC [--days 7]
  adanos.mjs compare --platform reddit|x|news|polymarket --tickers TSLA,NVDA
  adanos.mjs compare --platform crypto --symbols BTC,ETH
  adanos.mjs market-sentiment --platform news [--days 30]
  adanos.mjs search --platform reddit --q tesla [--limit 10]
  adanos.mjs stats --platform polymarket
  adanos.mjs explain --platform reddit|x|news --ticker TSLA
  adanos.mjs mentions --platform x --ticker NVDA --plan professional
  adanos.mjs analyze --text "NVDA guidance looks bullish" --plan professional
  adanos.mjs request GET /reddit/stocks/v1/trending --query days=7 --query limit=5

Plans:
  --plan free          validates days <= 30 and blocks Professional-only endpoints
  --plan hobby         validates days <= 90 and blocks Professional-only endpoints
  --plan professional  validates days <= 365 and allows raw mentions/text sentiment
`;
}

async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    console.log(help());
    return;
  }
  const { command, opts } = parseArgs(argv);
  const spec = buildPath(command, opts);
  spec.opts = opts;
  const data = await request(spec);
  console.log(JSON.stringify(data, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const payload = {
      error: error.message,
      status: error.status,
      data: error.data,
      headers: error.headers,
    };
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  });
}

export {
  BASE_URL,
  PLATFORM_BASES,
  PLAN_LIMITS,
  appendWindowParams,
  buildPath,
  buildUrl,
  parseArgs,
  validatePlan,
};
