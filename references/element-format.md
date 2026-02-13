# Excalidraw Element Format Reference

## JSON Structure

```json
{
  "title": "Diagram Title",
  "width": 800,
  "height": 600,
  "background": "#FAF8F5",
  "elements": [ ... ]
}
```

- `width`/`height`: Canvas size in pixels. Default 800x600. Increase for complex diagrams.
- `background`: Canvas background color. Default warm white `#FAF8F5`.

---

## Element Types

### Rectangle

```json
{
  "type": "rectangle",
  "id": "r1",
  "x": 100, "y": 200,
  "width": 180, "height": 80,
  "label": "API Gateway",
  "fill": "#a5d8ff",
  "rounded": true
}
```

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `x`, `y` | yes | — | Top-left corner |
| `width`, `height` | yes | — | Min 100x60 for readability |
| `label` | no | — | Centered text, auto-wraps |
| `fill` | no | none | Background color |
| `rounded` | no | false | Rounded corners |
| `id` | no | — | Required if arrows reference this shape |

### Ellipse

```json
{
  "type": "ellipse",
  "id": "e1",
  "x": 300, "y": 150,
  "width": 160, "height": 100,
  "label": "User",
  "fill": "#ffd8a8"
}
```

| Field | Notes |
|-------|-------|
| `x`, `y` | **Center** of the ellipse (not top-left) |
| `width`, `height` | Full diameter (not radius) |

### Diamond

```json
{
  "type": "diamond",
  "id": "d1",
  "x": 200, "y": 100,
  "width": 140, "height": 100,
  "label": "Decision?",
  "fill": "#ffec99"
}
```

| Field | Notes |
|-------|-------|
| `x`, `y` | Top-left of bounding box |
| `width`, `height` | Bounding box dimensions. Min 120x80 for labels. |

### Arrow

```json
{
  "type": "arrow",
  "from": "r1",
  "to": "r2",
  "label": "HTTP",
  "fromSide": "right",
  "toSide": "left"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `from`, `to` | yes | ID of source/target shape |
| `label` | no | Shown at midpoint above the line |
| `fromSide`, `toSide` | no | "top", "bottom", "left", "right". Auto-detected if omitted (nearest sides). |

### Line

```json
{
  "type": "line",
  "points": [[50, 300], [750, 300]]
}
```

Alternative flat form: `{ "type": "line", "x1": 50, "y1": 300, "x2": 750, "y2": 300 }`

### Text

```json
{
  "type": "text",
  "x": 400, "y": 40,
  "text": "System Architecture",
  "fontSize": 24,
  "fontWeight": "bold"
}
```

| Field | Default | Notes |
|-------|---------|-------|
| `fontSize` | 16 | Titles: 24-28, labels: 14-16, annotations: 12-13 |
| `fontWeight` | auto | Auto "bold" if fontSize >= 20 |
| `color` | #1e1e1e | Text color |
| `align` | "middle" | "middle", "start", "end" |

---

## Color Palette

### Primary fills (pastel, high readability)

| Color | Hex | Use for |
|-------|-----|---------|
| Blue | `#a5d8ff` | APIs, services, interfaces |
| Green | `#b2f2bb` | Databases, storage, success |
| Orange | `#ffd8a8` | Users, actors, external systems |
| Yellow | `#ffec99` | Decisions, conditions, warnings |
| Pink | `#fcc2d7` | Events, messages, queues |
| Purple | `#d0bfff` | Auth, security, middleware |
| Gray | `#dee2e6` | Infrastructure, utilities |
| Cyan | `#99e9f2` | Caching, CDN, network |

### Background zones (very faint, for grouping)

| Color | Hex | Use for |
|-------|-----|---------|
| Light blue zone | `#e7f5ff` | Service group boundary |
| Light green zone | `#ebfbee` | Data layer boundary |
| Light gray zone | `#f1f3f5` | External system boundary |

### Strokes and text

| Element | Color |
|---------|-------|
| Shape outlines | `#1e1e1e` (near-black) |
| Arrow labels | `#555555` |
| Annotations | `#868e96` |

---

## Layout Rules

### Spacing

- **Between shapes**: minimum 40px gap (60-80px preferred for clarity)
- **Arrow clearance**: keep 20px+ between arrow paths and unrelated shapes
- **Edge padding**: 40px minimum from canvas edges

### Sizing

- **Rectangles**: min 100x60, typical 160-200 x 70-90
- **Ellipses**: min 120x80 (diameter)
- **Diamonds**: min 120x80 bounding box
- **Font sizes**: title 24-28, shape labels 14-16, arrow labels 12-14

### Direction

- **Top-to-bottom** for hierarchies and sequences
- **Left-to-right** for data flows and pipelines
- **Mixed** is fine for architecture diagrams — use what's clearest

### Grouping

- Use background zone rectangles (very faint fill, no stroke or dashed stroke) to visually group related elements
- Add a text label above or inside the zone

---

## Examples

### Simple Flow

```json
{
  "title": "Request Flow",
  "width": 700,
  "height": 300,
  "elements": [
    { "type": "rectangle", "id": "client", "x": 40, "y": 110, "width": 140, "height": 70, "label": "Client", "fill": "#ffd8a8", "rounded": true },
    { "type": "rectangle", "id": "api", "x": 280, "y": 110, "width": 140, "height": 70, "label": "API Server", "fill": "#a5d8ff", "rounded": true },
    { "type": "rectangle", "id": "db", "x": 520, "y": 110, "width": 140, "height": 70, "label": "Database", "fill": "#b2f2bb", "rounded": true },
    { "type": "arrow", "from": "client", "to": "api", "label": "REST" },
    { "type": "arrow", "from": "api", "to": "db", "label": "SQL" },
    { "type": "text", "x": 350, "y": 40, "text": "Request Flow", "fontSize": 24 }
  ]
}
```

### Architecture with Decision

```json
{
  "title": "Auth Flow",
  "width": 600,
  "height": 500,
  "elements": [
    { "type": "ellipse", "id": "user", "x": 300, "y": 60, "width": 140, "height": 80, "label": "User", "fill": "#ffd8a8" },
    { "type": "rectangle", "id": "login", "x": 220, "y": 150, "width": 160, "height": 70, "label": "Login Page", "fill": "#a5d8ff", "rounded": true },
    { "type": "diamond", "id": "check", "x": 230, "y": 270, "width": 140, "height": 100, "label": "Valid?", "fill": "#ffec99" },
    { "type": "rectangle", "id": "dash", "x": 60, "y": 410, "width": 160, "height": 70, "label": "Dashboard", "fill": "#b2f2bb", "rounded": true },
    { "type": "rectangle", "id": "err", "x": 380, "y": 410, "width": 160, "height": 70, "label": "Error Page", "fill": "#fcc2d7", "rounded": true },
    { "type": "arrow", "from": "user", "to": "login" },
    { "type": "arrow", "from": "login", "to": "check" },
    { "type": "arrow", "from": "check", "to": "dash", "label": "Yes", "fromSide": "left", "toSide": "top" },
    { "type": "arrow", "from": "check", "to": "err", "label": "No", "fromSide": "right", "toSide": "top" }
  ]
}
```
