#!/usr/bin/env python3
"""
Polyglan Brand Validation Script
Validates content, components, and documents against Polyglan brand guidelines.
Checks colors, fonts, tone, session mode rules, and interface patterns.
"""

import json
import re
from dataclasses import asdict, dataclass


@dataclass
class BrandGuidelines:
    """Polyglan brand guidelines configuration."""

    brand_name: str
    primary_colors: list[str]
    extended_colors: list[str]
    fonts: list[str]
    tone_keywords: list[str]
    prohibited_words: list[str]
    prohibited_colors: list[str]
    tagline: str | None = None


@dataclass
class ValidationResult:
    """Result of Polyglan brand validation."""

    passed: bool
    score: float
    violations: list[str]
    warnings: list[str]
    suggestions: list[str]


class BrandValidator:
    """Validates content and components against Polyglan brand guidelines."""

    def __init__(self, guidelines: BrandGuidelines):
        self.guidelines = guidelines

    def validate_colors(self, content: str) -> tuple[list[str], list[str]]:
        """
        Validate color usage. Flags non-brand colors and explicitly prohibited colors.
        Returns: (violations, warnings)
        """
        violations = []
        warnings = []

        hex_pattern = r"#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}"
        found_colors = re.findall(hex_pattern, content)

        rgb_pattern = r"rgb\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)"
        found_colors.extend(re.findall(rgb_pattern, content, re.IGNORECASE))

        approved = (
            [c.upper() for c in self.guidelines.primary_colors] +
            [c.upper() for c in self.guidelines.extended_colors]
        )
        prohibited = [c.upper() for c in self.guidelines.prohibited_colors]

        for color in found_colors:
            color_upper = color.upper()
            if color_upper in prohibited:
                violations.append(
                    f"Prohibited color used: {color} — "
                    f"see REFERENCE.md for approved Polyglan palette"
                )
            elif color_upper not in approved:
                warnings.append(
                    f"Non-brand color detected: {color} — "
                    f"verify it's intentional or replace with approved palette"
                )

        return violations, warnings

    def validate_fonts(self, content: str) -> tuple[list[str], list[str]]:
        """
        Validate font usage. Flags Inter, Roboto, Arial as violations.
        Returns: (violations, warnings)
        """
        violations = []
        warnings = []

        prohibited_fonts = ["inter", "roboto", "arial", "comic sans", "papyrus", "times new roman"]

        font_patterns = [
            r'font-family\s*:\s*["\']?([^;"\']+)["\']?',
            r"font:\s*[^;]*\s+([A-Za-z][A-Za-z\s]+)(?:,|;|\s+\d)",
        ]

        found_fonts = []
        for pattern in font_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            found_fonts.extend(matches)

        for font in found_fonts:
            font_lower = font.strip().lower()
            for prohibited in prohibited_fonts:
                if prohibited in font_lower:
                    violations.append(
                        f"Prohibited font used: '{font}' — "
                        f"use FreeSans, Nunito, or DM Sans instead"
                    )
                    break
            else:
                approved_match = any(
                    approved.lower() in font_lower
                    for approved in self.guidelines.fonts
                )
                if not approved_match:
                    warnings.append(
                        f"Unrecognized font: '{font}' — "
                        f"confirm it's part of the approved Polyglan type system"
                    )

        return violations, warnings

    def validate_tone(self, content: str) -> tuple[list[str], list[str]]:
        """
        Validate tone and messaging alignment.
        Returns: (violations, warnings)
        """
        violations = []
        warnings = []

        content_lower = content.lower()

        for word in self.guidelines.prohibited_words:
            if word.lower() in content_lower:
                violations.append(f"Prohibited word/phrase: '{word}'")

        tone_matches = sum(
            1 for kw in self.guidelines.tone_keywords if kw.lower() in content_lower
        )
        if tone_matches == 0 and len(content) > 100:
            warnings.append(
                f"Content may not reflect Polyglan tone. "
                f"Consider incorporating: {', '.join(self.guidelines.tone_keywords[:5])}"
            )

        return violations, warnings

    def validate_brand_name(self, content: str) -> tuple[list[str], list[str]]:
        """
        Validate brand name capitalization.
        Returns: (violations, warnings)
        """
        violations = []
        warnings = []

        pattern = re.compile(re.escape(self.guidelines.brand_name), re.IGNORECASE)
        matches = pattern.findall(content)

        for match in matches:
            if match != self.guidelines.brand_name:
                violations.append(
                    f"Incorrect brand name: '{match}' — "
                    f"must be '{self.guidelines.brand_name}'"
                )

        return violations, warnings

    def validate_ui_patterns(self, content: str) -> tuple[list[str], list[str]]:
        """
        Validate UI-specific patterns for React/frontend code.
        Flags use of localStorage for tokens and missing dark mode considerations.
        Returns: (violations, warnings)
        """
        violations = []
        warnings = []

        if "localStorage" in content and "token" in content.lower():
            violations.append(
                "localStorage used for token storage — "
                "Polyglan requires in-memory auth state (React context)"
            )

        if "border-radius" in content:
            non_pill_pattern = r"border-radius\s*:\s*(?!9999px|var\(--radius-full\))[0-9]+px"
            matches = re.findall(non_pill_pattern, content)
            for match in matches:
                warnings.append(
                    f"Non-pill border-radius found: '{match}' — "
                    f"buttons must use 9999px (pill shape)"
                )

        if "#FFFFFF" in content.upper() and "background" in content.lower():
            warnings.append(
                "Pure white #FFFFFF used as background — "
                "prefer Cream #FAF5EE for Polyglan surfaces"
            )

        if "#000000" in content.upper():
            warnings.append(
                "Pure black #000000 detected — "
                "prefer Dark Brown #2C2420 for Polyglan dark surfaces"
            )

        return violations, warnings

    def calculate_score(self, violations: list[str], warnings: list[str]) -> float:
        """Calculate brand compliance score (0–100)."""
        score = max(0, 100 - (len(violations) * 10) - (len(warnings) * 3))
        return round(score, 2)

    def generate_suggestions(self, violations: list[str], warnings: list[str]) -> list[str]:
        """Generate actionable suggestions based on violations and warnings."""
        suggestions = []

        if any("color" in v.lower() or "color" in w.lower() for v in violations for w in warnings):
            suggestions.append(
                "Primary palette: Mustard Yellow #F4A900, Terracotta #C1666B, "
                "Warm Beige #D4B896, Chocolate Brown #000000 — see REFERENCE.md"
            )

        if any("font" in v.lower() for v in violations):
            suggestions.append(
                "Use FreeSans as primary display font with Nunito or DM Sans as fallback"
            )

        if any("tone" in w.lower() for w in warnings):
            suggestions.append(
                f"Align content with Polyglan tone: "
                f"{', '.join(self.guidelines.tone_keywords[:5])}"
            )

        if any("brand name" in v.lower() for v in violations):
            suggestions.append(f"Always write brand name as: {self.guidelines.brand_name}")

        if any("localStorage" in v for v in violations):
            suggestions.append(
                "Store auth tokens in React context (AuthContext.tsx), never in localStorage"
            )

        return suggestions

    def validate(self, content: str) -> ValidationResult:
        """
        Run full Polyglan brand validation on content.
        Returns: ValidationResult
        """
        all_violations = []
        all_warnings = []

        checks = [
            self.validate_colors(content),
            self.validate_fonts(content),
            self.validate_tone(content),
            self.validate_brand_name(content),
            self.validate_ui_patterns(content),
        ]

        for violations, warnings in checks:
            all_violations.extend(violations)
            all_warnings.extend(warnings)

        score = self.calculate_score(all_violations, all_warnings)
        suggestions = self.generate_suggestions(all_violations, all_warnings)

        return ValidationResult(
            passed=len(all_violations) == 0,
            score=score,
            violations=all_violations,
            warnings=all_warnings,
            suggestions=suggestions,
        )


def get_polyglan_guidelines() -> BrandGuidelines:
    """
    Return the official Polyglan brand guidelines.
    Source of truth: REFERENCE.md and SKILL.md in this repository.
    """
    return BrandGuidelines(
        brand_name="Polyglan",
        primary_colors=["#F4A900", "#C1666B", "#D4B896", "#000000"],
        extended_colors=["#2C2420", "#EDE0D0", "#FAF5EE", "#C98F00", "#A0484D", "#8C7B72"],
        fonts=["FreeSans", "Nunito", "DM Sans", "sans-serif"],
        tone_keywords=[
            "intelligence", "education", "collaboration", "excellence",
            "professor", "student", "session", "debate", "history",
        ],
        prohibited_words=["cheap", "boring", "generic", "basic", "unprofessional"],
        prohibited_colors=["#0066CC", "#003366", "#6C757D"],  # Acme blues — wrong brand
        tagline="Intelligence in Every Word",
    )


def load_guidelines_from_json(filepath: str) -> BrandGuidelines:
    """Load brand guidelines from a JSON file."""
    try:
        with open(filepath) as f:
            data = json.load(f)
        return BrandGuidelines(**data)
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Guidelines file not found: {filepath}") from e
    except json.JSONDecodeError as e:
        raise json.JSONDecodeError(f"Invalid JSON: {e.msg}", e.doc, e.pos) from e
    except TypeError as e:
        raise TypeError(f"Missing required fields: {e}") from e


def main():
    """Example usage: validate a React component snippet against Polyglan guidelines."""
    guidelines = get_polyglan_guidelines()

    test_content = """
    Welcome to polyglan!

    const token = localStorage.setItem('token', jwt);

    font-family: 'Inter', sans-serif;
    background-color: #0066CC;
    border-radius: 4px;
    color: #000000;

    Our cheap and generic solution for education.
    """

    validator = BrandValidator(guidelines)
    result = validator.validate(test_content)

    print("=" * 60)
    print("POLYGLAN BRAND VALIDATION REPORT")
    print("=" * 60)
    print(f"\nStatus:  {'✓ PASSED' if result.passed else '✗ FAILED'}")
    print(f"Score:   {result.score}/100")

    if result.violations:
        print(f"\n❌ VIOLATIONS ({len(result.violations)}):")
        for i, v in enumerate(result.violations, 1):
            print(f"  {i}. {v}")

    if result.warnings:
        print(f"\n⚠️  WARNINGS ({len(result.warnings)}):")
        for i, w in enumerate(result.warnings, 1):
            print(f"  {i}. {w}")

    if result.suggestions:
        print("\n💡 SUGGESTIONS:")
        for i, s in enumerate(result.suggestions, 1):
            print(f"  {i}. {s}")

    print("\n" + "=" * 60)
    return asdict(result)


if __name__ == "__main__":
    main()