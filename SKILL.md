---
name: excalidraw
description: Generate hand-drawn Excalidraw-style diagrams from text prompts. Triggers on requests for diagrams, flowcharts, architecture sketches, system designs, hand-drawn visuals, or when the user says /excalidraw.
user_invocable: true
---

# Excalidraw Diagram Generator

Generate hand-drawn style diagrams rendered as SVG + PNG.

## Configuration

Set your preferred output directory below. Defaults to `~/Downloads/Excalidraw/`.

```
OUTPUT_DIR: ~/Downloads/Excalidraw/
```

To customize, edit the `OUTPUT_DIR` line above to any absolute path (e.g., `~/Documents/Diagrams/`, `~/Desktop/Sketches/`).

| Key | Value |
|-----|-------|
| Formats | `.svg` + `.png` (2x resolution) |
| Fonts | Virgil (handwritten) + Cascadia (monospace) |
| Renderer | `scripts/render.mjs` (roughjs + xmldom + resvg) |
| Reference | `references/element-format.md` |

## Workflow

### Step 1: Analyze the request

Identify the components, relationships, and flow direction from the user's prompt. Decide on:
- Shape types (rectangles for services, ellipses for actors, diamonds for decisions)
- Connections (arrows between components)
- Layout direction (top-to-bottom, left-to-right)
- Appropriate canvas size

### Step 2: Read the element format reference

Read `references/element-format.md` (relative to this skill's directory) for the full JSON format specification, color palette, and layout rules.

### Step 3: Generate diagram JSON

Create a JSON object following the element format. Key rules:
- Give every shape that receives/sends arrows a unique `id`
- Use pastel fills from the color palette for readability
- Space shapes 60-80px apart minimum
- Keep 40px padding from canvas edges
- Use `rounded: true` for service/component rectangles
- Arrow `from`/`to` reference shape IDs — the renderer auto-routes them

### Step 4: Render

1. Read the `OUTPUT_DIR` from the Configuration section above. Create the directory if it doesn't exist.

2. Save the JSON to a temp file:
   ```bash
   cat > /tmp/excalidraw-diagram.json << 'DIAGRAMEOF'
   { ...the JSON... }
   DIAGRAMEOF
   ```

3. Run the renderer (use the absolute path to `scripts/render.mjs` within this skill's directory):
   ```bash
   node <SKILL_DIR>/scripts/render.mjs /tmp/excalidraw-diagram.json "<OUTPUT_DIR>"
   ```

4. Clean up the temp file.

### Step 5: Report output

Tell the user the file paths for both SVG and PNG. Open the PNG for visual inspection.

## Usage Examples

- `/excalidraw user -> API gateway -> auth service -> database`
- `/excalidraw microservices architecture with 4 services`
- `/excalidraw decision flowchart for code review process`
- `draw me a hand-drawn diagram of the deployment pipeline`
