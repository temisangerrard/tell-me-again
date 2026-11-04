import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = (p) => new URL("../" + p, import.meta.url);

test("the manifest's icons all exist, with a maskable one for Android", () => {
  const m = JSON.parse(readFileSync(root("manifest.json"), "utf8"));
  assert.ok(m.icons.length >= 3);
  for (const i of m.icons) assert.ok(existsSync(root(i.src)), `${i.src} exists`);
  assert.ok(m.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"), "a 512 maskable icon");
  assert.ok(m.icons.some((i) => i.sizes === "192x192"), "a 192 icon");
});

test("the page links the favicon and the home-screen icon, and they exist", () => {
  const html = readFileSync(root("index.html"), "utf8");
  for (const href of ["art/icons/favicon.svg", "art/icons/favicon-32.png", "art/icons/apple-touch-icon.png"]) {
    assert.ok(html.includes(`href="${href}"`), `${href} is linked`); assert.ok(existsSync(root(href)), `${href} exists`);
  }
});

test("the emblem is drawn in the app's five colours, and the icon family is generated from one script", () => {
  const svg = readFileSync(root("art/icons/emblem.svg"), "utf8");
  for (const c of ["#7c5ad6", "#e26b3f", "#f0b232", "#6db56d", "#2fa8a0"]) assert.ok(svg.includes(c), `${c} is in the emblem`);
  assert.ok(existsSync(root("tools/icons/build.py")));
});
