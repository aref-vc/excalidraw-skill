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
  "annotation": "REST + GraphQL | OAuth2",
  "fill": "#a5d8ff",
  "rounded": true
}
```

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `x`, `y` | yes | — | Top-left corner |
| `width`, `height` | yes | — | Min 100x60 for readability |
| `label` | no | — | Centered text, auto-wraps to shape width |
| `annotation` | no | — | Smaller mono text below label. Auto-truncated if it exceeds shape bounds. |
| `fill` | no | none | Background color |
| `rounded` | no | false | Rounded corners |
| `id` | no | — | Required if arrows reference this shape |
| `sectionLabel` | no | — | Top-left inset label for zone/group rectangles |

**With annotation**: When `annotation` is set, the shape must be tall enough for both label + annotation. Use height 90-120 for shapes with annotations. The renderer stacks the label above the annotation and truncates with ellipsis if needed.

**As zone rectangle**: Use `sectionLabel` for background grouping zones. The label renders bold, inset from the top-left corner.

```json
{
  "type": "rectangle",
  "x": 20, "y": 80,
  "width": 400, "height": 300,
  "fill": "#e7f5ff",
  "sectionLabel": "FRONTEND LAYER"
}
```

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
| `annotation` | Supported. Inner text area is 70% of diameter. |

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
| `width`, `height` | Bounding box dimensions. Min 140x100 for labels. |
| `annotation` | Supported but inner area is only 50% of bounding box. Keep annotations very short. |

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
| `label` | no | Placed at midpoint, shifted perpendicular to avoid overlapping shapes |
| `fromSide`, `toSide` | no | "top", "bottom", "left", "right". Auto-detected if omitted. |

Arrow labels automatically try multiple positions to avoid colliding with shapes.

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
  "subtitle": "Overview of the cloud deployment"
}
```

| Field | Default | Notes |
|-------|---------|-------|
| `fontSize` | 16 | Titles: 24-28, labels: 16-18, annotations: 13-14 |
| `fontWeight` | auto | Auto "bold" if fontSize >= 20 |
| `color` | #1e1e1e | Text color |
| `align` | "middle" | "middle", "start", "end" |
| `maxWidth` | canvas - 80px | Maximum width before wrapping |
| `subtitle` | — | Rendered below the main text with gap, smaller font, gray color |
| `subtitleSize` | auto | Font size for subtitle. Default ~55% of main fontSize, min 13. |
| `subtitleColor` | #868e96 | Subtitle text color |

**IMPORTANT**: Always use the `subtitle` property for descriptive text below a title. Never place separate `text` elements at overlapping Y positions.

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
| Light yellow zone | `#fff9db` | Security boundary |
| Light pink zone | `#fff0f6` | Alert/risk boundary |
| Light purple zone | `#f3f0ff` | Auth boundary |

### Strokes and text

| Element | Color |
|---------|-------|
| Shape outlines | `#1e1e1e` (near-black) |
| Arrow labels | `#555555` |
| Annotations | `#868e96` |
| Section labels | `#555555` |

---

## Layout Rules

### Spacing

- **Between shapes**: minimum 60px gap (80px preferred)
- **Arrow clearance**: keep 30px+ between arrow paths and unrelated shapes
- **Edge padding**: 40px minimum from canvas edges
- **Between text blocks**: minimum 30px vertical gap between any two text elements

### Sizing

| Shape | Without annotation | With annotation |
|-------|--------------------|-----------------|
| Rectangles | min 140x60, typical 160-200 x 70-80 | min 160x90, typical 180-220 x 100-120 |
| Ellipses | min 130x80 (diameter) | min 150x110 |
| Diamonds | min 140x100 bounding box | avoid annotations in diamonds |

### Font sizes

| Element | Size | Notes |
|---------|------|-------|
| Titles | 24-28 | Bold, use `subtitle` property for descriptive text |
| Shape labels | 16-18 | Auto-wrapped to shape width |
| Annotations | 13-14 | Mono font, rendered inside shape below label |
| Arrow labels | 14 | Mono font, auto-positioned to avoid shapes |
| Section labels | 14 | Bold, inset from zone top-left |

### Direction

- **Top-to-bottom** for hierarchies and sequences
- **Left-to-right** for data flows and pipelines
- **Mixed** is fine for architecture diagrams

### Grouping

Use zone rectangles with `sectionLabel` property instead of separate text elements:

```json
{ "type": "rectangle", "x": 20, "y": 80, "width": 400, "height": 300, "fill": "#e7f5ff", "sectionLabel": "DATA LAYER" }
```

### Canvas sizing

Calculate canvas dimensions based on content:
- Count the rows and columns of shapes
- Width = (columns x shape_width) + (columns + 1) x gap + 80px padding
- Height = (rows x shape_height) + (rows + 1) x gap + title_height + 80px padding
- Add 40px per annotation row visible
- Round up to nearest 50px

---

## Text Handling

The renderer uses **width-aware text wrapping**. Text wraps based on the pixel width available inside each shape, not a fixed character count.

### How it works

- Each character's width is estimated at ~52% of fontSize (hand font) or ~60% (mono font)
- Labels wrap to fit within the shape's inner width (shape width minus 28px padding)
- Annotations wrap to the same inner width but in mono font
- If label + annotation combined height exceeds the shape's inner height, annotation lines are truncated with an ellipsis

### Best practices

- Keep labels to 2-3 words when possible
- Keep annotations under 40 characters for typical shapes (180px wide)
- For longer annotations, increase shape width or accept truncation
- Never place descriptive text as a separate `text` element near a shape — use `annotation` instead

---

## Examples

### Simple Flow

```json
{
  "title": "Request Flow",
  "width": 800,
  "height": 250,
  "elements": [
    { "type": "text", "x": 400, "y": 35, "text": "Request Flow", "fontSize": 26, "subtitle": "Client to database via REST API" },
    { "type": "rectangle", "id": "client", "x": 40, "y": 100, "width": 160, "height": 70, "label": "Client", "fill": "#ffd8a8", "rounded": true },
    { "type": "rectangle", "id": "api", "x": 300, "y": 100, "width": 180, "height": 70, "label": "API Server", "fill": "#a5d8ff", "rounded": true },
    { "type": "rectangle", "id": "db", "x": 580, "y": 100, "width": 180, "height": 70, "label": "Database", "fill": "#b2f2bb", "rounded": true },
    { "type": "arrow", "from": "client", "to": "api", "label": "REST" },
    { "type": "arrow", "from": "api", "to": "db", "label": "SQL" }
  ]
}
```

### Architecture with Annotations

```json
{
  "title": "Auth Flow",
  "width": 700,
  "height": 550,
  "elements": [
    { "type": "text", "x": 350, "y": 35, "text": "AUTH FLOW", "fontSize": 26, "subtitle": "Login validation with session management" },
    { "type": "ellipse", "id": "user", "x": 350, "y": 110, "width": 140, "height": 80, "label": "User", "fill": "#ffd8a8" },
    { "type": "rectangle", "id": "login", "x": 260, "y": 190, "width": 180, "height": 100, "label": "Login Page", "annotation": "email + password | SSO supported", "fill": "#a5d8ff", "rounded": true },
    { "type": "diamond", "id": "check", "x": 280, "y": 330, "width": 140, "height": 100, "label": "Valid?", "fill": "#ffec99" },
    { "type": "rectangle", "id": "dash", "x": 60, "y": 450, "width": 180, "height": 70, "label": "Dashboard", "fill": "#b2f2bb", "rounded": true },
    { "type": "rectangle", "id": "err", "x": 460, "y": 450, "width": 180, "height": 70, "label": "Error Page", "fill": "#fcc2d7", "rounded": true },
    { "type": "arrow", "from": "user", "to": "login" },
    { "type": "arrow", "from": "login", "to": "check" },
    { "type": "arrow", "from": "check", "to": "dash", "label": "Yes", "fromSide": "left", "toSide": "top" },
    { "type": "arrow", "from": "check", "to": "err", "label": "No", "fromSide": "right", "toSide": "top" }
  ]
}
```

### Grouped Zones

```json
{
  "title": "Layered Architecture",
  "width": 900,
  "height": 500,
  "elements": [
    { "type": "text", "x": 450, "y": 35, "text": "LAYERED ARCHITECTURE", "fontSize": 26 },
    { "type": "rectangle", "x": 30, "y": 70, "width": 840, "height": 180, "fill": "#e7f5ff", "sectionLabel": "FRONTEND" },
    { "type": "rectangle", "x": 30, "y": 280, "width": 840, "height": 180, "fill": "#ebfbee", "sectionLabel": "DATA LAYER" },
    { "type": "rectangle", "id": "react", "x": 60, "y": 120, "width": 180, "height": 70, "label": "React App", "fill": "#a5d8ff", "rounded": true },
    { "type": "rectangle", "id": "cdn", "x": 300, "y": 120, "width": 180, "height": 70, "label": "CloudFront CDN", "fill": "#dee2e6", "rounded": true },
    { "type": "rectangle", "id": "db", "x": 60, "y": 330, "width": 180, "height": 70, "label": "PostgreSQL", "fill": "#b2f2bb", "rounded": true },
    { "type": "rectangle", "id": "s3", "x": 300, "y": 330, "width": 180, "height": 70, "label": "S3 Bucket", "fill": "#b2f2bb", "rounded": true },
    { "type": "arrow", "from": "react", "to": "cdn" },
    { "type": "arrow", "from": "react", "to": "db" },
    { "type": "arrow", "from": "cdn", "to": "s3" }
  ]
}
```
