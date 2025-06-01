import OpenAI from "openai";
import { storage } from "./storage";
import path from "path";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RenderRequest {
  productId: number;
  slabImageUrl: string;
  productName: string;
}

// Path to the lifestyle kitchen template
const LIFESTYLE_KITCHEN_PATH = path.join(process.cwd(), 'attached_assets', 'ChatGPT Image May 27, 2025 at 01_37_25 PM.png');

export async function generateCountertopRender(request: RenderRequest): Promise<string | null> {
  try {
    // First, analyze the slab image to get detailed characteristics
    const slabAnalysis = await analyzeSlabImage(request.slabImageUrl);
    
    if (!slabAnalysis) {
      console.error('Failed to analyze slab image');
      return null;
    }

    // Analyze the lifestyle kitchen photo to understand the scene
    const kitchenAnalysis = await analyzeKitchenScene();
    
    if (!kitchenAnalysis) {
      console.error('Failed to analyze kitchen scene');
      return null;
    }

    // Create an accurate prompt that emphasizes matching the slab characteristics
    const prompt = `Using the details of the following stone material: ${slabAnalysis.substring(0, 1800)}, generate an accurate kitchen countertop render by only modifying the countertop surfaces in this lifestyle kitchen setting: ${kitchenAnalysis.substring(0, 1600)}.

Requirements:
- Keep everything else in the kitchen exactly the same: wood cabinets, black window frames, sink, faucet, styling, lighting, plants, bowl of fruit, etc.
- Ensure that the render matches the colors, patterns, and textures described above exactly
- The countertop should look like it was professionally installed with the analyzed stone material
- Make sure to capture the essence of the uploaded slab photo in the generated image
- Professional photography quality with accurate color representation`;

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
    // Use GPT-4o Vision to analyze the slab image
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

async function analyzeKitchenScene(): Promise<string | null> {
  try {
    // Convert the lifestyle kitchen image to base64
    const imageBuffer = fs.readFileSync(LIFESTYLE_KITCHEN_PATH);
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    // Use GPT-4o Vision to analyze the kitchen scene
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this kitchen scene in detail. Describe the exact layout, lighting, cabinet style and color, window frames, sink and faucet, any decorative elements, perspective angle, and overall atmosphere. Focus on recreating this exact scene but be very specific about all visual elements so it can be reproduced accurately. Do not mention the current countertop material as it will be replaced."
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
    console.error('Error analyzing kitchen scene:', error);
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