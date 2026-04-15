# Design System Strategy: Midnight Glass Editorial

## 1. Overview & Creative North Star: "The Sovereign Intelligence"
This design system is not merely a utility; it is a digital environment designed to command respect. The Creative North Star is **"The Sovereign Intelligence"**—a concept that treats enterprise resource planning as a high-stakes, editorial experience. 

We depart from the cluttered, "dashboard-itis" of standard ERPs by utilizing high-contrast typographic scales, intentional asymmetry, and depth. The layout mimics the physical weight of premium obsidian and frosted crystal. By embracing RTL-first logic as a core structural pillar rather than an afterthought, we ensure the flow feels natural, authoritative, and liquid.

---

## 2. Colors & Materiality
The palette is rooted in the absence of light, using **Midnight Glass** textures to create a sense of infinite depth.

### The Palette
- **Core Surface:** `surface` (#131314) serves as our "infinite" base.
- **Primary Action (Nijjara Gold):** `primary` (#e9c176) and `primary_container` (#c5a059). Used exclusively for high-intent actions.
- **Secondary (Metallic Silver):** `secondary` (#c4c6cc). Used for supplementary data and iconography.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for structural sectioning. Information architecture must be defined through **Background Shift**:
- Main layout: `surface`
- Sidebar/Navigation: `surface_container_low`
- Internal Content Modules: `surface_container`
- Floating Modals: `surface_container_high`

### The "Glass & Gradient" Rule
To achieve the "Midnight Glass" aesthetic, use `surface_variant` with a `backdrop-filter: blur(20px)` and a 10% opacity. 
- **Signature Glow:** For primary CTAs, apply a subtle linear gradient from `primary` to `primary_container` at a 135-degree angle. This provides a "soul" to the action button that flat colors lack.

---

## 3. Typography: The Arabic-First Hierarchy
We utilize **Cairo** as our primary typeface to ensure that Arabic script carries the "Expensive" and "Serious" tone required.

- **Display (The Statement):** `display-lg` (56px) / `manrope`. Used for high-level financial totals or hero greetings.
- **Headline (The Authority):** `headline-md` (28px) / `manrope`. Reserved for section titles.
- **Body (The Intel):** `body-md` (14px) / `inter`. Optimized for high-density data legibility.
- **Label (The Metadata):** `label-sm` (11px) / `inter`. All-caps (for English) or bolded (for Arabic) to denote micro-data.

**Editorial Tip:** Use `primary` (#e9c176) sparingly in typography—only for links or critical status updates—to maintain the serious, monochromatic prestige of the interface.

---

## 4. Elevation & Depth: Tonal Layering
In this system, depth is a function of light, not lines.

### The Layering Principle
Hierarchy is achieved by "stacking" surface tiers. An inner card (`surface_container_highest`) should sit inside a module (`surface_container`) which sits on the global background (`surface`). This creates natural "lift."

### Ambient Shadows
For floating elements like notification panels:
- **Shadow:** Use `on_surface` at 5% opacity.
- **Blur:** 40px to 60px.
- **Spread:** -10px to ensure the shadow feels like an "aura" rather than a hard drop.

### The "Ghost Border" Fallback
Where separation is critical for accessibility (e.g., input fields), use a **Ghost Border**: `outline_variant` at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### High-Density Data Tables
- **Headers:** Use `surface_container_high` with a 12px blur. No vertical dividers.
- **Rows:** Transitions between `surface` and `surface_container_low` on hover.
- **Separation:** Use a 12px `0.75rem` vertical gap between rows rather than a line.

### Sophisticated Form Fields
- **Resting:** `surface_container_lowest` with a Ghost Border.
- **Focus:** The border transitions to `primary` (#e9c176) at 40% opacity, with an **internal glow** (box-shadow: inset 0 0 8px) using the `primary` token at 10% opacity.
- **Label:** Arabic labels sit top-right, utilizing `label-md` in `on_surface_variant`.

### Actionable Notification Panels
- **Material:** 80% opacity `surface_container_highest` with a 30px backdrop blur.
- **Layout:** Asymmetric. The "Close" action is a Ghost Button, while the "View" action is a Primary Silver `secondary` button.

### Buttons
- **Primary:** `primary_container` background with `on_primary_container` text. 
- **Secondary:** `surface_variant` background with a subtle metallic `outline`.
- **Shape:** Use `md` (0.375rem) roundedness to maintain a sharp, professional "Enterprise" look.

---

## 6. Do’s and Don’ts

### Do:
- **Prioritize Negative Space:** Use the `16` (3.5rem) spacing token to separate major functional blocks.
- **RTL-First Thinking:** Ensure that the visual "weight" (e.g., glass blurs or primary accents) starts from the right and flows naturally to the left.
- **Tonal Transitions:** Use background color shifts to guide the user’s eye through the ERP workflow.

### Don’t:
- **Don't use pure white:** Never use #FFFFFF. Use `on_surface` (#e5e2e3) to prevent eye strain in dark environments.
- **Don't use standard shadows:** Avoid high-opacity, small-blur shadows. They look "cheap."
- **Don't use divider lines:** If you feel the need to draw a line, try adding 8px of padding or shifting the background tone instead. 
- **Don't over-round:** Avoid the `full` or `xl` corner radius for main containers; it softens the "Serious/Futuristic" tone too much. Stick to `md` and `lg`.