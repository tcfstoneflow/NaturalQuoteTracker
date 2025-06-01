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
        
        # Scale slab to be large enough to show the texture clearly
        # Make slab larger than kitchen to ensure good coverage
        scale_factor = max(kitchen.width / slab.width, kitchen.height / slab.height) * 1.5
        new_width = int(slab.width * scale_factor)
        new_height = int(slab.height * scale_factor)
        
        # Resize slab with high quality
        slab_resized = slab.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center the slab over the kitchen image
        if slab_resized.width > kitchen.width:
            x_offset = (slab_resized.width - kitchen.width) // 2
            slab_resized = slab_resized.crop((x_offset, 0, x_offset + kitchen.width, slab_resized.height))
        
        if slab_resized.height > kitchen.height:
            y_offset = (slab_resized.height - kitchen.height) // 2
            slab_resized = slab_resized.crop((0, y_offset, slab_resized.width, y_offset + kitchen.height))
        
        # If slab is still smaller than kitchen, resize to match
        if slab_resized.width != kitchen.width or slab_resized.height != kitchen.height:
            slab_resized = slab_resized.resize(kitchen.size, Image.Resampling.LANCZOS)
        
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