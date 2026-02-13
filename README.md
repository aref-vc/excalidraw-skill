# Excalidraw Skill for Claude Code

A Claude Code skill that transforms any text prompt into a hand-drawn Excalidraw-style diagram, saved as SVG + PNG locally. No browser, no Puppeteer, no MCP server.

![Example output](https://github.com/user-attachments/assets/placeholder.png)

## What it does

Describe a diagram in plain English and get a hand-drawn sketch rendered locally in under a second:

- **Flowcharts** — decision trees, process flows, user journeys
- **Architecture diagrams** — services, databases, APIs, connections
- **System designs** — components, data flows, deployment pipelines

Output uses the authentic Excalidraw look: Virgil handwritten font for labels, Cascadia monospace for annotations, and roughjs for sketchy hand-drawn shapes.

## Install

```bash
# Clone into your Claude Code skills directory
git clone https://github.com/yourusername/excalidraw-skill.git ~/.claude/skills/excalidraw

# Install renderer dependencies
cd ~/.claude/skills/excalidraw/scripts && npm install
```

## Usage

Once installed, trigger the skill in Claude Code:

```
/excalidraw user -> API gateway -> auth service -> database
```

Or describe what you want naturally:

```
draw me a hand-drawn architecture diagram with a load balancer,
three API servers, a Redis cache, and a PostgreSQL database
```

## Output

By default, diagrams are saved to `~/Downloads/Excalidraw/` as both SVG and PNG (2x resolution).

To change the output directory, edit the `OUTPUT_DIR` line in `SKILL.md`:

```
OUTPUT_DIR: ~/Documents/My Diagrams/
```

## Supported Elements

| Type | Description | Fill colors |
|------|-------------|-------------|
| `rectangle` | Services, components (optional rounded corners) | Any pastel hex |
| `ellipse` | Actors, users, external systems | Any pastel hex |
| `diamond` | Decisions, conditions | Any pastel hex |
| `arrow` | Connections between shapes (auto-routed) | — |
| `line` | Dividers, separators | — |
| `text` | Titles, annotations, labels | — |

## Color Palette

| Color | Hex | Typical use |
|-------|-----|-------------|
| Blue | `#a5d8ff` | APIs, services |
| Green | `#b2f2bb` | Databases, storage |
| Orange | `#ffd8a8` | Users, actors |
| Yellow | `#ffec99` | Decisions, warnings |
| Pink | `#fcc2d7` | Events, messages |
| Purple | `#d0bfff` | Auth, security |
| Gray | `#dee2e6` | Infrastructure |
| Cyan | `#99e9f2` | Caching, network |

## How it works

1. Claude reads your prompt and generates a simple JSON diagram spec
2. The JSON is passed to `render.mjs` — a ~200 line Node.js script
3. **roughjs** draws hand-drawn shapes onto an SVG (via xmldom, no browser needed)
4. **resvg-js** converts the SVG to a 2x PNG
5. Both files are saved to your output directory

Total render time: ~200-400ms.

## Fonts

Bundled fonts (both open source):
- **Virgil** (OFL-1.1) — Excalidraw's handwritten font, used for shape labels and titles
- **Cascadia** (MIT) — Microsoft's monospace font, used for arrow annotations

## Dependencies

| Package | Purpose | License |
|---------|---------|---------|
| `roughjs` | Hand-drawn shape rendering | MIT |
| `@xmldom/xmldom` | Server-side SVG DOM | MIT |
| `@resvg/resvg-js` | SVG to PNG conversion | MPL-2.0 |

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Node.js 18+

## License

MIT
