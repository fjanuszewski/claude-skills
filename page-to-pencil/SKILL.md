---
name: page-to-pencil
description: Use when the user asks to "convertir página a pencil", "capturar página en pencil", "diseñar en pencil desde URL", "page to pencil", "screenshot to pencil", "copiar página a .pen", "recrear UI en pencil", "pasar página a pencil", "capturar UI", "clonar página en pencil", or any variation involving converting a live web page into a Pencil (.pen) design file.
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

### Paso 4: Análisis exhaustivo de la página (via Browser Inspector)

This is the MOST CRITICAL step. Be ULTRA rigorous. **ALL visual properties MUST be extracted from the browser's computed styles — NEVER guess or approximate.**

For each breakpoint screenshot:

**4a — Layout Analysis:**
- Use `browser_snapshot` to get the accessibility tree / DOM structure
- Identify the page layout: sidebar, header, main content, footer
- Use `browser_evaluate` to extract EXACT computed dimensions:
  ```javascript
  // Extract layout dimensions from key structural elements
  const layout = {};
  ['header','nav','aside','main','footer','[class*=sidebar]','[class*=content]'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      layout[sel] = {
        width: rect.width, height: rect.height,
        x: rect.x, y: rect.y,
        display: style.display, flexDirection: style.flexDirection,
        gap: style.gap, padding: style.padding,
        position: style.position
      };
    }
  });
  return layout;
  ```
- Note the grid/flex structure of each section

**4b — Color Extraction (MANDATORY — never guess colors):**
- Use `browser_evaluate` to extract computed styles from ALL visible elements:
  ```javascript
  // Extract ALL unique colors from the page
  const colorMap = new Map();
  document.querySelectorAll('*').forEach(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // skip invisible
    ['backgroundColor','color','borderColor','borderTopColor','borderBottomColor',
     'borderLeftColor','borderRightColor','outlineColor','boxShadow'].forEach(prop => {
      const val = style[prop];
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'none' && val !== 'transparent') {
        if (!colorMap.has(val)) {
          colorMap.set(val, { value: val, sample: el.tagName + '.' + el.className?.split(' ')[0], prop });
        }
      }
    });
  });
  return [...colorMap.values()];
  ```
- Build a color palette from the extracted colors
- Convert all colors to hex format
- **Also extract CSS custom properties (variables):**
  ```javascript
  // Extract CSS variables from :root and body
  const rootStyles = getComputedStyle(document.documentElement);
  const bodyStyles = getComputedStyle(document.body);
  const cssVars = {};
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ':root' || rule.selectorText === 'body') {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--')) {
              cssVars[prop] = rootStyles.getPropertyValue(prop).trim();
            }
          }
        }
      }
    } catch(e) {} // skip cross-origin sheets
  }
  return cssVars;
  ```

**4c — Typography Analysis (MANDATORY — never guess fonts):**
- Use `browser_evaluate` to extract the REAL rendered font information:
  ```javascript
  const textElements = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,button,label,td,th,li,div');
  const fonts = new Map();
  textElements.forEach(el => {
    if (!el.textContent?.trim() || el.children.length > el.childNodes.length) return;
    const style = getComputedStyle(el);
    const key = `${style.fontFamily}|${style.fontSize}|${style.fontWeight}|${style.color}`;
    if (!fonts.has(key)) {
      fonts.set(key, {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        color: style.color,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textTransform: style.textTransform,
        textDecoration: style.textDecoration,
        sample: el.textContent?.trim().substring(0, 50),
        tag: el.tagName
      });
    }
  });
  return [...fonts.values()];
  ```
- **CRITICAL**: Use the FIRST font in the `fontFamily` list (the one actually rendered). If it's a web font (e.g., "Circular Std", "Inter", "DM Sans"), use that exact name. If it's not available in Pencil, find the closest match but document the original.

**4d — Icon Discovery (MANDATORY — never invent icon names):**

Icons MUST be identified from the actual source code or DOM, NEVER guessed. Follow this strict order:

**Step 1 — Source code inspection (preferred, most reliable):**
- Search the codebase for icon imports in the component files that render the current page:
  ```
  Grep for: lucide-react|react-icons|@heroicons|material-icons|@tabler/icons|phosphor-react
  ```
- Read the component files and extract the exact icon component names (e.g., `<Upload />`, `<PenLine />`, `<X />`)
- Map component names to their icon library identifiers (e.g., `Upload` → lucide `upload`, `PenLine` → lucide `pen-line`)

**Step 2 — DOM inspection (when source code is not available):**
- Use `browser_evaluate` to inspect SVG elements and their context:
  ```javascript
  const icons = [];
  document.querySelectorAll('svg').forEach((svg, i) => {
    const parent = svg.parentElement;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    // Try to find icon name from data attributes, class names, or aria labels
    const iconName = svg.getAttribute('data-icon') ||
                     svg.getAttribute('aria-label') ||
                     svg.closest('[data-icon]')?.getAttribute('data-icon') ||
                     parent?.getAttribute('aria-label') ||
                     svg.classList.toString() ||
                     '';
    // Extract SVG path data to fingerprint the icon
    const paths = [...svg.querySelectorAll('path')].map(p => p.getAttribute('d')?.substring(0, 40));
    icons.push({
      index: i,
      iconName,
      width: rect.width,
      height: rect.height,
      color: getComputedStyle(svg).color || getComputedStyle(svg).fill,
      stroke: getComputedStyle(svg).stroke,
      pathCount: svg.querySelectorAll('path').length,
      pathHints: paths.slice(0, 2),
      nearestText: svg.closest('[class]')?.textContent?.trim().substring(0, 40),
      parentClass: parent?.className
    });
  });
  return icons;
  ```

**Step 3 — Cross-reference & validate:**
- Cross-reference with the project's `ui-components` or shared library if available
- If an icon library is identified (e.g., lucide), look up the extracted path data against known icon paths
- **If you STILL cannot identify an icon after Steps 1-3, use a simple geometric placeholder (circle, square) and add a comment noting what the icon looks like — NEVER guess a random icon name**

**4e — Component Structure (extract from DOM, not guessed):**
- For each visible component (buttons, inputs, modals, cards, tables, etc.), use `browser_evaluate`:
  ```javascript
  // Extract exact styles from interactive/structural elements
  const components = [];
  document.querySelectorAll('button, input, select, textarea, [role=dialog], [role=tablist], table, [class*=card], [class*=badge], [class*=modal]').forEach(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    components.push({
      tag: el.tagName,
      role: el.getAttribute('role'),
      text: el.textContent?.trim().substring(0, 40),
      width: rect.width, height: rect.height,
      padding: style.padding,
      borderRadius: style.borderRadius,
      border: style.border,
      backgroundColor: style.backgroundColor,
      color: style.color,
      boxShadow: style.boxShadow,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      cursor: style.cursor,
      opacity: style.opacity
    });
  });
  return components;
  ```

**4f — Spacing & Alignment (extract from DOM):**
- Use `browser_evaluate` on container elements:
  ```javascript
  const containers = [];
  document.querySelectorAll('[class*=container], [class*=wrapper], [class*=row], [class*=col], [class*=flex], [class*=grid], main, section, aside, header, footer').forEach(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    containers.push({
      class: el.className?.toString().substring(0, 60),
      display: style.display,
      flexDirection: style.flexDirection,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      gap: style.gap,
      padding: style.padding,
      margin: style.margin,
      width: rect.width, height: rect.height
    });
  });
  return containers;
  ```

**4g — CSS Stylesheets Inspection (for hidden/dynamic styles):**
- Use `browser_evaluate` to extract relevant CSS rules that might affect hover, active, focus states:
  ```javascript
  // Look for gradient definitions, animations, transitions
  const gradients = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        const text = rule.cssText || '';
        if (text.includes('gradient') || text.includes('transition') || text.includes('@keyframes')) {
          gradients.push(text.substring(0, 200));
        }
      }
    } catch(e) {}
  }
  return gradients.slice(0, 20);
  ```

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

**IMPORTANT — Batch operations & INCREMENTAL PERSISTENCE:**
- Use `batch_design` with maximum 25 operations per call
- Work in logical chunks: sidebar first, then header, then main content sections
- After each batch, use `get_screenshot` to verify the result matches the original
- **PERSIST TO DISK AFTER EVERY LOGICAL SECTION** (see Paso 6e below). This prevents data loss if the session is interrupted or if `open_document` is called accidentally.

**6e — Incremental Save (CRITICAL — do this after EVERY section):**

After completing each logical section (e.g., sidebar done, header done, first modal done, etc.):

1. Use `batch_get` with the root canvas pattern and `readDepth: 15` to export the full JSON
2. Use the `Write` tool to save the JSON to `{{PEN_FILE_PATH}}`
3. Continue building the next section

**Why this matters**: Pencil MCP works in-memory. If you call `open_document` again, it reloads from disk and ALL unsaved in-memory changes are LOST. By saving after each section, you guarantee that at most one section of work can be lost.

**Save frequency guideline:**
- After building each major frame (root frame + background) → SAVE
- After building each section within a frame (sidebar, header, content) → SAVE
- After building each modal or overlay → SAVE
- Before any `get_screenshot` that requires `open_document` → SAVE
- After any visual fix/correction iteration → SAVE
- **Rule of thumb: if you've done more than 2 `batch_design` calls since last save → SAVE NOW**

**WARNING**: NEVER call `open_document` after making batch_design changes without saving first. `open_document` reloads from disk and destroys all unsaved in-memory work.

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

### Paso 8: Persistir a disco (final save)

**CRITICAL**: Pencil MCP tools work in-memory. Changes do NOT auto-save to disk.

If you followed Paso 6e correctly, the file should already be mostly up to date. Do one final save:

1. Use `batch_get` with `readDepth: 15` and the root node pattern to export the full JSON tree
2. Read the current file on disk first with the `Read` tool (this prevents "file modified since read" errors)
3. Use the `Write` tool to save the JSON to `{{PEN_FILE_PATH}}`
4. Confirm the file was written successfully

**Troubleshooting persistence:**
- If `Write` fails with "file has been modified since read", read the file again with `Read` and retry `Write`
- If the .pen file on disk appears empty or corrupted, re-export with `batch_get` and overwrite
- Always verify persistence by reading the file back and checking node count

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

### Extraction rules — NEVER guess, ALWAYS extract

1. **NUNCA inventar colores** — SIEMPRE extraer del `getComputedStyle()` via `browser_evaluate`. Convertir rgb/rgba a hex. Si hay CSS variables, extraerlas también.
2. **NUNCA usar fuentes genéricas** — SIEMPRE extraer `fontFamily` del computed style. Usar la PRIMERA fuente de la lista (la que realmente se renderiza). Si Pencil no la soporta, documentar la fuente real y usar la más cercana disponible.
3. **NUNCA adivinar iconos** — Seguir el proceso estricto de 3 pasos del Paso 4d:
   - Paso 1: Buscar en el código fuente los imports exactos del icon library
   - Paso 2: Inspeccionar el DOM con `browser_evaluate` para obtener `data-icon`, `aria-label`, o path data del SVG
   - Paso 3: Cross-reference con la librería del proyecto
   - Si después de los 3 pasos no se identifica → usar placeholder geométrico, NUNCA un nombre inventado
4. **NUNCA aproximar dimensiones** — SIEMPRE usar `getBoundingClientRect()` y `getComputedStyle()` via `browser_evaluate`. Padding, margin, gap, border-radius: todos extraídos del DOM.
5. **NUNCA asumir estilos de botones/inputs/componentes** — SIEMPRE extraer background, color, border, border-radius, padding, font-size, font-weight del computed style de cada elemento.

### Structural rules

6. **Sidebar obligatorio** — si la página tiene sidebar, DEBE estar en el diseño
7. **Verificación visual obligatoria** — SIEMPRE hacer `get_screenshot` después de construir y comparar con el original
8. **Iterar hasta que sea perfecto** — no dar por terminado hasta que la verificación visual pase todos los criterios
9. **Cada texto visible** en el screenshot DEBE tener su equivalente en el .pen — no omitir ningún texto, label, o badge

### Persistence rules — SAVE EARLY, SAVE OFTEN

10. **Persistir incrementalmente** — guardar a disco después de CADA sección lógica completada (ver Paso 6e). Nunca esperar al final para guardar.
11. **NUNCA llamar `open_document` después de hacer `batch_design` sin guardar primero** — `open_document` recarga desde disco y destruye todo el trabajo en memoria no guardado.
12. **Verificar persistencia** — después de cada save, confirmar que el archivo se escribió correctamente. Si falla, reintentar inmediatamente.
13. **Regla de 2 batches** — si hiciste más de 2 llamadas a `batch_design` desde el último save, guardar AHORA antes de cualquier otra operación.

### Project integration rules

14. **Si hay un proyecto local**, buscar en `ui-components` o librerías compartidas para obtener los componentes, colores y variables exactas del design system
15. **Inspeccionar CSS variables y themes** — buscar `:root` y `[data-theme]` para obtener el sistema de colores completo antes de empezar a diseñar
16. **Buscar stylesheets con gradients, shadows y transitions** — extraer estas definiciones del CSS para replicarlas fielmente
