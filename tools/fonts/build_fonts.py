"""Builds the static fonts in assets/fonts from the Google Fonts variable fonts (OFL).

React Native cannot pick an axis of a variable font, and Figma uses Archivo at three widths
(wdth 75 for numbers, 100 for text, 125 for display). So each style the design uses becomes
its own static file, named after the fontFamily the app uses.

Sources (google/fonts, OFL; the licenses are next to the fonts):
- https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf
- https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf

Usage: python3 tools/fonts/build_fonts.py <Archivo[wdth,wght].ttf> <JetBrainsMono[wght].ttf>
Needs fonttools (pip install fonttools).
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = Path(__file__).resolve().parents[2] / "assets" / "fonts"

# (source, file and PostScript name, family, style, axes)
INSTANCES = [
    ("archivo", "Archivo-Regular", "Archivo", "Regular", {"wght": 400, "wdth": 100}),
    ("archivo", "Archivo-Medium", "Archivo", "Medium", {"wght": 500, "wdth": 100}),
    ("archivo", "Archivo-SemiBold", "Archivo", "SemiBold", {"wght": 600, "wdth": 100}),
    ("archivo", "Archivo-Bold", "Archivo", "Bold", {"wght": 700, "wdth": 100}),
    ("archivo", "Archivo-ExtraBold", "Archivo", "ExtraBold", {"wght": 800, "wdth": 100}),
    ("archivo", "ArchivoCondensed-Bold", "Archivo Condensed", "Bold", {"wght": 700, "wdth": 75}),
    (
        "archivo",
        "ArchivoExpanded-ExtraBold",
        "Archivo Expanded",
        "ExtraBold",
        {"wght": 800, "wdth": 125},
    ),
    ("mono", "JetBrainsMono-Bold", "JetBrains Mono", "Bold", {"wght": 700}),
]


def rename(font: TTFont, name: str, family: str, style: str) -> None:
    table = font["name"]
    # Each file is its own family so the OS never merges two widths into one.
    full_family = f"{family} {style}"
    for record_id, value in {
        1: full_family,
        2: "Regular",
        4: full_family,
        6: name,
        16: family,
        17: style,
    }.items():
        table.setName(value, record_id, 3, 1, 0x409)
        table.setName(value, record_id, 1, 0, 0)


def main(archivo: str, mono: str) -> None:
    sources = {"archivo": archivo, "mono": mono}
    OUT.mkdir(parents=True, exist_ok=True)
    for source, name, family, style, axes in INSTANCES:
        font = instantiateVariableFont(TTFont(sources[source]), axes)
        rename(font, name, family, style)
        font.save(OUT / f"{name}.ttf")
        print(f"{name}.ttf")


if __name__ == "__main__":
    main(*sys.argv[1:3])
