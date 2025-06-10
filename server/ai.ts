import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export interface SQLQueryResponse {
  query: string;
  explanation: string;
  confidence: number;
  warnings?: string[];
}

const SCHEMA_CONTEXT = `
Database Schema:
- clients: id, name, email, phone, company, address, city, state, zip_code, notes, created_at
- products: id, name, category, grade, thickness, price, unit, stock_quantity, description, image_url, is_active, created_at
- quotes: id, quote_number, client_id, project_name, status, subtotal, tax_rate, tax_amount, total_amount, valid_until, notes, sent_at, created_at, updated_at
- quote_line_items: id, quote_id, product_id, quantity, unit_price, total_price, notes
- activities: id, type, description, entity_type, entity_id, metadata, created_at

Relationships:
- clients.id -> quotes.client_id (one-to-many)
- quotes.id -> quote_line_items.quote_id (one-to-many)
- products.id -> quote_line_items.product_id (one-to-many)

Common queries:
- Find clients by company or name
- Get quotes with status and amounts
- Analyze product sales and inventory
- Calculate revenue and performance metrics
`;

export async function translateNaturalLanguageToSQL(naturalQuery: string): Promise<SQLQueryResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a SQL expert for a natural stone distribution CRM system. Convert natural language queries to PostgreSQL queries.

${SCHEMA_CONTEXT}

Rules:
1. Only generate SELECT queries for data safety
2. Use proper PostgreSQL syntax
3. Include appropriate JOINs when needed
4. Use meaningful aliases
5. Consider performance with LIMIT clauses
6. Return results in JSON format with query, explanation, confidence (0-1), and optional warnings

Respond with JSON in this format:
{
  "query": "SELECT ...",
  "explanation": "This query...",
  "confidence": 0.95,
  "warnings": ["Optional warnings about query complexity or limitations"]
}`
        },
        {
          role: "user",
          content: naturalQuery
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      query: result.query || "",
      explanation: result.explanation || "Unable to generate explanation",
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      warnings: result.warnings || []
    };
  } catch (error: any) {
    // Handle specific OpenAI API errors
    if (error.status === 429) {
      throw new Error("AI service usage limit reached. Please try again later or contact your administrator about increasing the quota.");
    }
    if (error.status === 401) {
      throw new Error("AI service authentication failed. Please contact your administrator to check the API configuration.");
    }
    if (error.status === 402) {
      throw new Error("AI service billing issue detected. Please contact your administrator to resolve payment or quota issues.");
    }
    if (error.code === 'insufficient_quota') {
      throw new Error("AI service quota exceeded. Please contact your administrator to increase the usage limit.");
    }
    
    throw new Error(`AI service unavailable: ${error.message || 'Unknown error'}`);
  }
}

export async function analyzeSQLResult(query: string, results: any[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a data analyst. Provide a brief, insightful summary of SQL query results for business users. Focus on key metrics, trends, and actionable insights."
        },
        {
          role: "user",
          content: `Query: ${query}\n\nResults: ${JSON.stringify(results.slice(0, 10))} ${results.length > 10 ? `\n(Showing first 10 of ${results.length} results)` : ''}`
        }
      ],
    });

    return response.choices[0].message.content || "Unable to analyze results";
  } catch (error: any) {
    // Handle specific OpenAI API errors
    if (error.status === 429) {
      throw new Error("AI service usage limit reached. Please try again later or contact your administrator about increasing the quota.");
    }
    if (error.status === 401) {
      throw new Error("AI service authentication failed. Please contact your administrator to check the API configuration.");
    }
    if (error.status === 402) {
      throw new Error("AI service billing issue detected. Please contact your administrator to resolve payment or quota issues.");
    }
    if (error.code === 'insufficient_quota') {
      throw new Error("AI service quota exceeded. Please contact your administrator to increase the usage limit.");
    }
    
    throw new Error(`AI analysis unavailable: ${error.message || 'Unknown error'}`);
  }
}
