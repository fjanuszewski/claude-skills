---
name: page-to-pencil
description: Use when the user asks to "convertir página a pencil", "capturar página en pencil", "diseñar en pencil desde URL", "page to pencil", "screenshot to pencil", "copiar página a .pen", "recrear UI en pencil", "pasar página a pencil", "capturar UI", "clonar página en pencil", or any variation involving converting a live web page into a Pencil (.pen) design file.
version: 0.1.0
---

# Page to Pencil Skill

Capture a live web page using Playwright and faithfully recreate it as a Pencil (.pen) design file. The result is a pixel-accurate design that matches the original page's layout, colors, typography, icons, and component structure.

## Requisitos

- **Pencil MCP server** must be available (provides `batch_design`, `batch_get`, `get_screenshot`, etc.)
- **Playwright MCP server** must be available (provides `browser_navigate`, `browser_take_screenshot`, etc.)
- A running local or remote web page URL

## Flujo de ejecución

### Paso 1: Recolectar configuración

Use `AskUserQuestion` to gather (combine into 1–2 questions max):

| Variable | Pregunta | Default |
|----------|---------|---------|
| `{{PAGE_URL}}` | URL de la página a capturar | — (requerido) |
| `{{PEN_FILE_PATH}}` | Path del archivo .pen de salida | `./design.pen` |
| `{{BREAKPOINTS}}` | Breakpoints a capturar | `desktop` (1440x900) |
| `{{NEEDS_LOGIN}}` | ¿La página requiere autenticación? | No |

**Breakpoints disponibles** (ofrecer como multiSelect):
- `mobile` — 375x812 (iPhone 14)
- `tablet` — 768x1024 (iPad)
- `desktop` — 1440x900 (Standard)
- `desktop-xl` — 1920x1080 (Full HD)

If the user already provided some of these values in their message, skip asking for them.

### Paso 2: Preparar Playwright

Use the Playwright MCP tools:

1. Navigate to `{{PAGE_URL}}` using `browser_navigate`
2. If `{{NEEDS_LOGIN}}` is true:
   - Take a screenshot to show the login page to the user
   - Ask the user: "Por favor logueate manualmente en el browser de Playwright y avisame cuando estés listo." OR ask for credentials
   - Wait for the user to confirm they are logged in
   - Navigate again to `{{PAGE_URL}}` after login

### Paso 3: Captura de pantallas por breakpoint

For each breakpoint in `{{BREAKPOINTS}}`:

1. Resize the browser to the breakpoint dimensions using `browser_resize`
2. Wait for the page to stabilize (use `browser_wait_for` if needed)
3. Take a **full-page screenshot** using `browser_take_screenshot`
4. Save/note the screenshot for reference during design

**IMPORTANT**: Take the screenshot and analyze it carefully. This is your primary visual reference.

### Paso 4: Análisis exhaustivo de la página

This is the MOST CRITICAL step. Be ULTRA rigorous. For each breakpoint screenshot:

**4a — Layout Analysis:**
- Use `browser_snapshot` to get the accessibility tree / DOM structure
- Identify the page layout: sidebar, header, main content, footer
- Measure exact dimensions: sidebar width, header height, content padding
- Note the grid/flex structure of each section

**4b — Color Extraction:**
- Use `browser_evaluate` to extract computed styles from key elements:
  ```javascript
  // Extract background colors, text colors, border colors
  const elements = document.querySelectorAll('*');
  const colors = new Set();
  elements.forEach(el => {
    const style = getComputedStyle(el);
    colors.add(style.backgroundColor);
    colors.add(style.color);
    colors.add(style.borderColor);
  });
  return [...colors].filter(c => c !== 'rgba(0, 0, 0, 0)');
  ```
- Build a color palette from the extracted colors
- Convert all colors to hex format

**4c — Typography Analysis:**
- Use `browser_evaluate` to extract font information:
  ```javascript
  const textElements = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,button,label,td,th,li');
  const fonts = new Map();
  textElements.forEach(el => {
    const style = getComputedStyle(el);
    const key = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${style.color}`;
    if (!fonts.has(key)) {
      fonts.set(key, {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        lineHeight: style.lineHeight,
        sample: el.textContent?.substring(0, 50)
      });
    }
  });
  return [...fonts.values()];
  ```

**4d — Icon Discovery:**
- Search the codebase for icon imports if the project is local:
  - Grep for `lucide-react`, `react-icons`, `@heroicons`, `material-icons`, or SVG icon imports
  - Read the component files that render the current page to find exact icon names
- Use `browser_evaluate` to find SVG elements and icon classes:
  ```javascript
  const svgs = document.querySelectorAll('svg');
  return [...svgs].map(svg => ({
    parent: svg.parentElement?.className,
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
    viewBox: svg.getAttribute('viewBox'),
    nearestText: svg.closest('[class]')?.textContent?.substring(0, 30)
  }));
  ```
- Cross-reference with the project's `ui-components` or shared library if available

**4e — Component Structure:**
- Identify all UI components: buttons, inputs, modals, cards, tables, dropdowns, tabs, badges
- For each component, extract: dimensions, padding, border-radius, shadows, hover states
- Note interactive elements: buttons with specific styles, active/inactive states, selected tabs

**4f — Spacing & Alignment:**
- Extract gap values, margins, padding for all containers
- Note alignment patterns (center, start, end, space-between)

### Paso 5: Abrir o crear archivo .pen

1. Use `get_editor_state` to check current Pencil state
2. Use `open_document` with `{{PEN_FILE_PATH}}`:
   - If the file exists, open it
   - If it doesn't exist, pass `new` to create a blank .pen file, then the user must save it to the desired path

### Paso 6: Construir el diseño en Pencil

For each breakpoint, create a frame in the .pen file. Work section by section, from outside-in:

**6a — Root Frame:**
- Create the root frame with exact breakpoint dimensions (e.g., 1440x900)
- Set background color to match the page body
- Name it descriptively: `"{{PAGE_NAME}} - {{BREAKPOINT}}"`

**6b — Layout Skeleton (order matters):**
1. **Sidebar** (if present): exact width, background, border
2. **Header/Navbar** (if present): exact height, background, border
3. **Main content area**: fills remaining space
4. **Footer** (if present): exact height, background

**6c — Build each section top-to-bottom:**

For each section in the page:
1. Create the container with exact dimensions, background, padding, border-radius
2. Add child elements in order: headings, text, buttons, icons, images
3. For text elements: match font-family, font-size, font-weight, color, line-height EXACTLY
4. For buttons: match background, text color, border, border-radius, padding EXACTLY
5. For icons: use the correct icon name from the project's icon library (lucide, heroicons, etc.)
6. For images: use placeholder rectangles with the correct aspect ratio, or use `G()` to generate approximations
7. For tables: recreate header row + sample data rows with correct column widths

**6d — Active/Selected States:**
- If a nav item is active, apply the active style (background change, indicator bar, bold text)
- If a tab is selected, apply the selected style (border-bottom, color change)
- Match hover-like visual states that are visible in the screenshot

**IMPORTANT — Batch operations:**
- Use `batch_design` with maximum 25 operations per call
- Work in logical chunks: sidebar first, then header, then main content sections
- After each batch, use `get_screenshot` to verify the result matches the original

### Paso 7: Validación visual rigurosa

After building the full design:

1. Use `get_screenshot` on the root frame to capture the .pen result
2. Compare side-by-side with the original Playwright screenshot
3. Check these criteria with ZERO tolerance:

| Criterio | Validación |
|----------|-----------|
| **Layout** | Sidebar width, header height, content area proportions match |
| **Colors** | Background, text, border, accent colors are identical (hex match) |
| **Typography** | Font family, size, weight, line-height match for every text element |
| **Icons** | Correct icon names, correct sizes, correct colors |
| **Spacing** | Gaps, padding, margins are visually consistent |
| **Components** | Buttons, inputs, cards, badges look identical |
| **Active states** | Selected nav items, active tabs are visually marked |
| **Borders** | Border width, color, radius match exactly |
| **Shadows** | Box shadows are present where the original has them |

4. If ANY criterion fails:
   - Identify the specific mismatch
   - Fix it using `batch_design` with update operations
   - Re-verify with `get_screenshot`
   - Repeat until the design passes ALL criteria

### Paso 8: Persistir a disco

**CRITICAL**: Pencil MCP tools work in-memory. Changes do NOT auto-save to disk.

1. Use `batch_get` with `readDepth: 15` and the root node pattern to export the full JSON tree
2. Use the `Write` tool to save the JSON to `{{PEN_FILE_PATH}}`
3. Confirm the file was written successfully

### Paso 9: Multi-breakpoint (si aplica)

If multiple breakpoints were requested:
- Repeat Pasos 3–8 for each breakpoint
- Each breakpoint gets its own root frame on the canvas
- Use `find_empty_space_on_canvas` to position each frame without overlap
- Name each frame with the breakpoint label: `"Page Name - Desktop"`, `"Page Name - Mobile"`, etc.

### Paso 10: Reportar resultado

Show a minimal summary:

```
Done. Diseño guardado en {{PEN_FILE_PATH}}

Breakpoints capturados:
  - desktop (1440x900) ✓
  - mobile (375x812) ✓  (if applicable)

Abrí el archivo en Pencil para revisarlo.
```

## Reglas de exigencia (ULTRA strict)

1. **NUNCA inventar colores** — siempre extraer del computed style o del screenshot
2. **NUNCA usar fuentes genéricas** — extraer la font-family exacta de la página
3. **NUNCA adivinar iconos** — buscar en el código fuente el nombre exacto del icono; si no se encuentra, usar `browser_evaluate` para inspeccionar el SVG
4. **NUNCA aproximar dimensiones** — usar valores extraídos del DOM, no "a ojo"
5. **Sidebar obligatorio** — si la página tiene sidebar, DEBE estar en el diseño
6. **Verificación visual obligatoria** — SIEMPRE hacer `get_screenshot` después de construir y comparar con el original
7. **Iterar hasta que sea perfecto** — no dar por terminado hasta que la verificación visual pase todos los criterios
8. **Persistir siempre a disco** — nunca olvidar el Paso 8; el diseño debe quedar guardado en el archivo .pen
9. **Si hay un proyecto local**, buscar en `ui-components` o librerías compartidas para obtener los componentes, colores y variables exactas del design system
10. **Cada texto visible** en el screenshot DEBE tener su equivalente en el .pen — no omitir ningún texto, label, o badge
