
# ✅ Replit Agent Instructions: Slab-to-Countertop Visual Replacement
# Goal: Replace countertop in a kitchen image with a slab texture

# 1. Install required packages (in Replit shell, run once):
# pip install opencv-python-headless rembg numpy pillow

import cv2
import numpy as np
from rembg import remove
from PIL import Image

# 2. Load images (these must be uploaded into your Replit files first)
kitchen = Image.open("Kitchen.jpg").convert("RGBA")
slab = Image.open("Slap.jpg").convert("RGBA")
mask = Image.open("mask.png").convert("L")  # White = area to replace

# 3. Resize slab to match kitchen image
slab_resized = slab.resize(kitchen.size)

# 4. Composite slab onto masked countertop
result = Image.composite(slab_resized, kitchen, mask)

# 5. Save and preview
result.save("final_render.png")
result.show()
