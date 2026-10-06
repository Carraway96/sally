"""Normalize the 4x4 generated walk atlas to stable scale and foot baselines.

Usage: python scripts/prepare-walk-sheet.py path/to/generated-atlas.png
Requires Pillow. The original illustration is kept unchanged.
"""
from pathlib import Path
from PIL import Image
import sys

root = Path(__file__).resolve().parent.parent
source = Image.open(sys.argv[1]).convert('RGBA')
width, height = 256, 384
sheet = Image.new('RGBA', (width * 4, height * 4))
for row in range(4):
    for col in range(4):
        frame = source.crop((round(col * source.width / 4), round(row * source.height / 4),
                             round((col + 1) * source.width / 4), round((row + 1) * source.height / 4)))
        bbox = frame.getchannel('A').point(lambda a: 255 if a > 128 else 0).getbbox()
        if not bbox:
            raise ValueError(f'Empty frame {row}, {col}')
        frame = frame.crop(bbox)
        scale = min((height - 8) / frame.height, (width - 8) / frame.width)
        frame = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        sheet.alpha_composite(frame, (col * width + (width - frame.width) // 2,
                                      (row + 1) * height - 4 - frame.height))
sheet.save(root / 'images/sally_walk.png')
print('Saved 16 normalized walk frames to images/sally_walk.png')
