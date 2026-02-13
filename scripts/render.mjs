#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import rough from "roughjs";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, "..", "fonts");

const FONT_HAND = "Virgil, Segoe Print, Comic Sans MS, cursive";
const FONT_MONO = "Cascadia, Cascadia Code, monospace";
const STROKE = "#1e1e1e";
const LABEL_SIZE = 18;
const ROUGHNESS = 1.2;
const SEED = 42;

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shapeCenter(el) {
  if (el.type === "ellipse") return { x: el.x, y: el.y };
  if (el.type === "diamond") return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}

function shapeSideMidpoint(el, side) {
  const c = shapeCenter(el);
  if (el.type === "ellipse") {
    const rx = el.width / 2, ry = el.height / 2;
    switch (side) {
      case "top":    return { x: c.x, y: c.y - ry };
      case "bottom": return { x: c.x, y: c.y + ry };
      case "left":   return { x: c.x - rx, y: c.y };
      case "right":  return { x: c.x + rx, y: c.y };
    }
  }
  // rectangle or diamond bounding box
  const w = el.width || 0, h = el.height || 0;
  const x0 = el.type === "ellipse" ? el.x - el.width / 2 : el.x;
  const y0 = el.type === "ellipse" ? el.y - el.height / 2 : el.y;
  switch (side) {
    case "top":    return { x: x0 + w / 2, y: y0 };
    case "bottom": return { x: x0 + w / 2, y: y0 + h };
    case "left":   return { x: x0, y: y0 + h / 2 };
    case "right":  return { x: x0 + w, y: y0 + h / 2 };
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bestSides(from, to) {
  const sides = ["top", "bottom", "left", "right"];
  let best = null, bestDist = Infinity;
  for (const fs of sides) {
    for (const ts of sides) {
      const fp = shapeSideMidpoint(from, fs);
      const tp = shapeSideMidpoint(to, ts);
      const d = dist(fp, tp);
      if (d < bestDist) {
        bestDist = d;
        best = { fromSide: fs, toSide: ts };
      }
    }
  }
  return best;
}

function arrowheadPoints(px, py, qx, qy, size = 10) {
  const angle = Math.atan2(qy - py, qx - px);
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  return [
    [qx, qy],
    [qx + size * Math.cos(a1), qy + size * Math.sin(a1)],
    [qx + size * Math.cos(a2), qy + size * Math.sin(a2)],
  ];
}

function wrapText(text, maxChars = 20) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if (line.length + w.length + 1 > maxChars && line.length > 0) {
      lines.push(line);
      line = w;
    } else {
      line = line ? line + " " + w : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [jsonPath, outDir] = process.argv.slice(2);
if (!jsonPath || !outDir) {
  console.error("Usage: render.mjs <input.json> <output-dir>");
  process.exit(1);
}

const data = JSON.parse(readFileSync(jsonPath, "utf-8"));
const W = data.width || 800;
const H = data.height || 600;
const bg = data.background || "#FAF8F5";
const slug = slugify(data.title || "diagram");

// Create SVG document
const doc = new DOMImplementation().createDocument(
  "http://www.w3.org/2000/svg",
  "svg",
  null
);
const svg = doc.documentElement;
svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
svg.setAttribute("width", String(W));
svg.setAttribute("height", String(H));
svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

// Embed fonts via @font-face (base64 for portable SVG)
const virgilB64 = readFileSync(join(FONTS_DIR, "Virgil.woff2")).toString("base64");
const cascadiaB64 = readFileSync(join(FONTS_DIR, "Cascadia.woff2")).toString("base64");

const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
style.textContent = `
  @font-face {
    font-family: 'Virgil';
    src: url(data:font/woff2;base64,${virgilB64}) format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'Cascadia';
    src: url(data:font/woff2;base64,${cascadiaB64}) format('woff2');
    font-weight: normal;
    font-style: normal;
  }
`;
defs.appendChild(style);
svg.appendChild(defs);

// Background
const bgRect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
bgRect.setAttribute("width", String(W));
bgRect.setAttribute("height", String(H));
bgRect.setAttribute("fill", bg);
svg.appendChild(bgRect);

// Rough canvas
const rc = rough.svg(svg);

// Build element map
const elements = data.elements || [];
const elMap = {};
for (const el of elements) {
  if (el.id) elMap[el.id] = el;
}

// Shared rough options
function shapeOpts(el) {
  return {
    stroke: el.stroke || STROKE,
    strokeWidth: el.strokeWidth || 1.5,
    fill: el.fill || undefined,
    fillStyle: el.fillStyle || "solid",
    roughness: el.roughness ?? ROUGHNESS,
    seed: el.seed ?? SEED,
  };
}

// Create text node helper
function addText(parent, x, y, text, fontSize, opts = {}) {
  const lines = wrapText(text, opts.maxChars || 22);
  const lineHeight = fontSize * 1.35;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  const fontFamily = opts.mono ? FONT_MONO : FONT_HAND;

  for (let i = 0; i < lines.length; i++) {
    const t = doc.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", String(startY + i * lineHeight));
    t.setAttribute("text-anchor", opts.anchor || "middle");
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("font-family", fontFamily);
    t.setAttribute("font-size", String(fontSize));
    t.setAttribute("fill", opts.color || STROKE);
    if (opts.fontWeight) t.setAttribute("font-weight", opts.fontWeight);
    t.textContent = lines[i];
    parent.appendChild(t);
  }
}

// ── Draw elements ────────────────────────────────────────────────────────────

for (const el of elements) {
  switch (el.type) {
    case "rectangle": {
      const opts = shapeOpts(el);
      let node;
      if (el.rounded) {
        // Use path for rounded rectangle
        const r = Math.min(12, el.width / 4, el.height / 4);
        const x = el.x, y = el.y, w = el.width, h = el.height;
        const d = `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
        node = rc.path(d, opts);
      } else {
        node = rc.rectangle(el.x, el.y, el.width, el.height, opts);
      }
      svg.appendChild(node);
      if (el.label) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        addText(svg, cx, cy, el.label, el.fontSize || LABEL_SIZE);
      }
      break;
    }

    case "ellipse": {
      const opts = shapeOpts(el);
      const node = rc.ellipse(el.x, el.y, el.width, el.height, opts);
      svg.appendChild(node);
      if (el.label) {
        addText(svg, el.x, el.y, el.label, el.fontSize || LABEL_SIZE);
      }
      break;
    }

    case "diamond": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const points = [
        [cx, el.y],
        [el.x + el.width, cy],
        [cx, el.y + el.height],
        [el.x, cy],
      ];
      const opts = shapeOpts(el);
      const node = rc.polygon(points, opts);
      svg.appendChild(node);
      if (el.label) {
        addText(svg, cx, cy, el.label, el.fontSize || LABEL_SIZE);
      }
      break;
    }

    case "arrow": {
      const fromEl = elMap[el.from];
      const toEl = elMap[el.to];
      if (!fromEl || !toEl) {
        console.warn(`Arrow references missing element: from=${el.from} to=${el.to}`);
        break;
      }
      const sides =
        el.fromSide && el.toSide
          ? { fromSide: el.fromSide, toSide: el.toSide }
          : bestSides(fromEl, toEl);

      const p1 = shapeSideMidpoint(fromEl, sides.fromSide);
      const p2 = shapeSideMidpoint(toEl, sides.toSide);

      // Draw line
      const lineNode = rc.line(p1.x, p1.y, p2.x, p2.y, {
        stroke: el.stroke || STROKE,
        strokeWidth: el.strokeWidth || 1.5,
        roughness: el.roughness ?? ROUGHNESS * 0.6,
        seed: el.seed ?? SEED + 100,
      });
      svg.appendChild(lineNode);

      // Arrowhead
      const headPts = arrowheadPoints(p1.x, p1.y, p2.x, p2.y, 12);
      const headNode = rc.polygon(headPts, {
        stroke: el.stroke || STROKE,
        fill: el.stroke || STROKE,
        fillStyle: "solid",
        roughness: 0.4,
        seed: el.seed ?? SEED + 200,
      });
      svg.appendChild(headNode);

      // Arrow label (mono for technical annotations)
      if (el.label) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2 - 14;
        addText(svg, mx, my, el.label, el.fontSize || 14, { color: "#555", mono: true });
      }
      break;
    }

    case "line": {
      const points = el.points || [
        [el.x1 ?? el.x, el.y1 ?? el.y],
        [el.x2, el.y2],
      ];
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        const node = rc.line(x1, y1, x2, y2, {
          stroke: el.stroke || STROKE,
          strokeWidth: el.strokeWidth || 1.5,
          roughness: el.roughness ?? ROUGHNESS,
          seed: (el.seed ?? SEED) + i,
        });
        svg.appendChild(node);
      }
      break;
    }

    case "text": {
      const fontSize = el.fontSize || 16;
      addText(svg, el.x, el.y, el.text, fontSize, {
        color: el.color || STROKE,
        fontWeight: el.fontWeight || (fontSize >= 20 ? "bold" : "normal"),
        anchor: el.align || "middle",
      });
      break;
    }

    default:
      console.warn(`Unknown element type: ${el.type}`);
  }
}

// ── Serialize & Save ─────────────────────────────────────────────────────────

const svgString = new XMLSerializer().serializeToString(svg);
const svgPath = `${outDir}/${slug}.svg`;
const pngPath = `${outDir}/${slug}.png`;

writeFileSync(svgPath, svgString);
console.log(`SVG saved: ${svgPath}`);

// Convert to PNG
const resvg = new Resvg(svgString, {
  fitTo: { mode: "width", value: W * 2 },
  font: {
    fontFiles: [
      join(FONTS_DIR, "Virgil.woff2"),
      join(FONTS_DIR, "Cascadia.woff2"),
    ],
    loadSystemFonts: true,
  },
  background: bg,
});
const pngData = resvg.render();
writeFileSync(pngPath, pngData.asPng());
console.log(`PNG saved: ${pngPath}`);
