import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface PythonRenderRequest {
  productId: number;
  slabImageUrl: string;
  kitchenImageUrl?: string;
  maskImageUrl?: string;
  productName: string;
}

/**
 * Generate countertop render using Python-based image processing
 * This provides an alternative to AI-based rendering with more control
 */
export async function generatePythonCountertopRender(request: PythonRenderRequest): Promise<string | null> {
  try {
    console.log(`🐍 Starting Python-based rendering for product ${request.productId}`);
    
    // Use default kitchen and mask if not provided
    const kitchenPath = request.kitchenImageUrl || path.join(process.cwd(), 'kitchen.jpg');
    const maskPath = request.maskImageUrl || path.join(process.cwd(), 'mask.png');
    
    // Download slab image temporarily
    const slabPath = await downloadImage(request.slabImageUrl, `slab_${request.productId}.jpg`);
    if (!slabPath) {
      throw new Error('Failed to download slab image');
    }

    // Generate unique output filename
    const timestamp = Date.now();
    const outputPath = path.join(process.cwd(), 'upload', `render_${request.productId}_${timestamp}.jpg`);
    
    // Ensure upload directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Run Python script
    const command = `python slab_render.py "${kitchenPath}" "${slabPath}" "${maskPath}" "${outputPath}"`;
    console.log(`🔄 Executing: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('Python script stderr:', stderr);
    }
    
    console.log('Python script output:', stdout);

    // Verify output file was created
    try {
      await fs.access(outputPath);
      console.log(`✅ Python rendering completed: ${outputPath}`);
      
      // Clean up temporary slab file
      try {
        await fs.unlink(slabPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary slab file:', cleanupError);
      }
      
      // Return relative path for web access
      return `/upload/${path.basename(outputPath)}`;
      
    } catch (accessError) {
      throw new Error('Python script completed but output file was not created');
    }

  } catch (error) {
    console.error('Error in Python-based rendering:', error);
    return null;
  }
}

/**
 * Download image from URL to temporary file
 */
async function downloadImage(imageUrl: string, filename: string): Promise<string | null> {
  try {
    const tempPath = path.join(process.cwd(), 'upload', filename);
    
    // Ensure upload directory exists
    await fs.mkdir(path.dirname(tempPath), { recursive: true });

    // Handle base64 data URLs
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(tempPath, buffer);
      return tempPath;
    }
    
    // Handle regular file paths
    if (!imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Handle HTTP URLs
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(tempPath, Buffer.from(buffer));
    return tempPath;
    
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

/**
 * Upload custom kitchen or mask image for rendering
 */
export async function uploadRenderingAsset(
  file: Buffer, 
  filename: string, 
  type: 'kitchen' | 'mask'
): Promise<string | null> {
  try {
    const uploadDir = path.join(process.cwd(), 'upload', 'rendering');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, `${type}_${Date.now()}_${filename}`);
    await fs.writeFile(filePath, file);
    
    // Return relative path for web access
    return `/upload/rendering/${path.basename(filePath)}`;
    
  } catch (error) {
    console.error('Error uploading rendering asset:', error);
    return null;
  }
}