import { readFileSync } from "node:fs";
import { runInContext } from "node:vm";
import { JSDOM } from "jsdom";
import { IDBFactory } from "fake-indexeddb";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
// The app is a list of plain script files loaded in order by index.html; run the same list here.
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => readFileSync(new URL("../" + m[1], import.meta.url), "utf8"));
export function app() {
  const dom = new JSDOM('<div id="app"></div>', { url: "http://localhost:8787", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  w.eval = code => runInContext(code, dom.getInternalVMContext());
  w.structuredClone = structuredClone;
  w.indexedDB = new IDBFactory();
  w.Blob = Blob;
  w.URL.createObjectURL = () => "blob:" + Math.random();
  w.URL.revokeObjectURL = () => {};
  w.matchMedia = () => ({ matches: true });
  w.scrollTo = () => {};
  w.eval(readFileSync(new URL("../questions.js", import.meta.url), "utf8"));
  w.eval(readFileSync(new URL("../engines.js", import.meta.url), "utf8"));
  let error;
  try { for (const script of scripts) w.eval(script); } catch (e) { error = e; }
  const ready = w.eval("loadClips()");
  return { w, error, ready, close: () => ready.then(() => w.close()) };
}

