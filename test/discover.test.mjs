import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("llms.txt says what the product is, plainly and truthfully, and points at real pages", () => {
  const t = read("llms.txt");
  assert.match(t, /^# Tell Me Again/); assert.match(t, /^> /m, "a one-paragraph summary"); assert.match(t, /https:\/\/tellagain\.app/);
  for (const h of ["## What it does", "## Who it is for", "## Privacy", "## Cost and platform", "## Pages", "## About"]) assert.ok(t.includes(h), h);
  assert.ok(!/[—–]/.test(t), "no dashes"); assert.ok(!/\bmotto\b/i.test(t));
  assert.match(t, /Audio is not stored on our servers/); assert.match(t, /planned/, "unbuilt things are marked as planned");
  for (const [, url] of t.matchAll(/\]\((https:\/\/tellagain\.app[^)]*)\)/g)) { const path = new URL(url).pathname; const file = path === "/" ? "index.html" : path.replace(/^\//, "") + (path.includes(".") ? "" : ".html"); assert.ok(existsSync(new URL("../" + file, import.meta.url)), `${url} exists`); }
});

test("robots.txt and sitemap.xml point crawlers to the right places, and keep them out of the API", () => {
  const r = read("robots.txt"); assert.match(r, /Disallow: \/api\//); assert.match(r, /Sitemap: https:\/\/tellagain\.app\/sitemap\.xml/);
  const m = read("sitemap.xml"); assert.match(m, /<loc>https:\/\/tellagain\.app\/<\/loc>/); assert.match(m, /<loc>https:\/\/tellagain\.app\/building<\/loc>/);
});

test("the home page carries a description, share card, structured data and a no-JavaScript summary", () => {
  const h = read("index.html");
  assert.match(h, /<meta name="description" content="[^"]{80,200}">/); assert.match(h, /<link rel="canonical" href="https:\/\/tellagain\.app\/">/);
  assert.match(h, /og:image" content="https:\/\/tellagain\.app\/art\/og\.png"/); assert.ok(existsSync(new URL("../art/og.png", import.meta.url)));
  const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]); assert.equal(ld["@type"], "WebApplication"); assert.equal(ld.offers.price, "0");
  assert.match(h, /<noscript>[\s\S]*Tell Me Again is a free web app/);
  assert.ok(!/aggregateRating|review/i.test(JSON.stringify(ld)), "no invented ratings");
});
