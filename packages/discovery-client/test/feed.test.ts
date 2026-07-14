import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFeedPrice, fetchFeedValue, parseJsonPointer, readJsonPointer } from "../src/feed.ts";
import { mockFetch } from "./helpers.ts";

const PRICE_FIELD = { type: "json", price_path: "/price" } as const;
const COINGECKO_BTC_USD = { type: "json", price_path: "/bitcoin/usd" } as const;

test("parseJsonPointer: decodes RFC 6901 escaped tokens", () => {
  assert.deepEqual(parseJsonPointer("/a~1b/c~0d"), ["a/b", "c~d"]);
});

test("readJsonPointer: reads object fields and array indexes", () => {
  const body = { prices: [{ value: "65000" }] };
  assert.equal(readJsonPointer(body, "/prices/0/value"), "65000");
});

test("extractFeedPrice: reads named price fields by declared path", () => {
  assert.equal(extractFeedPrice({ symbol: "BTCUSDT", price: "65000.12" }, PRICE_FIELD), "65000.12");
});

test("extractFeedPrice: reads CoinGecko simple price responses", () => {
  assert.equal(extractFeedPrice({ bitcoin: { usd: 64455 } }, COINGECKO_BTC_USD), 64455);
});

test("extractFeedPrice: rejects missing and non-numeric paths", () => {
  assert.throws(() => extractFeedPrice({ bitcoin: { usd: "n/a" } }, COINGECKO_BTC_USD), /numeric/);
  assert.throws(() => extractFeedPrice({ bitcoin: { eur: 55200 } }, COINGECKO_BTC_USD), /not found/);
});

test("fetchFeedValue: uses the market feed schema for JSON feeds", async () => {
  const feed = "https://api.example.test/price";
  const value = await fetchFeedValue(feed, COINGECKO_BTC_USD, {
    fetchImpl: mockFetch({
      [feed]: { body: JSON.stringify({ bitcoin: { usd: 64455 } }) },
    }),
  });
  assert.equal(value, 64455);
});
