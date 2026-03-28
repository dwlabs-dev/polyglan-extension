# Polyglan Brand Guidelines Reference

## Quick Reference Card

### Must-Have Elements
✅ Mustard Yellow `#F4A900` for primary CTAs and active states
✅ Chocolate Brown `#000000` for all body text and borders
✅ Cream `#FAF5EE` or Warm Beige `#D4B896` for backgrounds
✅ FreeSans or Nunito as display font — never Inter or Roboto
✅ Pill-shaped buttons (border-radius: 9999px)
✅ Polyglan logo on first page/screen

### Never Use
❌ Generic blue corporate palettes
❌ Purple gradients on white
❌ Pure black `#000000` as background — use Dark Brown `#2C2420`
❌ Pure white `#FFFFFF` as standalone background — use Cream `#FAF5EE`
❌ Inter, Roboto, Arial as display fonts
❌ Bright red for errors — use Terracotta `#C1666B`
❌ More than 4 colors in a single chart or diagram
❌ Drop shadows or 3D effects

---

## Color Codes Reference

### Full Palette (Digital — RGB/Hex)

| Color Name       | Hex Code  | RGB              | Usage                                      |
|------------------|-----------|------------------|--------------------------------------------|
| Mustard Yellow   | `#F4A900` | 244, 169, 0      | Primary CTA, active states, brand identity |
| Muted Gold       | `#C98F00` | 201, 143, 0      | Hover state for Mustard Yellow             |
| Terracotta       | `#C1666B` | 193, 102, 107    | Secondary accent, destructive actions      |
| Dark Terracotta  | `#A0484D` | 160, 72, 77      | Hover state for Terracotta                 |
| Warm Beige       | `#D4B896` | 212, 184, 150    | Main backgrounds, borders                  |
| Light Beige      | `#EDE0D0` | 237, 224, 208    | Hover surfaces, alternating rows           |
| Cream            | `#FAF5EE` | 250, 245, 238    | Page background, card surface              |
| Chocolate Brown  | `#000000` | 74, 64, 58       | Text, borders, UI anchors                  |
| Dark Brown       | `#2C2420` | 44, 36, 32       | Deep backgrounds, overlays, dark mode      |
| Muted Brown      | `#8C7B72` | 140, 123, 114    | Secondary text, muted labels               |

### For Print (CMYK)

| Color Name      | CMYK              | Pantone   |
|-----------------|-------------------|-----------|
| Mustard Yellow  | 0, 31, 100, 4     | 7549 C    |
| Terracotta      | 0, 47, 44, 24     | 7522 C    |
| Chocolate Brown | 0, 14, 22, 71     | 7533 C    |
| Warm Beige      | 0, 13, 29, 17     | 9183 C    |

---

## Typography Reference

| Role         | Font      | Size  | Weight | Color            |
|--------------|-----------|-------|--------|------------------|
| Display / H1 | FreeSans  | 28pt  | Bold   | `#000000`        |
| H2           | FreeSans  | 22pt  | Bold   | `#000000`        |
| H3           | FreeSans  | 16pt  | Bold   | `#000000`        |
| Body         | FreeSans  | 14pt  | Regular| `#000000`        |
| Caption      | FreeSans  | 11pt  | Regular| `#C1666B`        |
| Badge/Tag    | FreeSans  | 10pt  | Bold   | `#2C2420` on `#F4A900` |

---

## Component Patterns

### Buttons

```
Primary:    bg #F4A900  |  text #2C2420  |  hover bg #C98F00  |  radius 9999px
Secondary:  bg #FFFFFF  |  text #000000  |  border #000000    |  radius 9999px
Destructive:bg #C1666B  |  text #FFFFFF  |  hover bg #A0484D  |  radius 9999px
Ghost:      bg transparent | text #000000 | border #D4B896   |  radius 9999px
```

### Cards
```
background:    #FFFFFF or #FAF5EE
border:        1px solid #D4B896
border-radius: 16px
padding:       16px
```

### Avatars
```
background: #000000
text:       #FAF5EE
shape:      circle
font:       FreeSans Bold
```

### Status Badges
```
Active:   bg #F4A900  text #2C2420
Success:  bg #EDE0D0  text #000000
Error:    bg #C1666B  text #FFFFFF
Neutral:  bg #D4B896  text #000000
```

---

## Document Templates

### Slide Footer
```
© 2025 Polyglan | Confidential | Page [X]
```

### Report Header
```
[Logo]     [Document Title]     Page [X] of [Y]
```

### Email Signature
```
[Name]
[Title]
Polyglan | Intelligence in Every Word
[Phone] | [Email]
```

---

## Accessibility Standards

### Color Contrast
- Chocolate Brown `#000000` on Cream `#FAF5EE`: ratio 7.2:1 ✅
- Dark Brown `#2C2420` on Warm Beige `#D4B896`: ratio 5.8:1 ✅
- Cream `#FAF5EE` on Chocolate Brown `#000000`: ratio 7.2:1 ✅
- Dark Brown `#2C2420` on Mustard Yellow `#F4A900`: ratio 6.1:1 ✅
- Minimum contrast ratio: 4.5:1 for body text
- Minimum contrast ratio: 3:1 for large text (18pt+)

### Font Sizes
- Minimum body text: 11pt (print), 14px (digital)
- Minimum caption: 9pt (print), 12px (digital)
- Minimum touch target: 44px height for interactive elements

---

## File Naming Conventions

### Standard Format
```
YYYY-MM-DD_DocumentType_Version_Status.ext
```

### Examples
- `2025-03-20_QuarterlyReport_v2_FINAL.pptx`
- `2025-03-20_SessionAnalysis_v1_DRAFT.xlsx`
- `2025-03-20_TeacherGuide_v3_APPROVED.pdf`

---

## Common Mistakes to Avoid

1. **Wrong yellow**: Using generic amber or orange instead of Mustard Yellow `#F4A900`
2. **Wrong background**: Using pure white `#FFFFFF` instead of Cream `#FAF5EE`
3. **Wrong error color**: Using bright red instead of Terracotta `#C1666B`
4. **Wrong font**: Using Inter, Roboto, or system-ui as display font
5. **Sharp corners**: Buttons must always be pill-shaped (radius 9999px)
6. **Too many colors**: Max 3 brand colors per screen/slide
7. **Low contrast text**: Never use Warm Beige text on Cream background

---

## Context-Specific Guidelines

### Professor Interface
- Active session: Mustard Yellow pulse indicator
- Pause state: Chocolate Brown, reduced opacity
- Student list: Cream cards with Chocolate Brown text and avatar
- Timer: Large, Chocolate Brown digits on Cream background

### Student Interface
- Recording active: Terracotta pulse ring
- Recording paused: Muted Brown, no animation
- Completed: Warm Beige surface, Chocolate Brown checkmark
- Feedback positive: Mustard Yellow accent

### Session Modes
- **História** (1 student): Mustard Yellow badge
- **Debate** (2+ students): Terracotta badge

---

## Version History

| Version | Date     | Changes                          |
|---------|----------|----------------------------------|
| 1.0     | Mar 2025 | Initial Polyglan brand guidelines|

## Contact for Questions

**Design lead**: brand@polyglan.com
**Slack**: #design-system