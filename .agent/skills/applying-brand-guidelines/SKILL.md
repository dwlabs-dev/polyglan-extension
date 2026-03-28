---
name: applying-brand-guidelines
description: This skill applies consistent Polyglan branding and styling to all generated documents including colors, fonts, layouts, and messaging
---

# Polyglan Brand Guidelines Skill

This skill ensures all generated documents, interfaces, and components adhere to Polyglan brand standards for consistent, premium communication.

## Brand Identity

### Company: Polyglan
**Tagline**: "Intelligence in Every Word"
**Industry**: AI-powered education technology
**Aesthetic**: Golden Hour — warm, sophisticated, high-contrast

## Visual Standards

### Color Palette

**Primary Colors**:
- **Mustard Yellow**: `#F4A900` (RGB: 244, 169, 0) — Primary CTA buttons, active states, brand identity
- **Terracotta**: `#C1666B` (RGB: 193, 102, 107) — Secondary accents, destructive actions, alert states
- **Warm Beige**: `#D4B896` (RGB: 212, 184, 150) — Main backgrounds, soft surfaces
- **Chocolate Brown**: `#000000` (RGB: 74, 64, 58) — High-contrast text, borders, UI anchors

**Extended Palette**:
- **Dark Brown**: `#2C2420` — Deep backgrounds, overlays
- **Light Beige**: `#EDE0D0` — Hover states, subtle surfaces
- **Cream**: `#FAF5EE` — Page backgrounds, card surfaces
- **Muted Gold**: `#C98F00` — Hover state for Mustard Yellow
- **Dark Terracotta**: `#A0484D` — Hover state for Terracotta

### Typography

**Primary Font Family**: FreeSans, Nunito, DM Sans, sans-serif

**Font Hierarchy**:
- **H1**: 28pt, Bold, Chocolate Brown
- **H2**: 22pt, Bold, Chocolate Brown
- **H3**: 16pt, Bold, Chocolate Brown
- **Body**: 14pt, Regular, Chocolate Brown
- **Caption**: 11pt, Regular, Terracotta or muted Chocolate Brown
- **Label/Tag**: 10pt, Bold, uppercase, letter-spacing 0.15em

**Rules**:
- Never use Inter, Roboto, Arial, or generic system fonts as display fonts
- Always pair a bold display weight with regular body weight
- Sentence case for UI labels — never ALL CAPS except for small badge tags

### Logo Usage

- Position: Top-left corner, all screens and documents
- Color on light backgrounds: Mustard Yellow `#F4A900`
- Color on dark backgrounds: Cream `#FAF5EE`
- Clear space: Minimum 16px padding on all sides
- Never distort, recolor outside approved palette, or apply effects

## Interface & Document Standards

### React / Frontend Components

**Color application**:
- Page background: `#FAF5EE` (Cream) or `#D4B896` (Warm Beige)
- Card/surface background: `#FFFFFF` or `#EDE0D0`
- Primary button: `#F4A900` background, `#2C2420` text, border-radius full (pill)
- Secondary button: `#FFFFFF` background, `#000000` border and text
- Destructive button: `#C1666B` background, `#FFFFFF` text
- Active/selected state: `#F4A900` border, `#FFFFFF` background
- Text primary: `#000000`
- Text secondary: `#8C7B72`
- Border default: `#D4B896`
- Border active: `#000000`

**Component patterns**:
- Buttons: `border-radius: 9999px` (pill shape), font-weight bold, uppercase tracking
- Cards: `border-radius: 16px`, `border: 1px solid #D4B896`
- Avatars: circular, background `#000000`, text `#FAF5EE`
- Badges/tags: pill shape, `#F4A900` background, `#2C2420` text
- Inputs: `border-radius: 12px`, border `#D4B896`, focus border `#F4A900`
- Dividers: `1px solid #D4B896`

**Animation**:
- Transitions: `150ms ease` for hover, `250ms ease` for state changes
- Active press: `scale(0.97)`
- Entry animations: `fadeInUp` with `translateY(6px)`
- Timer pulse: warm amber glow, `1.5s ease-in-out infinite`

### PowerPoint Presentations

**Slide Templates**:
1. **Title Slide**: Warm Beige background, Mustard Yellow logo, Chocolate Brown title
2. **Section Divider**: Chocolate Brown background, Cream text, Mustard Yellow accent line
3. **Content Slide**: Cream background, Chocolate Brown title bar, body text in Chocolate Brown
4. **Data Slide**: Charts use Polyglan color palette exclusively

**Layout Rules**:
- Margins: 0.5 inches all sides
- Title bar: Chocolate Brown background, Cream text
- Bullet indentation: 0.25 inches per level
- Maximum 6 bullet points per slide
- No 3D effects, no gradients, no drop shadows

### Excel Spreadsheets

**Formatting Standards**:
- **Headers**: Row 1, Bold, Cream text on Chocolate Brown background
- **Subheaders**: Bold, Chocolate Brown text, Light Beige background
- **Data cells**: Regular, Chocolate Brown text
- **Borders**: Thin, Warm Beige `#D4B896`
- **Alternating rows**: Cream `#FAF5EE`

**Chart Defaults**:
- Primary series: Mustard Yellow `#F4A900`
- Secondary series: Terracotta `#C1666B`
- Tertiary series: Chocolate Brown `#000000`
- Gridlines: Warm Beige, 0.5pt
- No 3D effects or gradients

### PDF Documents

**Page Layout**:
- **Header**: Polyglan logo left, document title center, page number right
- **Footer**: Copyright left, date center, classification right
- **Margins**: 1 inch all sides
- **Line spacing**: 1.15
- **Paragraph spacing**: 12pt after

**Section Formatting**:
- Main headings: Mustard Yellow `#F4A900`, 18pt, bold
- Subheadings: Chocolate Brown `#000000`, 14pt, bold
- Body text: Chocolate Brown `#000000`, 11pt, regular
- Captions: Terracotta `#C1666B`, 9pt, italic

## Content Guidelines

### Tone of Voice

- **Warm but precise**: Approachable without being casual
- **Empowering**: Focus on what teachers and students can achieve
- **Confident**: Avoid hedging language
- **Inclusive**: Address both professor and student perspectives

### Prohibited Elements

Never use:
- Purple gradients on white backgrounds
- Generic blue corporate palettes
- Comic Sans, Papyrus, or decorative novelty fonts
- Rainbow colors or multi-stop gradients
- Cold or sterile color combinations
- Competitor branding or references

## Quality Checklist

Before finalizing any output:
1. All colors match Polyglan palette exactly — no approximations
2. Font is FreeSans or approved fallback, never Inter or Roboto
3. Primary CTA uses Mustard Yellow with Chocolate Brown text
4. Destructive actions use Terracotta, not red
5. Logo present on first page/slide/screen
6. Dark mode surfaces use `#2C2420` or `#000000`, not pure black
7. No pure white `#FFFFFF` as standalone background — use Cream `#FAF5EE`

## Scripts

- `apply_brand.py`: Automatically applies Polyglan brand formatting to documents
- `validate_brand.py`: Checks documents and components for brand compliance