"use strict";
// Avatar maker. An avatar is a small config; it is drawn by stacking the white clay layers in art/avatar/ on a canvas and tinting
// skin, hair and shirt with a multiply fill. Nothing is sent anywhere: the config is stored with the person (S.me.av, person.av).
const AV = {
  skin:  [["#5c3a21", "Deep"], ["#8d5a3b", "Brown"], ["#c68642", "Tan"], ["#e0ac69", "Sand"], ["#f1c27d", "Light"], ["#f6dcc3", "Fair"]],
  hair:  [["#1d1d1f", "Black"], ["#2b1a12", "Dark brown"], ["#7a4a2a", "Brown"], ["#f0b232", "Honey"], ["#d8d3ca", "Grey"], ["#e26b3f", "Coral"], ["#7c5ad6", "Violet"], ["#2fa8a0", "Teal"]],
  shirt: [["#e26b3f", "Coral"], ["#f0b232", "Honey"], ["#6db56d", "Leaf"], ["#2fa8a0", "Teal"], ["#5aa9e6", "Sky"], ["#7c5ad6", "Violet"], ["#1d1d1f", "Ink"], ["#f4f1ea", "Cream"]],
  bg:    [["#fdebd8", "Peach"], ["#fbe6a6", "Sun"], ["#d6efd6", "Mint"], ["#cdeeea", "Aqua"], ["#d3e8fa", "Sky"], ["#e5dcf8", "Lilac"], ["#e8e6e1", "Stone"]],
  style: [["puff", "Curls"], ["afro", "Afro"], ["short", "Short"], ["bun", "Bun"], ["long", "Long"], ["wrap", "Head wrap"], ["locs", "Locs"], ["none", "Bald"]],
  extra: [["glasses", "Glasses"], ["shades", "Sunglasses"], ["earrings", "Earrings"], ["beard", "Beard"]]
};
const avDefault = () => ({ skin: AV.skin[1][0], hair: AV.hair[0][0], shirt: AV.shirt[3][0], bg: AV.bg[0][0], style: "puff", extra: [] });
const avPick = (a) => a[Math.floor(Math.random() * a.length)][0];
const avRandom = () => ({ skin: avPick(AV.skin), hair: avPick(AV.hair), shirt: avPick(AV.shirt), bg: avPick(AV.bg), style: avPick(AV.style), extra: AV.extra.filter(() => Math.random() < 0.25).map((x) => x[0]) });
const avClean = (c) => { // whatever is saved, make it safe to draw
  const d = avDefault(), has = (list, v) => list.some((x) => x[0] === v);
  c = c && typeof c === "object" ? c : {};
  return { skin: has(AV.skin, c.skin) ? c.skin : d.skin, hair: has(AV.hair, c.hair) ? c.hair : d.hair, shirt: has(AV.shirt, c.shirt) ? c.shirt : d.shirt, bg: has(AV.bg, c.bg) ? c.bg : d.bg,
    style: has(AV.style, c.style) ? c.style : d.style, extra: Array.isArray(c.extra) ? c.extra.filter((x) => has(AV.extra, x)) : [] };
};
const avLayers = (c) => [["shirt", c.shirt], ["skin", c.skin], ...(c.extra.includes("beard") ? [["beard", c.hair]] : []), ["face"], ...(c.style === "none" ? [] : [["hair-" + c.style, c.hair]]),
  ...["glasses", "shades", "earrings"].filter((x) => c.extra.includes(x)).map((x) => [x])];

const avImgs = {};
const avLoad = (name) => avImgs[name] ||= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = `art/avatar/${name}.webp`; });
async function avDraw(canvas, cfg) {
  let ctx; try { ctx = canvas.getContext && canvas.getContext("2d"); } catch { ctx = null; }
  if (!ctx) return;
  const c = avClean(cfg), W = canvas.width, tmp = document.createElement("canvas"); tmp.width = tmp.height = W; const t = tmp.getContext("2d");
  const layers = avLayers(c), imgs = await Promise.all(layers.map(([n]) => avLoad(n)));
  if (canvas.dataset.key && canvas.dataset.key !== JSON.stringify(c)) return; // a newer draw owns this canvas
  ctx.clearRect(0, 0, W, W); ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, W);
  layers.forEach(([, tint], i) => {
    const img = imgs[i]; if (!img) return;
    if (!tint) { ctx.drawImage(img, 0, 0, W, W); return; }
    t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, W, W); t.drawImage(img, 0, 0, W, W);
    t.globalCompositeOperation = "multiply"; t.fillStyle = tint; t.fillRect(0, 0, W, W);
    t.globalCompositeOperation = "destination-in"; t.drawImage(img, 0, 0, W, W);
    ctx.drawImage(tmp, 0, 0);
  });
}
// A person's picture as HTML: their avatar if they made one, otherwise the letter circle. Call avPaint(root) after inserting it.
function avHTML(who, name, px = 40, cls = "") {
  if (!who || !who.av) return `<span class="av ${cls}" aria-hidden="true" style="--tint:${tintFor(name)}">${esc(initial(name))}</span>`;
  return `<canvas class="pic ${cls}" width="${px * 2}" height="${px * 2}" aria-hidden="true" data-av='${esc(JSON.stringify(avClean(who.av)))}' style="width:${px}px;height:${px}px"></canvas>`;
}
function avPaint(root) { root.querySelectorAll("canvas[data-av]").forEach((cv) => { let c; try { c = JSON.parse(cv.dataset.av); } catch { return; } cv.dataset.key = JSON.stringify(avClean(c)); avDraw(cv, c); }); }

// The maker. cfg is the object being edited (or null for "no avatar yet"); onChange(cfgOrNull) stores it.
function avatarEditor(parent, current, onChange) {
  let cfg = current ? avClean(current) : null;
  const w = $(`<div class="avmk"><div class="avtop"><canvas class="pic big" width="320" height="320" aria-label="Your avatar"></canvas><div class="avbtns"><button class="btn" type="button" data-a="rand">Surprise me</button><button class="btn ghost" type="button" data-a="clear">Use my initial</button></div></div><div class="avopts"></div></div>`);
  const cv = w.querySelector("canvas"), opts = w.querySelector(".avopts");
  const sw = (key, label, list) => { const f = $(`<div class="field"><span class="lbl">${label}</span><div class="swatches" role="group" aria-label="${label}"></div></div>`);
    list.forEach(([v, l]) => { const b = $(`<button class="sw" type="button" aria-label="${l}" title="${l}" style="background:${v}" data-k="${key}" data-v="${v}"></button>`); f.querySelector(".swatches").append(b); }); opts.append(f); };
  const chips = (key, label, list, multi) => { const f = $(`<div class="field"><span class="lbl">${label}</span><div class="chips" role="group" aria-label="${label}"></div></div>`);
    list.forEach(([v, l]) => { const b = $(`<button class="chip" type="button" data-k="${key}" data-v="${v}" aria-pressed="false">${l}</button>`); f.querySelector(".chips").append(b); }); opts.append(f); };
  chips("style", "Hair", AV.style); sw("hair", "Hair colour", AV.hair); sw("skin", "Skin", AV.skin); sw("shirt", "Shirt", AV.shirt); chips("extra", "Extras", AV.extra, true); sw("bg", "Background", AV.bg);
  const paint = () => {
    const c = cfg || avClean(null); cv.dataset.key = JSON.stringify(c); avDraw(cv, c);
    w.querySelectorAll("[data-k]").forEach((b) => { const k = b.dataset.k, v = b.dataset.v, on = k === "extra" ? c.extra.includes(v) : c[k] === v; b.setAttribute("aria-pressed", cfg ? on : false); });
    w.querySelector("[data-a=clear]").hidden = !cfg; opts.classList.toggle("dim", !cfg);
  };
  const set = (next) => { cfg = next ? avClean(next) : null; paint(); onChange(cfg); };
  opts.onclick = (e) => { const b = e.target.closest("[data-k]"); if (!b) return; const c = cfg ? { ...cfg } : avDefault(), k = b.dataset.k, v = b.dataset.v;
    if (k === "extra") c.extra = c.extra.includes(v) ? c.extra.filter((x) => x !== v) : [...c.extra, v]; else c[k] = v; set(c); };
  w.querySelector("[data-a=rand]").onclick = () => set(avRandom());
  w.querySelector("[data-a=clear]").onclick = () => set(null);
  paint(); parent.append(w); return w;
}
