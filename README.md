# Fishbone PCF

A **Fishbone / Ishikawa cause-and-effect** diagram as a PowerApps Component Framework (PCF)
control. Works in **model-driven apps** and **canvas apps**. The diagram is stored as two small
JSON fields (causes + categories) plus a plain-text problem statement — no extra table to manage.

## Features

- **Six category bones** — default to **Measurements, Materials, People, Environment, Methods,
  Machines**, and can be overridden with any comma-separated list via the `categories` property.
  Categories are **paired**: each pair shares one attachment point on the spine, with one bone
  angling up and its partner down (the classic fishbone shape). Titles render large and
  uppercase, with an add button centred on each bone tip.
- **Click anywhere on a bone** — the line itself, its large label, or the **＋** button at its
  tip — to **add a root cause** as a simple text description.
- Each cause carries a **vote count** (non-negative integer, with − / + steppers) and a
  **status**: **Hypothesis**, **Confirmed**, or **Rejected**.
- Causes render as colour-coded **chips** that **alternate to either side** of the bone, wrap to
  up to **three lines** (wrapping is driven by the real rendered text width), and carry a vote
  badge and a **status glyph** — **✓** Confirmed, **✕** Rejected, **?** Hypothesis. Colours come
  from the styling inputs (default amber, green, red — Rejected is struck through). Descriptions
  are capped at **100 characters**, with a live `x/100` counter in the edit dialog.
- **Auto-layout** — chips on the same side of a bone are stacked apart so they never overlap.
- **Click a cause** to edit its text, votes, or status, or to **delete** it.
- **Drag a cause** to reorder it along its bone or drop it onto a different bone (the target
  bone highlights while dragging).
- **Click the fish head** to set the **problem / effect** statement (also exposed as the bound
  `problem` property).
- **PNG export** — the `pngExport` output always holds an up-to-date PNG snapshot of the
  diagram as a data URI (2× resolution, white background).
- **Fully themable via inputs** — font, fishbone colour, and each status colour (see below).
- **Read-only** mode (via the `readOnly` property or a disabled/locked form field).
- Zero external runtime dependencies — pure TypeScript + SVG, so it builds cleanly.
- **MIT licensed.**

## Properties

| Property | Type | Usage | Notes |
| --- | --- | --- | --- |
| `causeData` | Multiple lines of text | bound (required) | JSON array of root causes: `[{id, category, text, votes, status}]`. A legacy combined `diagramData` blob is migrated automatically. |
| `diagramCategories` | Multiple lines of text | bound | JSON array (or comma-separated list) of category names. Default: `Measurements, Materials, People, Environment, Methods, Machines`. |
| `problem` | Single line of text | bound | The effect / problem statement in the fish head. Editable by clicking the head. |
| `effectLabel` | Single line of text | input | Heading shown at the top of the effect box. Default `Problem`. |
| `fontFamily` | Single line of text | input | Font family / stack for all text. Default `Segoe UI, system-ui, sans-serif`. Cause chips measure the rendered text and auto-size to fit whatever font you choose. |
| `backgroundColor` | Single line of text | input | Background colour of the diagram; also used as the PNG export background. Default white (`#ffffff`). |
| `diagramColor` | Single line of text | input | Colour of the spine, bones and head. Any CSS colour or hex. Default black (`#1b1b1b`). |
| `hypothesisColor` | Single line of text | input | Colour for Hypothesis causes. Default yellow (`#f2c811`). |
| `confirmedColor` | Single line of text | input | Colour for Confirmed causes. Default green (`#107c10`). |
| `rejectedColor` | Single line of text | input | Colour for Rejected causes. Default red (`#d13438`). |
| `readOnly` | Two options | input | When true, disables all editing (view only). |
| `pngExport` | Multiple lines of text | output | Read-only PNG snapshot of the diagram as a data URI, refreshed shortly after each change. Use in an Image control (`Image = Fishbone1.pngExport`) or send to Power Automate to save a `.png`. |

Colour inputs accept any CSS colour — a hex value (`#2b6cb0`) or a named colour (`teal`). Each chip
derives a light tinted fill and a readable text shade from its status colour automatically.

## Prerequisites (one-time, on a dev machine)

1. **Node.js LTS** (v18 or v20) — https://nodejs.org
2. **.NET SDK** (for packaging a solution) — https://dotnet.microsoft.com/download
3. **Power Platform CLI (`pac`)**:
   - VS Code: install the *Power Platform Tools* extension, **or**
   - `dotnet tool install --global Microsoft.PowerApps.CLI.Tool`

Verify:

```bash
node -v
pac help
```

## Build & test locally

From this folder (`Fishbone PCF`):

```bash
npm install
npm run build          # generates types + bundles the control
npm start watch        # opens the PCF test harness in a browser
```

The test harness lets you click categories, add/edit causes, and you'll see the JSON update live.

## Package into a solution and deploy

A ready-made solution wrapper is already checked in (`FishbonePCF.pcfproj` + the `Solution/`
folder), so you can build an importable zip directly:

```bash
npm install
npm run build                       # bundle the control
cd Solution
dotnet build -c Release             # -> Solution/bin/Release/Solution.zip
```

Then import `Solution.zip` at https://make.powerapps.com → **Solutions → Import**, or push directly:

```bash
pac auth create --url https://YOURORG.crm.dynamics.com
pac pcf push --publisher-prefix ben
```

If `dotnet build` complains about the wrapper (e.g. a newer `pac`/MSBuild expects different files),
regenerate it with the official tooling — the rest still applies:

```bash
./setup-solution.sh                 # runs pac solution init + add-reference
```

### Canvas apps: enable code components

Canvas apps only show code components when the feature is on:
**make.powerapps.com → your app → Settings → General → "Code components" = On**, then
**Insert → Get more components → Code** and add **Fishbone Diagram**.

## Use it in an app

1. **Model-driven:** create (or reuse) Multiple-Lines-of-Text columns for causes and categories
   (e.g. `ben_causedata`, `ben_categories`) and a text column for the problem. On the form,
   add the cause field, **Change control** → *Fishbone Diagram*, and bind the three data
   properties.
2. **Canvas:** Insert → Get more components → Code → add **Fishbone Diagram**, then:

   ```
   Fishbone1.causeData          = varCauses
   Fishbone1.diagramCategories  = varCategories      // optional; defaults apply
   Fishbone1.problem            = varProblem          // optional
   OnChange: Set(varCauses, Self.causeData);
             Set(varCategories, Self.diagramCategories);
             Set(varProblem, Self.problem)
   ```

   Add a `Patch(...)` in `OnChange` to persist to Dataverse/SharePoint.

To save a PNG: `Fishbone1.pngExport` is a `data:image/png;base64,...` URI — show it in an Image
control, or send it to a Power Automate flow that strips the prefix and writes the base64 to a
`.png` file.

## Data format

`causeData` — JSON array:

```json
[
  { "id": "c1", "category": "Machines",  "text": "Capper torque drift",    "votes": 5, "status": "Confirmed" },
  { "id": "c2", "category": "People",    "text": "New operator untrained", "votes": 3, "status": "Hypothesis" },
  { "id": "c3", "category": "Materials", "text": "Out-of-spec caps",       "votes": 4, "status": "Rejected" }
]
```

`diagramCategories` — JSON array (a comma-separated string is also accepted):

```json
["Measurements", "Materials", "People", "Environment", "Methods", "Machines"]
```

- Each cause hangs off the category whose name it matches (`category`). Causes whose category is
  not in the current list simply don't render (their data is preserved).
- `text` is capped at 100 characters. `votes` is a non-negative integer. `status` is one of
  `Hypothesis`, `Confirmed`, `Rejected`.
- **Migration:** if `causeData` receives a legacy combined blob
  (`{"problem": ..., "categories": [...], "causes": [...]}`), its causes are used directly, and
  its problem/categories fill in whenever the dedicated properties are empty. On the next edit
  the control emits the new clean formats.

## Releasing (GitHub)

CI builds the control on every push (`.github/workflows/ci.yml`). Pushing a version tag
publishes a **GitHub Release** with the importable zips attached
(`.github/workflows/release.yml`). To cut a release:

```bash
./release.sh 1.2.1            # bumps control + solution versions, commits, tags v1.2.1
git push origin main --tags   # push -> Actions builds -> Release with zips appears
```

The release contains `FishbonePCF_v<version>.zip` (unmanaged) and
`FishbonePCF_v<version>_managed.zip`, ready to import at make.powerapps.com.

## Project layout

```
package.json / tsconfig.json / pcfconfig.json   project config
eslint.config.mjs             ESLint 9 flat config (required by the build)
FishbonePCF.pcfproj           MSBuild project (lets dotnet build the control)
setup-solution.sh             regenerate the Solution/ wrapper via pac (fallback)
Solution/                     solution wrapper -> importable .zip
  Solution.cdsproj
  src/Other/{Solution,Customizations,Relationships}.xml
Fishbone/
  ControlManifest.Input.xml   control + property definitions
  index.ts                    PCF lifecycle (init/updateView/getOutputs/destroy)
  editor.ts                   the SVG editor: spine, bones, chips, add/edit dialogs
  types.ts                    data model, JSON parse/serialize
  styles.ts                   stylesheet, bundled into the JS and injected at runtime
                              (canvas apps sometimes fail to load a separate css resource)
```
