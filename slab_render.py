#!/usr/bin/env python3
"""
Slab-to-Countertop Visual Replacement
Goal: Replace countertop in a kitchen image with a slab texture
Tools: Python, OpenCV, rembg, NumPy, Pillow
"""

import cv2
import numpy as np
from PIL import Image
import sys
import os

def slab_to_countertop_replacement(kitchen_path, slab_path, mask_path, output_path):
    """
    Replace countertop in kitchen image with slab texture using mask
    
    Args:
        kitchen_path: Path to base kitchen image
        slab_path: Path to slab texture image
        mask_path: Path to mask (white = areas to replace, black = keep)
        output_path: Path to save the final rendered image
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Load images
        kitchen = Image.open(kitchen_path).convert("RGBA")
        slab = Image.open(slab_path).convert("RGBA")
        mask = Image.open(mask_path).convert("L")  # Grayscale mask
        
        # Instead of stretching the slab, tile it to maintain natural texture scale
        # Calculate how many times the slab pattern should repeat
        slab_aspect = slab.width / slab.height
        kitchen_aspect = kitchen.width / kitchen.height
        
        # Scale slab to maintain realistic proportions (assume slab is roughly 10 feet wide in real life)
        # Kitchen counter is typically 2-3 feet deep, so scale accordingly
        target_slab_width = min(kitchen.width // 2, slab.width)
        target_slab_height = int(target_slab_width / slab_aspect)
        
        # Create a tiled version of the slab that covers the kitchen area
        slab_scaled = slab.resize((target_slab_width, target_slab_height), Image.Resampling.LANCZOS)
        
        # Create a larger canvas by tiling the slab
        tiles_x = (kitchen.width // target_slab_width) + 2
        tiles_y = (kitchen.height // target_slab_height) + 2
        
        tiled_width = tiles_x * target_slab_width
        tiled_height = tiles_y * target_slab_height
        
        slab_tiled = Image.new("RGBA", (tiled_width, tiled_height))
        
        for x in range(tiles_x):
            for y in range(tiles_y):
                slab_tiled.paste(slab_scaled, (x * target_slab_width, y * target_slab_height))
        
        # Crop to kitchen size (with some offset for natural variation)
        crop_x = (tiled_width - kitchen.width) // 2
        crop_y = (tiled_height - kitchen.height) // 2
        slab_resized = slab_tiled.crop((crop_x, crop_y, crop_x + kitchen.width, crop_y + kitchen.height))
        
        # Resize mask to match kitchen image dimensions
        mask_resized = mask.resize(kitchen.size)
        
        # Convert mask to RGBA for proper compositing
        mask_rgba = Image.new("RGBA", kitchen.size, (0, 0, 0, 0))
        mask_rgba.paste(mask_resized, (0, 0))
        
        # Create alpha channel from mask (white areas become opaque, black areas transparent)
        alpha = np.array(mask_resized)
        
        # Apply mask to slab - only show slab where mask is white
        slab_with_alpha = slab_resized.copy()
        slab_array = np.array(slab_with_alpha)
        slab_array[:, :, 3] = alpha  # Set alpha channel based on mask
        slab_masked = Image.fromarray(slab_array, 'RGBA')
        
        # Composite: slab on top of kitchen where mask allows
        result = Image.alpha_composite(kitchen, slab_masked)
        
        # Convert back to RGB for final output
        final_result = result.convert("RGB")
        
        # Save result
        final_result.save(output_path, "JPEG", quality=95)
        
        print(f"✅ Slab rendering completed successfully!")
        print(f"📁 Output saved to: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error during slab rendering: {str(e)}")
        return False

def main():
    """Main function to run the slab replacement"""
    if len(sys.argv) != 5:
        print("Usage: python slab_render.py <kitchen_image> <slab_image> <mask_image> <output_image>")
        print("Example: python slab_render.py kitchen.jpg slab.jpg mask.png final_render.jpg")
        sys.exit(1)
    
    kitchen_path = sys.argv[1]
    slab_path = sys.argv[2]
    mask_path = sys.argv[3]
    output_path = sys.argv[4]
    
    # Check if input files exist
    for path in [kitchen_path, slab_path, mask_path]:
        if not os.path.exists(path):
            print(f"❌ Error: File not found: {path}")
            sys.exit(1)
    
    print(f"🏠 Kitchen image: {kitchen_path}")
    print(f"🪨 Slab image: {slab_path}")
    print(f"🎭 Mask image: {mask_path}")
    print(f"📸 Output will be saved to: {output_path}")
    print("\n🔄 Processing...")
    
    success = slab_to_countertop_replacement(kitchen_path, slab_path, mask_path, output_path)
    
    if success:
        print("\n✅ DONE! Your countertop rendering is complete.")
    else:
        print("\n❌ FAILED! Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()