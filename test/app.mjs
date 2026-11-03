import { readFileSync } from "node:fs";
import { runInContext } from "node:vm";
import { JSDOM } from "jsdom";
import { IDBFactory } from "fake-indexeddb";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
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
  try { w.eval(script); } catch (e) { error = e; }
  const ready = w.eval("loadClips()");
  return { w, error, ready, close: () => ready.then(() => w.close()) };
}

