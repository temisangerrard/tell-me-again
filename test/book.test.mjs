import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { app } from "./app.mjs";

async function withApp(fn) { const a = app(); try { await a.ready; await fn(a.w, a.w.document); } finally { await a.close(); } }
const mount = (w, d, wide) => { w.matchMedia = () => ({ matches: wide }); d.querySelectorAll(".bookblk, .tb").forEach((n) => n.remove()); /* one #sample-book per page, as in the real thing */ const box = d.createElement("div"); box.className = "tb"; box.innerHTML = '<div id="sample-book"></div>'; d.body.append(box); const stop = w.wireBook(box); return { box, host: box.querySelector("#sample-book"), stop }; };

test("the sample book is on the landing page: a cover, spreads and a back cover", () => withApp((w, d) => {
  assert.ok(d.querySelector(".bookblk #sample-book"), "the block is on the page");
  assert.ok(d.querySelector("#sample-book .pg.cv"), "it opens on the cover");
  assert.equal(d.querySelectorAll("#sample-book .bkdots button").length, 7, "a cover, five spreads and a back cover on a wide screen");
  assert.match(d.querySelector("#sample-book .cv h3").textContent, /Sunday at Grandma Folake/);
  assert.match(d.querySelector(".bookblk").textContent, /made-up family/i, "it says plainly that the family is fictional");
}));

test("turning pages on a wide screen shows two-page spreads; on a phone one page at a time", () => withApp((w, d) => {
  const wide = mount(w, d, true); wide.host.querySelector(".bk-next").click();
  assert.equal(wide.host.querySelectorAll(".pg").length, 2, "a spread");
  assert.ok(wide.host.querySelector(".pg.l.ded") && wide.host.querySelector(".pg.r.toc"), "the dedication faces the contents");
  wide.host.querySelector(".bk-next").click(); assert.ok(wide.host.querySelector(".pg.l.opener") && wide.host.querySelector(".pg.r.story"));
  wide.host.querySelector(".bk-prev").click(); assert.ok(wide.host.querySelector(".pg.toc"), "back one spread");
  const last = wide.host.querySelectorAll(".bkdots button").length - 1; wide.host.querySelectorAll(".bkdots button")[last].click();
  assert.ok(wide.host.querySelector(".pg.bc") && wide.host.querySelector(".bk-next").disabled, "the back cover is the end");
  assert.equal(wide.host.querySelector(".bk-prev").disabled, false);
  wide.stop();
  const narrow = mount(w, d, false);
  assert.equal(narrow.host.querySelectorAll(".bkdots button").length, 12, "twelve single pages on a phone");
  narrow.host.querySelector(".bk-next").click(); assert.equal(narrow.host.querySelectorAll(".pg").length, 1); assert.ok(narrow.host.querySelector(".pg.ded"));
  narrow.stop();
}));

test("the book's closing button starts the family, and touching the book stops it turning by itself", () => withApp(async (w, d) => {
  let clicked = 0; const go = d.getElementById("go2"); go.addEventListener("click", () => clicked++);
  const b = mount(w, d, true); const last = b.host.querySelectorAll(".bkdots button").length - 1; b.host.querySelectorAll(".bkdots button")[last].click();
  b.host.querySelector("#go3").click(); assert.equal(clicked, 1, "it uses the same start as the landing button");
  b.host.querySelectorAll(".bkdots button")[0].click(); b.host.__run(true);
  await new Promise((r) => setTimeout(r, 200)); const at = b.host.querySelector(".pg.cv") ? "cover" : "turned"; assert.equal(at, "cover", "a hand on the book means no autoplay");
  b.stop();
}));

test("every portrait and icon in the book is a real file, and the book's styles are all scoped so the app's own classes can't reach in", () => withApp((w, d) => {
  const js = readFileSync(new URL("../js/book.js", import.meta.url), "utf8");
  for (const f of new Set([...js.matchAll(/art\/(?:icons|characters)\/[a-z-]+\.(?:svg|webp)/g)].map((m) => m[0]))) assert.ok(existsSync(new URL("../" + f, import.meta.url)), f);
  for (const k of ["gran", "dad", "aunty", "mum", "kid"]) assert.ok(existsSync(new URL(`../art/characters/${k}-still.webp`, import.meta.url)), `${k} still`);
  // Four layout bugs in this book came from a class name the rest of the app also uses (.sheet, .op, .rec, .tree). Every rule here must be scoped.
  const css = readFileSync(new URL("../css/book.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const flat = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").replace(/@media[^{]+\{/g, "").replace(/\}\s*\}/g, "}");
  const loose = [...flat.matchAll(/([^{}]+)\{[^{}]*\}/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()).filter(Boolean)).filter((s) => !/^(\.leaves|\.bookblk|\.book\b|\.bkstage|\.pgw|\.bkbar|\.bkdots|\.bookfacts)/.test(s));
  assert.deepEqual(loose, [], "unscoped selectors: " + loose.join(" | "));
}));
