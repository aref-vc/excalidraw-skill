#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import rough from "roughjs";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, "..", "fonts");

// ── Constants ────────────────────────────────────────────────────────────────

const FONT_HAND = "Virgil, Segoe Print, Comic Sans MS, cursive";
const FONT_MONO = "Cascadia, Cascadia Code, monospace";
const STROKE = "#1e1e1e";
const LABEL_SIZE = 18;
const ROUGHNESS = 1.2;
const SEED = 42;

// Text measurement: average character width as a ratio of fontSize.
// These values are calibrated to the bundled Virgil and Cascadia fonts.
const CHAR_RATIO_HAND = 0.52;
const CHAR_RATIO_MONO = 0.60;

// Layout constants
const SHAPE_PAD_X = 14;          // horizontal text padding inside shapes
const SHAPE_PAD_Y = 10;          // vertical text padding inside shapes
const ANNOTATION_MIN_SIZE = 13;  // minimum font size for annotations
const LABEL_ANNO_GAP = 6;        // gap between label block and annotation block
const ARROW_LABEL_OFFSET = 18;   // base perpendicular offset for arrow labels
const SECTION_INSET_X = 10;      // section label inset from left edge
const SECTION_INSET_Y = 8;       // section label inset from top edge
const TITLE_SUB_GAP = 6;         // gap between title and subtitle

// ── Text Measurement ─────────────────────────────────────────────────────────

function charW(fontSize, mono = false) {
  return fontSize * (mono ? CHAR_RATIO_MONO : CHAR_RATIO_HAND);
}

function measureWidth(text, fontSize, mono = false) {
  return text.length * charW(fontSize, mono);
}

/** Wrap text to fit within maxWidth pixels. Returns array of lines. */
function wrapText(text, fontSize, maxWidth, mono = false) {
  const cw = charW(fontSize, mono);
  const maxChars = Math.max(6, Math.floor(maxWidth / cw));
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    // Single word longer than maxChars — put it on its own line
    if (w.length > maxChars && line.length === 0) {
      lines.push(w);
      continue;
    }
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

/** Height of a block of N lines at given fontSize. */
function blockH(lineCount, fontSize) {
  return lineCount > 0 ? lineCount * fontSize * 1.35 : 0;
}

// ── Geometry Helpers ─────────────────────────────────────────────────────────

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Bounding box { x, y, w, h } — always top-left origin. */
function shapeBounds(el) {
  if (el.type === "ellipse") {
    return { x: el.x - el.width / 2, y: el.y - el.height / 2, w: el.width, h: el.height };
  }
  return { x: el.x, y: el.y, w: el.width || 0, h: el.height || 0 };
}

function shapeCenter(el) {
  const b = shapeBounds(el);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function shapeSideMid(el, side) {
  const b = shapeBounds(el);
  switch (side) {
    case "top":    return { x: b.x + b.w / 2, y: b.y };
    case "bottom": return { x: b.x + b.w / 2, y: b.y + b.h };
    case "left":   return { x: b.x, y: b.y + b.h / 2 };
    case "right":  return { x: b.x + b.w, y: b.y + b.h / 2 };
  }
}

function ptDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function bestSides(from, to) {
  const sides = ["top", "bottom", "left", "right"];
  let best = null, bd = Infinity;
  for (const fs of sides) {
    for (const ts of sides) {
      const d = ptDist(shapeSideMid(from, fs), shapeSideMid(to, ts));
      if (d < bd) { bd = d; best = { fromSide: fs, toSide: ts }; }
    }
  }
  return best;
}

function arrowheadPts(px, py, qx, qy, size = 10) {
  const a = Math.atan2(qy - py, qx - px);
  const a1 = a + Math.PI * 0.82, a2 = a - Math.PI * 0.82;
  return [
    [qx, qy],
    [qx + size * Math.cos(a1), qy + size * Math.sin(a1)],
    [qx + size * Math.cos(a2), qy + size * Math.sin(a2)],
  ];
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── SVG Setup ────────────────────────────────────────────────────────────────

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

const doc = new DOMImplementation().createDocument(
  "http://www.w3.org/2000/svg", "svg", null
);
const svg = doc.documentElement;
svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
svg.setAttribute("width", String(W));
svg.setAttribute("height", String(H));
svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

// Embed fonts as base64 for portable SVG
const virgilB64 = readFileSync(join(FONTS_DIR, "Virgil.woff2")).toString("base64");
const cascadiaB64 = readFileSync(join(FONTS_DIR, "Cascadia.woff2")).toString("base64");

const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
const styleEl = doc.createElementNS("http://www.w3.org/2000/svg", "style");
styleEl.textContent = `
  @font-face {
    font-family: 'Virgil';
    src: url(data:font/woff2;base64,${virgilB64}) format('woff2');
    font-weight: normal; font-style: normal;
  }
  @font-face {
    font-family: 'Cascadia';
    src: url(data:font/woff2;base64,${cascadiaB64}) format('woff2');
    font-weight: normal; font-style: normal;
  }
`;
defs.appendChild(styleEl);
svg.appendChild(defs);

const bgRect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
bgRect.setAttribute("width", String(W));
bgRect.setAttribute("height", String(H));
bgRect.setAttribute("fill", bg);
svg.appendChild(bgRect);

const rc = rough.svg(svg);

// ── Element Map & Bounds ─────────────────────────────────────────────────────

const elements = data.elements || [];
const elMap = {};
for (const el of elements) { if (el.id) elMap[el.id] = el; }

// Collect all shape bounding boxes for arrow label collision avoidance
const allBounds = [];
for (const el of elements) {
  if (["rectangle", "ellipse", "diamond"].includes(el.type)) {
    allBounds.push(shapeBounds(el));
  }
}

function roughOpts(el) {
  return {
    stroke: el.stroke || STROKE,
    strokeWidth: el.strokeWidth || 1.5,
    fill: el.fill || undefined,
    fillStyle: el.fillStyle || "solid",
    roughness: el.roughness ?? ROUGHNESS,
    seed: el.seed ?? SEED,
  };
}

// ── Text Rendering Primitives ────────────────────────────────────────────────

/** Create a single SVG <text> element. */
function mkText(x, y, text, fontSize, opts = {}) {
  const t = doc.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", String(x));
  t.setAttribute("y", String(y));
  t.setAttribute("text-anchor", opts.anchor || "middle");
  t.setAttribute("dominant-baseline", "central");
  t.setAttribute("font-family", opts.mono ? FONT_MONO : FONT_HAND);
  t.setAttribute("font-size", String(fontSize));
  t.setAttribute("fill", opts.color || STROKE);
  if (opts.fontWeight) t.setAttribute("font-weight", opts.fontWeight);
  t.textContent = text;
  return t;
}

/**
 * Render an array of text lines starting at (x, startY).
 * Returns the Y position of the last line's baseline.
 */
function renderLines(x, startY, lines, fontSize, opts = {}) {
  const lh = fontSize * 1.35;
  for (let i = 0; i < lines.length; i++) {
    svg.appendChild(mkText(x, startY + i * lh, lines[i], fontSize, opts));
  }
  return startY + (lines.length - 1) * lh;
}

/**
 * Render text centered vertically at cy, wrapped to maxWidth.
 * Returns { topY, bottomY, lineCount }.
 */
function renderCentered(cx, cy, text, fontSize, maxWidth, opts = {}) {
  const lines = wrapText(text, fontSize, maxWidth, opts.mono);
  const lh = fontSize * 1.35;
  const totalH = lines.length * lh;
  const startY = cy - totalH / 2 + lh / 2;
  renderLines(cx, startY, lines, fontSize, opts);
  return {
    topY: startY - lh / 2,
    bottomY: startY + (lines.length - 1) * lh + lh / 2,
    lineCount: lines.length,
  };
}

// ── Shape Text Layout ────────────────────────────────────────────────────────

/**
 * Compute available text width inside a shape, accounting for geometry.
 * Diamonds and ellipses have less usable interior than rectangles.
 */
function innerTextWidth(el) {
  const b = shapeBounds(el);
  const rawW = b.w - SHAPE_PAD_X * 2;
  if (el.type === "diamond") return rawW * 0.5;
  if (el.type === "ellipse") return rawW * 0.7;
  return rawW;
}

function innerTextHeight(el) {
  const b = shapeBounds(el);
  const rawH = b.h - SHAPE_PAD_Y * 2;
  if (el.type === "diamond") return rawH * 0.5;
  if (el.type === "ellipse") return rawH * 0.7;
  return rawH;
}

/**
 * Render label + optional annotation inside a shape.
 * - label is centered in the hand font
 * - annotation is rendered below the label in mono, capped to fit
 * - sectionLabel is rendered top-left aligned (for zone rectangles)
 */
function renderShapeLabels(el) {
  const b = shapeBounds(el);
  const cx = b.x + b.w / 2;
  const maxW = innerTextWidth(el);
  const maxH = innerTextHeight(el);

  // Section label (top-left inset, for zone/group rectangles)
  if (el.sectionLabel) {
    const slSize = el.sectionLabelSize || 14;
    const slMaxW = b.w - SECTION_INSET_X * 2;
    const slLines = wrapText(el.sectionLabel, slSize, slMaxW);
    const slY = b.y + SECTION_INSET_Y + slSize * 0.7;
    renderLines(b.x + SECTION_INSET_X, slY, slLines, slSize, {
      anchor: "start",
      fontWeight: "bold",
      color: el.sectionLabelColor || "#555",
    });
  }

  if (!el.label) return;

  const labelSize = el.fontSize || LABEL_SIZE;
  const labelLines = wrapText(el.label, labelSize, maxW);
  const labelH = blockH(labelLines.length, labelSize);

  if (el.annotation) {
    // Combined label + annotation layout
    const annoSize = Math.max(ANNOTATION_MIN_SIZE, el.annotationSize || 13);
    const annoLines = wrapText(el.annotation, annoSize, maxW, true);
    const annoH = blockH(annoLines.length, annoSize);
    const totalH = labelH + LABEL_ANNO_GAP + annoH;

    // Truncate annotation lines if combined block exceeds available height
    let dispAnnoLines = annoLines;
    if (totalH > maxH && annoLines.length > 1) {
      const maxAnnoH = Math.max(annoSize * 1.35, maxH - labelH - LABEL_ANNO_GAP);
      const maxLines = Math.max(1, Math.floor(maxAnnoH / (annoSize * 1.35)));
      dispAnnoLines = annoLines.slice(0, maxLines);
      if (dispAnnoLines.length < annoLines.length) {
        const last = dispAnnoLines[dispAnnoLines.length - 1];
        dispAnnoLines[dispAnnoLines.length - 1] =
          last.length > 3 ? last.slice(0, -3) + "\u2026" : last;
      }
    }

    const dispAnnoH = blockH(dispAnnoLines.length, annoSize);
    const dispTotal = labelH + LABEL_ANNO_GAP + dispAnnoH;
    const cy = b.y + b.h / 2;
    const topY = cy - dispTotal / 2;

    // Label block
    const labelStartY = topY + labelSize * 1.35 / 2;
    renderLines(cx, labelStartY, labelLines, labelSize);

    // Annotation block
    const annoStartY = topY + labelH + LABEL_ANNO_GAP + annoSize * 1.35 / 2;
    renderLines(cx, annoStartY, dispAnnoLines, annoSize, {
      color: "#868e96",
      mono: true,
    });
  } else {
    // Label only — center in shape
    renderCentered(cx, b.y + b.h / 2, el.label, labelSize, maxW);
  }
}

// ── Arrow Label with Collision Avoidance ─────────────────────────────────────

/**
 * Place arrow label at the midpoint of the arrow, shifted perpendicular
 * to avoid overlapping with shapes. Tries multiple offsets and picks
 * the first collision-free position.
 */
function renderArrowLabel(p1, p2, label, fontSize = 14) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Perpendicular unit vector
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;

  // Estimate label bounding box for collision check
  const lw = measureWidth(label, fontSize, true) + 10;
  const lh = fontSize * 1.8;

  // Try offsets: positive perpendicular, negative, then larger
  const offsets = [
    ARROW_LABEL_OFFSET,
    -ARROW_LABEL_OFFSET,
    ARROW_LABEL_OFFSET * 2,
    -ARROW_LABEL_OFFSET * 2,
  ];

  for (const off of offsets) {
    const lx = mx + nx * off;
    const ly = my + ny * off;
    const lbx = lx - lw / 2;
    const lby = ly - lh / 2;

    let collision = false;
    for (const sb of allBounds) {
      if (rectsOverlap(lbx, lby, lw, lh, sb.x, sb.y, sb.w, sb.h)) {
        collision = true;
        break;
      }
    }
    if (!collision) {
      // Wrap long arrow labels to prevent overflow
      const lines = wrapText(label, fontSize, 180, true);
      if (lines.length === 1) {
        svg.appendChild(mkText(lx, ly, label, fontSize, { color: "#555", mono: true }));
      } else {
        const startY = ly - blockH(lines.length, fontSize) / 2 + fontSize * 1.35 / 2;
        renderLines(lx, startY, lines, fontSize, { color: "#555", mono: true });
      }
      return;
    }
  }

  // Fallback: first offset regardless of collision
  const lx = mx + nx * ARROW_LABEL_OFFSET;
  const ly = my + ny * ARROW_LABEL_OFFSET;
  svg.appendChild(mkText(lx, ly, label, fontSize, { color: "#555", mono: true }));
}

// ── Draw Elements ────────────────────────────────────────────────────────────

for (const el of elements) {
  switch (el.type) {
    case "rectangle": {
      const opts = roughOpts(el);
      let node;
      if (el.rounded) {
        const r = Math.min(12, el.width / 4, el.height / 4);
        const { x, y, width: w, height: h } = el;
        const d = `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
        node = rc.path(d, opts);
      } else {
        node = rc.rectangle(el.x, el.y, el.width, el.height, opts);
      }
      svg.appendChild(node);
      renderShapeLabels(el);
      break;
    }

    case "ellipse": {
      svg.appendChild(rc.ellipse(el.x, el.y, el.width, el.height, roughOpts(el)));
      renderShapeLabels(el);
      break;
    }

    case "diamond": {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      const pts = [
        [cx, el.y], [el.x + el.width, cy],
        [cx, el.y + el.height], [el.x, cy],
      ];
      svg.appendChild(rc.polygon(pts, roughOpts(el)));
      renderShapeLabels(el);
      break;
    }

    case "arrow": {
      const fromEl = elMap[el.from], toEl = elMap[el.to];
      if (!fromEl || !toEl) {
        console.warn(`Arrow references missing element: from=${el.from} to=${el.to}`);
        break;
      }
      const sides = el.fromSide && el.toSide
        ? { fromSide: el.fromSide, toSide: el.toSide }
        : bestSides(fromEl, toEl);
      const p1 = shapeSideMid(fromEl, sides.fromSide);
      const p2 = shapeSideMid(toEl, sides.toSide);

      // Arrow line
      svg.appendChild(rc.line(p1.x, p1.y, p2.x, p2.y, {
        stroke: el.stroke || STROKE,
        strokeWidth: el.strokeWidth || 1.5,
        roughness: el.roughness ?? ROUGHNESS * 0.6,
        seed: el.seed ?? SEED + 100,
      }));

      // Arrowhead
      svg.appendChild(rc.polygon(arrowheadPts(p1.x, p1.y, p2.x, p2.y, 12), {
        stroke: el.stroke || STROKE,
        fill: el.stroke || STROKE,
        fillStyle: "solid",
        roughness: 0.4,
        seed: el.seed ?? SEED + 200,
      }));

      // Label with collision avoidance
      if (el.label) {
        renderArrowLabel(p1, p2, el.label, el.fontSize || 14);
      }
      break;
    }

    case "line": {
      const pts = el.points || [
        [el.x1 ?? el.x, el.y1 ?? el.y],
        [el.x2, el.y2],
      ];
      for (let i = 0; i < pts.length - 1; i++) {
        svg.appendChild(rc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], {
          stroke: el.stroke || STROKE,
          strokeWidth: el.strokeWidth || 1.5,
          roughness: el.roughness ?? ROUGHNESS,
          seed: (el.seed ?? SEED) + i,
        }));
      }
      break;
    }

    case "text": {
      const fontSize = el.fontSize || 16;
      const isTitle = fontSize >= 20;
      const maxWidth = el.maxWidth || W - 80;
      const lines = wrapText(el.text, fontSize, maxWidth);
      const lh = fontSize * 1.35;
      const startY = el.y - ((lines.length - 1) * lh) / 2;

      const lastBaselineY = renderLines(el.x, startY, lines, fontSize, {
        color: el.color || STROKE,
        fontWeight: el.fontWeight || (isTitle ? "bold" : "normal"),
        anchor: el.align || "middle",
      });

      // Subtitle: renders below title with a gap, preventing overlap
      if (el.subtitle) {
        const subSize = el.subtitleSize || Math.max(ANNOTATION_MIN_SIZE, Math.round(fontSize * 0.55));
        const subMaxW = el.maxWidth || W - 120;
        const subLines = wrapText(el.subtitle, subSize, subMaxW);
        const subStartY = lastBaselineY + lh / 2 + TITLE_SUB_GAP + subSize * 1.35 / 2;
        renderLines(el.x, subStartY, subLines, subSize, {
          color: el.subtitleColor || "#868e96",
          anchor: el.align || "middle",
        });
      }
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
writeFileSync(pngPath, resvg.render().asPng());
console.log(`PNG saved: ${pngPath}`);
