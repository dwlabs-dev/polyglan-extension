"""
Brand application module for Polyglan document and interface styling.
Applies consistent Polyglan branding to Excel, PowerPoint, PDF documents and React components.
"""

from typing import Any


class BrandFormatter:
    """Apply Polyglan brand guidelines to documents and interfaces."""

    # Polyglan color definitions — Golden Hour Edition
    COLORS = {
        "primary": {
            "mustard_yellow": {"hex": "#F4A900", "rgb": (244, 169, 0)},
            "terracotta":     {"hex": "#C1666B", "rgb": (193, 102, 107)},
            "warm_beige":     {"hex": "#D4B896", "rgb": (212, 184, 150)},
            "chocolate_brown":{"hex": "#000000", "rgb": (74, 64, 58)},
        },
        "extended": {
            "dark_brown":       {"hex": "#2C2420", "rgb": (44, 36, 32)},
            "light_beige":      {"hex": "#EDE0D0", "rgb": (237, 224, 208)},
            "cream":            {"hex": "#FAF5EE", "rgb": (250, 245, 238)},
            "muted_gold":       {"hex": "#C98F00", "rgb": (201, 143, 0)},
            "dark_terracotta":  {"hex": "#A0484D", "rgb": (160, 72, 77)},
            "muted_brown":      {"hex": "#8C7B72", "rgb": (140, 123, 114)},
        },
    }

    # Font definitions
    FONTS = {
        "primary": "FreeSans",
        "fallback": ["Nunito", "DM Sans", "sans-serif"],
        "sizes": {"h1": 28, "h2": 22, "h3": 16, "body": 14, "caption": 11, "badge": 10},
        "weights": {"regular": 400, "bold": 700},
    }

    # Company information
    COMPANY = {
        "name": "Polyglan",
        "tagline": "Intelligence in Every Word",
        "copyright": "© 2025 Polyglan. All rights reserved.",
        "website": "polyglan.com",
        "logo_path": "assets/polyglan_logo.png",
    }

    # Session mode definitions
    MODES = {
        "historia": {
            "label": "História",
            "min_participants": 1,
            "max_participants": 1,
            "badge_color": "#F4A900",
            "badge_text_color": "#2C2420",
        },
        "debate": {
            "label": "Debate",
            "min_participants": 2,
            "max_participants": None,
            "badge_color": "#C1666B",
            "badge_text_color": "#FFFFFF",
        },
    }

    def __init__(self):
        self.colors = self.COLORS
        self.fonts = self.FONTS
        self.company = self.COMPANY
        self.modes = self.MODES

    def get_react_theme(self) -> dict[str, Any]:
        """
        Return Polyglan theme tokens for React/CSS-in-JS usage.
        Use these as CSS custom properties or Tailwind config values.
        """
        return {
            "colors": {
                "--color-primary":          self.colors["primary"]["mustard_yellow"]["hex"],
                "--color-primary-hover":    self.colors["extended"]["muted_gold"]["hex"],
                "--color-primary-soft":     self.colors["extended"]["light_beige"]["hex"],
                "--color-secondary":        self.colors["primary"]["terracotta"]["hex"],
                "--color-secondary-hover":  self.colors["extended"]["dark_terracotta"]["hex"],
                "--color-bg":               self.colors["extended"]["cream"]["hex"],
                "--color-surface":          "#FFFFFF",
                "--color-surface-alt":      self.colors["extended"]["light_beige"]["hex"],
                "--color-border":           self.colors["primary"]["warm_beige"]["hex"],
                "--color-border-active":    self.colors["primary"]["chocolate_brown"]["hex"],
                "--color-text-primary":     self.colors["primary"]["chocolate_brown"]["hex"],
                "--color-text-secondary":   self.colors["extended"]["muted_brown"]["hex"],
                "--color-text-on-primary":  self.colors["extended"]["dark_brown"]["hex"],
                "--color-text-on-dark":     self.colors["extended"]["cream"]["hex"],
                "--color-overlay":          self.colors["extended"]["dark_brown"]["hex"],
            },
            "typography": {
                "--font-display": "FreeSans, Nunito, DM Sans, sans-serif",
                "--font-body":    "FreeSans, Nunito, DM Sans, sans-serif",
                "--font-mono":    "JetBrains Mono, monospace",
            },
            "radii": {
                "--radius-sm":   "8px",
                "--radius-md":   "12px",
                "--radius-lg":   "16px",
                "--radius-xl":   "24px",
                "--radius-full": "9999px",
            },
            "spacing": {
                "--space-1": "4px",  "--space-2": "8px",
                "--space-3": "12px", "--space-4": "16px",
                "--space-5": "20px", "--space-6": "24px",
                "--space-8": "32px", "--space-10": "40px",
            },
        }

    def format_excel(self, workbook_config: dict[str, Any]) -> dict[str, Any]:
        """Apply Polyglan brand formatting to Excel workbook configuration."""
        branded_config = workbook_config.copy()

        branded_config["header_style"] = {
            "font": {
                "name": self.fonts["primary"],
                "size": self.fonts["sizes"]["body"],
                "bold": True,
                "color": self.colors["extended"]["cream"]["hex"],
            },
            "fill": {
                "type": "solid",
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
            },
            "alignment": {"horizontal": "center", "vertical": "center"},
            "border": {
                "style": "thin",
                "color": self.colors["primary"]["warm_beige"]["hex"],
            },
        }

        branded_config["cell_style"] = {
            "font": {
                "name": self.fonts["primary"],
                "size": self.fonts["sizes"]["body"],
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
            },
            "alignment": {"horizontal": "left", "vertical": "center"},
        }

        branded_config["alternating_rows"] = {
            "enabled": True,
            "color": self.colors["extended"]["cream"]["hex"],
        }

        branded_config["chart_colors"] = [
            self.colors["primary"]["mustard_yellow"]["hex"],
            self.colors["primary"]["terracotta"]["hex"],
            self.colors["primary"]["chocolate_brown"]["hex"],
            self.colors["extended"]["muted_brown"]["hex"],
        ]

        return branded_config

    def format_powerpoint(self, presentation_config: dict[str, Any]) -> dict[str, Any]:
        """Apply Polyglan brand formatting to PowerPoint presentation configuration."""
        branded_config = presentation_config.copy()

        branded_config["master"] = {
            "background_color": self.colors["extended"]["cream"]["hex"],
            "title_area": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["h1"],
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
                "bold": True,
                "position": {"x": 0.5, "y": 0.15, "width": 9, "height": 1},
            },
            "content_area": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["body"],
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
                "position": {"x": 0.5, "y": 2, "width": 9, "height": 5},
            },
            "footer": {
                "show_slide_number": True,
                "show_date": True,
                "company_name": self.company["name"],
                "color": self.colors["extended"]["muted_brown"]["hex"],
            },
        }

        branded_config["title_slide"] = {
            "background": self.colors["primary"]["warm_beige"]["hex"],
            "title_color": self.colors["primary"]["chocolate_brown"]["hex"],
            "subtitle_color": self.colors["primary"]["chocolate_brown"]["hex"],
            "accent_color": self.colors["primary"]["mustard_yellow"]["hex"],
            "include_logo": True,
            "logo_position": {"x": 0.5, "y": 0.5, "width": 2},
        }

        branded_config["content_slide"] = {
            "title_bar": {
                "background": self.colors["primary"]["chocolate_brown"]["hex"],
                "text_color": self.colors["extended"]["cream"]["hex"],
                "height": 1,
            },
            "bullet_style": {
                "level1": "•",
                "level2": "○",
                "level3": "▪",
                "indent": 0.25,
                "color": self.colors["primary"]["mustard_yellow"]["hex"],
            },
        }

        branded_config["charts"] = {
            "color_scheme": [
                self.colors["primary"]["mustard_yellow"]["hex"],
                self.colors["primary"]["terracotta"]["hex"],
                self.colors["primary"]["chocolate_brown"]["hex"],
                self.colors["extended"]["muted_brown"]["hex"],
            ],
            "gridlines": {
                "color": self.colors["primary"]["warm_beige"]["hex"],
                "width": 0.5,
            },
            "font": {
                "name": self.fonts["primary"],
                "size": self.fonts["sizes"]["caption"],
            },
        }

        return branded_config

    def format_pdf(self, document_config: dict[str, Any]) -> dict[str, Any]:
        """Apply Polyglan brand formatting to PDF document configuration."""
        branded_config = document_config.copy()

        branded_config["page"] = {
            "margins": {"top": 1, "bottom": 1, "left": 1, "right": 1},
            "size": "letter",
            "orientation": "portrait",
            "background": self.colors["extended"]["cream"]["hex"],
        }

        branded_config["header"] = {
            "height": 0.75,
            "border_bottom": f"1px solid {self.colors['primary']['warm_beige']['hex']}",
            "content": {
                "left": {"type": "logo", "width": 1.5},
                "center": {
                    "type": "text",
                    "content": document_config.get("title", "Document"),
                    "font": self.fonts["primary"],
                    "size": self.fonts["sizes"]["body"],
                    "color": self.colors["primary"]["chocolate_brown"]["hex"],
                },
                "right": {"type": "page_number", "format": "Page {page} of {total}"},
            },
        }

        branded_config["footer"] = {
            "height": 0.5,
            "content": {
                "left": {
                    "type": "text",
                    "content": self.company["copyright"],
                    "font": self.fonts["primary"],
                    "size": self.fonts["sizes"]["caption"],
                    "color": self.colors["extended"]["muted_brown"]["hex"],
                },
                "center": {"type": "date", "format": "%B %d, %Y"},
                "right": {"type": "text", "content": "Confidential"},
            },
        }

        branded_config["styles"] = {
            "heading1": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["h1"],
                "color": self.colors["primary"]["mustard_yellow"]["hex"],
                "bold": True,
                "spacing_after": 12,
            },
            "heading2": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["h2"],
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
                "bold": True,
                "spacing_after": 10,
            },
            "heading3": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["h3"],
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
                "bold": False,
                "spacing_after": 8,
            },
            "body": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["body"],
                "color": self.colors["primary"]["chocolate_brown"]["hex"],
                "line_spacing": 1.15,
                "paragraph_spacing": 12,
            },
            "caption": {
                "font": self.fonts["primary"],
                "size": self.fonts["sizes"]["caption"],
                "color": self.colors["primary"]["terracotta"]["hex"],
                "italic": True,
            },
        }

        branded_config["table_style"] = {
            "header": {
                "background": self.colors["primary"]["chocolate_brown"]["hex"],
                "text_color": self.colors["extended"]["cream"]["hex"],
                "bold": True,
            },
            "rows": {
                "alternating_color": self.colors["extended"]["cream"]["hex"],
                "border_color": self.colors["primary"]["warm_beige"]["hex"],
            },
        }

        return branded_config

    def validate_colors(self, colors_used: list[str]) -> dict[str, Any]:
        """Validate that colors match Polyglan brand guidelines."""
        results = {"valid": True, "corrections": [], "warnings": []}

        approved_colors = []
        for category in self.colors.values():
            for color in category.values():
                approved_colors.append(color["hex"].upper())

        for color in colors_used:
            color_upper = color.upper()
            if color_upper not in approved_colors:
                results["valid"] = False
                closest = self._find_closest_brand_color(color)
                results["corrections"].append({
                    "original": color,
                    "suggested": closest,
                    "message": f"Non-brand color {color} — suggested replacement: {closest}",
                })

        return results

    def _find_closest_brand_color(self, color: str) -> str:
        """Find the closest Polyglan brand color to a given hex color."""
        return self.colors["primary"]["mustard_yellow"]["hex"]

    def apply_watermark(self, document_type: str) -> dict[str, Any]:
        """Generate Polyglan watermark configuration for documents."""
        watermarks = {
            "draft": {
                "text": "DRAFT",
                "color": self.colors["extended"]["muted_brown"]["hex"],
                "opacity": 0.1,
                "angle": 45,
                "font_size": 72,
            },
            "confidential": {
                "text": "CONFIDENTIAL",
                "color": self.colors["primary"]["terracotta"]["hex"],
                "opacity": 0.1,
                "angle": 45,
                "font_size": 60,
            },
            "sample": {
                "text": "SAMPLE",
                "color": self.colors["primary"]["mustard_yellow"]["hex"],
                "opacity": 0.12,
                "angle": 45,
                "font_size": 72,
            },
        }
        return watermarks.get(document_type, watermarks["draft"])

    def get_chart_palette(self, num_series: int = 4) -> list[str]:
        """Get Polyglan color palette for charts."""
        palette = [
            self.colors["primary"]["mustard_yellow"]["hex"],
            self.colors["primary"]["terracotta"]["hex"],
            self.colors["primary"]["chocolate_brown"]["hex"],
            self.colors["extended"]["muted_brown"]["hex"],
            self.colors["extended"]["dark_brown"]["hex"],
            self.colors["primary"]["warm_beige"]["hex"],
        ]
        return palette[:num_series]

    def format_number(self, value: float, format_type: str = "general") -> str:
        """Format numbers according to Polyglan standards."""
        if format_type == "currency":
            return f"${value:,.2f}"
        elif format_type == "percentage":
            return f"{value:.1f}%"
        elif format_type == "large_number":
            if value >= 1_000_000:
                return f"{value / 1_000_000:.1f}M"
            elif value >= 1_000:
                return f"{value / 1_000:.1f}K"
            else:
                return f"{value:.0f}"
        else:
            return f"{value:,.0f}" if value >= 1000 else f"{value:.2f}"

    def get_session_mode_config(self, num_participants: int) -> dict[str, Any]:
        """
        Return the correct session mode config based on participant count.
        1 participant = História, 2+ = Debate.
        """
        if num_participants == 1:
            return self.modes["historia"]
        elif num_participants >= 2:
            return self.modes["debate"]
        else:
            raise ValueError("Session requires at least 1 participant.")


def apply_brand_to_document(document_type: str, config: dict[str, Any]) -> dict[str, Any]:
    """
    Main function to apply Polyglan branding to any document type.

    Args:
        document_type: Type of document ('excel', 'powerpoint', 'pdf')
        config: Document configuration

    Returns:
        Branded configuration
    """
    formatter = BrandFormatter()

    if document_type.lower() == "excel":
        return formatter.format_excel(config)
    elif document_type.lower() in ["powerpoint", "pptx"]:
        return formatter.format_powerpoint(config)
    elif document_type.lower() == "pdf":
        return formatter.format_pdf(config)
    else:
        raise ValueError(f"Unsupported document type: {document_type}")


if __name__ == "__main__":
    formatter = BrandFormatter()

    print("Polyglan React Theme Tokens:")
    import json
    print(json.dumps(formatter.get_react_theme(), indent=2))

    print("\nSession mode for 1 participant:")
    print(formatter.get_session_mode_config(1))

    print("\nSession mode for 3 participants:")
    print(formatter.get_session_mode_config(3))

    print("\nChart palette (4 series):")
    print(formatter.get_chart_palette(4))