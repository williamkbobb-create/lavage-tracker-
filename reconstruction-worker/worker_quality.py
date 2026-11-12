"""Advisory capture quality checks for HVIE image sets.

Metrics are intentionally advisory: they cannot prove multi-view overlap or
reconstruction suitability. They provide dimensions, exposure, and a simple
high-frequency edge-energy proxy to flag obvious capture problems.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageStat, UnidentifiedImageError


def analyze_images(paths: list[Path]) -> dict:
    results = []
    warnings = []
    for path in paths:
        try:
            with Image.open(path) as source:
                source.verify()
            with Image.open(path) as source:
                image = source.convert("L")
                width, height = image.size
                if width < 800 or height < 600:
                    warnings.append(f"{path.name}: low resolution ({width}x{height})")
                stat = ImageStat.Stat(image)
                brightness = stat.mean[0]
                pixels = image.load()
                # Mean absolute horizontal/vertical neighbour difference.
                # This is a coarse detail proxy, not a calibrated blur detector.
                stride = max(1, min(width, height) // 300)
                total = 0
                count = 0
                for y in range(0, height - stride, stride):
                    for x in range(0, width - stride, stride):
                        p = pixels[x, y]
                        total += abs(pixels[x + stride, y] - p)
                        total += abs(pixels[x, y + stride] - p)
                        count += 2
                edge_energy = total / count if count else 0.0
                if brightness < 35:
                    warnings.append(f"{path.name}: possibly underexposed")
                elif brightness > 225:
                    warnings.append(f"{path.name}: possibly overexposed")
                if edge_energy < 4.0:
                    warnings.append(f"{path.name}: very low image detail; check focus and surface texture")
                results.append({
                    "file": path.name,
                    "width": width,
                    "height": height,
                    "brightness_mean": round(brightness, 2),
                    "edge_energy_proxy": round(edge_energy, 2),
                })
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            warnings.append(f"{path.name}: unreadable image ({exc})")
    return {
        "image_count": len(results),
        "images": results,
        "warnings": warnings,
        "interpretation": (
            "Advisory checks only. These metrics do not assess camera overlap, "
            "viewpoint diversity, moving objects, or guarantee successful SfM."
        ),
    }
