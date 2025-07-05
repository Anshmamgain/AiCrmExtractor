import OpenAI from "openai";
import { extractedDataSchema, type ExtractedData } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export async function extractCRMData(meetingSummary: string): Promise<ExtractedData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert CRM data extraction assistant. Extract structured contact, company, and deal information from B2B sales meeting summaries. 

          Respond with JSON in this exact format:
          {
            "contact": {
              "name": "string or null",
              "email": "string or null", 
              "title": "string or null",
              "phone": "string or null",
              "confidence": number (0-100)
            },
            "company": {
              "name": "string or null",
              "industry": "string or null",
              "size": "string or null", 
              "website": "string or null",
              "confidence": number (0-100)
            },
            "deal": {
              "name": "string or null",
              "value": number or null,
              "closeDate": "string or null",
              "stage": "string or null",
              "confidence": number (0-100)
            }
          }

          Guidelines:
          - Extract only explicitly mentioned information
          - Set confidence scores based on clarity of information (0-100)
          - For deal value, extract numeric amount only (no currency symbols)
          - For company size, use format like "50 employees" or "small team"
          - For deal stage, use standard sales stages like "Qualified Lead", "Proposal", "Negotiation"
          - Generate appropriate deal names like "Company Name - Product/Service"
          - IMPORTANT: Use null (not undefined) for missing information, don't make assumptions
          - Ensure all string fields are either valid strings or explicitly null
          - Always include confidence scores as numbers between 0-100`
        },
        {
          role: "user",
          content: meetingSummary
        }
      ],
      response_format: { type: "json_object" },
    });

    const extractedJson = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate the extracted data against our schema
    const validatedData = extractedDataSchema.parse(extractedJson);
    
    return validatedData;
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    throw new Error(`Failed to extract CRM data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
