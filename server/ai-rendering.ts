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
    // First, analyze the slab image to get detailed characteristics
    const slabAnalysis = await analyzeSlabImage(request.slabImageUrl);
    
    if (!slabAnalysis) {
      console.error('Failed to analyze slab image');
      return null;
    }

    // Create a detailed prompt based on the actual slab characteristics
    const prompt = `Create a photorealistic kitchen countertop installation using this exact stone material: ${slabAnalysis}

    Kitchen specifications:
    - Modern design with warm wood cabinets and black window frames
    - Natural lighting from large windows showing the stone's true colors
    - Black undermount sink with matte black faucet
    - The stone material as described above as the countertop surface
    - Clean, minimalist styling with plants and natural elements
    - Professional photography quality with accurate color representation
    - Show the exact patterns, veining, and texture of the stone material
    - Maintain realistic lighting that highlights the stone's natural beauty
    - Ensure the stone patterns flow naturally across the countertop surface`;

    // Generate the image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural"
    });

    const generatedImageUrl = response.data?.[0]?.url;
    
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

async function analyzeSlabImage(imageUrl: string): Promise<string | null> {
  try {
    // Use GPT-4 Vision to analyze the slab image
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this stone slab image in detail. Describe the exact colors, patterns, veining, texture, and any unique characteristics. Focus on: base color, secondary colors, veining patterns (direction, thickness, color), overall texture (polished, honed, etc.), any special features like crystals or fossils, and the stone's general appearance. Be very specific about colors and patterns as this will be used to create an accurate kitchen render."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing slab image:', error);
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