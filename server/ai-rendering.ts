import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RenderRequest {
  productId: number;
  slabImageUrl: string;
  productName: string;
}

export async function generateCountertopRender(request: RenderRequest): Promise<string | null> {
  try {
    // Create a detailed prompt for rendering the slab material in a kitchen setting
    const prompt = `Create a photorealistic kitchen countertop installation image using the uploaded slab material. The kitchen should have:
    - Modern design with warm wood cabinets and black window frames
    - Natural lighting from large windows
    - Black undermount sink with matte black faucet
    - The uploaded stone material as the countertop surface
    - Clean, minimalist styling with plants and natural elements
    - Professional photography quality
    - Show the natural patterns and texture of the ${request.productName} stone material clearly
    - Maintain realistic lighting and shadows on the countertop surface`;

    // Generate the image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural"
    });

    const generatedImageUrl = response.data[0]?.url;
    
    if (generatedImageUrl) {
      // Save the generated render to the product gallery
      await storage.createGalleryImage({
        productId: request.productId,
        imageUrl: generatedImageUrl,
        title: `${request.productName} Kitchen Installation`,
        description: `AI-generated kitchen countertop render showcasing ${request.productName} natural stone`,
        installationType: 'kitchen',
        isAiGenerated: true,
        isActive: true,
        sortOrder: 0
      });

      return generatedImageUrl;
    }

    return null;
  } catch (error) {
    console.error('AI rendering error:', error);
    return null;
  }
}

export async function processSlabUpload(productId: number, imageUrl: string): Promise<void> {
  try {
    // Get product details
    const product = await storage.getProduct(productId);
    if (!product) {
      console.error('Product not found for AI rendering');
      return;
    }

    // Generate countertop render
    const renderUrl = await generateCountertopRender({
      productId,
      slabImageUrl: imageUrl,
      productName: product.name
    });

    if (renderUrl) {
      console.log(`AI render generated successfully for product ${product.name}`);
    } else {
      console.error('Failed to generate AI render');
    }
  } catch (error) {
    console.error('Error processing slab upload for AI rendering:', error);
  }
}