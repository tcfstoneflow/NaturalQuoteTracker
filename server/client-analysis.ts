import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ClientPurchaseSummary {
  preferredStoneTypes: string[];
  purchasePatterns: string;
  recommendations: string;
  totalSpent: number;
  averageOrderValue: number;
}

export async function analyzeClientPurchases(clientName: string, quotes: any[]): Promise<ClientPurchaseSummary> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for purchase analysis");
  }

  // Extract product information from quotes
  const purchaseData = quotes.map(quote => ({
    quoteNumber: quote.quoteNumber,
    projectName: quote.projectName,
    total: parseFloat(quote.subtotal || 0),
    date: new Date(quote.createdAt).toLocaleDateString(),
    products: quote.lineItems?.map((item: any) => ({
      name: item.product?.name || 'Unknown Product',
      category: item.product?.category || 'Unknown Category',
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice || 0),
      totalPrice: parseFloat(item.totalPrice || 0)
    })) || []
  }));

  const totalSpent = purchaseData.reduce((sum, quote) => sum + quote.total, 0);
  const averageOrderValue = quotes.length > 0 ? totalSpent / quotes.length : 0;

  // Prepare data for AI analysis
  const purchaseText = purchaseData.map(quote => 
    `Quote ${quote.quoteNumber} (${quote.date}): ${quote.projectName || 'No project name'} - Total: $${quote.total.toLocaleString()}
Products: ${quote.products.map(p => `${p.name} (${p.category}) - Qty: ${p.quantity}, Price: $${p.totalPrice.toLocaleString()}`).join(', ')}`
  ).join('\n\n');

  const prompt = `Analyze the purchase history for client "${clientName}" and provide insights about their stone purchasing patterns. Here is their purchase data:

${purchaseText}

Please provide a JSON response with the following structure:
{
  "preferredStoneTypes": ["array of top 3-5 stone types/categories this client prefers"],
  "purchasePatterns": "detailed analysis of their buying patterns, frequency, project types, and spending habits",
  "recommendations": "personalized recommendations for this client based on their history, including potential upsells or new products they might be interested in"
}

Focus on stone types, natural stone categories, project patterns, and provide actionable business insights.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert in natural stone sales and client analysis. Analyze purchase patterns and provide business insights for stone distributors."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    return {
      preferredStoneTypes: analysis.preferredStoneTypes || [],
      purchasePatterns: analysis.purchasePatterns || "No patterns identified",
      recommendations: analysis.recommendations || "No specific recommendations available",
      totalSpent,
      averageOrderValue
    };
  } catch (error) {
    console.error("Error analyzing client purchases:", error);
    throw new Error("Failed to analyze client purchase patterns");
  }
}