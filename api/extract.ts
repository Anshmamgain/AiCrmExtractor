import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from "zod";
import OpenAI from "openai";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { serial, text, boolean, timestamp, pgTable } from 'drizzle-orm/pg-core';
import ws from "ws";

// Database setup
neonConfig.webSocketConstructor = ws;

// Schema definition
const extractions = pgTable("extractions", {
  id: serial("id").primaryKey(),
  meetingSummary: text("meeting_summary").notNull(),
  extractedData: text("extracted_data").notNull(),
  syncedToHubspot: boolean("synced_to_hubspot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data schema
const extractedDataSchema = z.object({
  contact: z.object({
    name: z.union([z.string(), z.null()]).optional(),
    email: z.union([z.string(), z.null()]).optional(),
    title: z.union([z.string(), z.null()]).optional(),
    phone: z.union([z.string(), z.null()]).optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
  company: z.object({
    name: z.union([z.string(), z.null()]).optional(),
    industry: z.union([z.string(), z.null()]).optional(),
    size: z.union([z.string(), z.null()]).optional(),
    website: z.union([z.string(), z.null()]).optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
  deal: z.object({
    name: z.union([z.string(), z.null()]).optional(),
    value: z.union([z.number(), z.null()]).optional(),
    closeDate: z.union([z.string(), z.null()]).optional(),
    stage: z.union([z.string(), z.null()]).optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
});

type ExtractedData = z.infer<typeof extractedDataSchema>;

// OpenAI setup
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

async function extractCRMData(meetingSummary: string): Promise<ExtractedData> {
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
  return extractedDataSchema.parse(extractedJson);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== Extract API called ===");
  console.log("Method:", req.method);
  console.log("Environment check:");
  console.log("- DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("- OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log("Parsing request body...");
    const { meetingSummary } = z.object({
      meetingSummary: z.string().min(1, "Meeting summary is required"),
    }).parse(req.body);

    console.log("Meeting summary received, length:", meetingSummary.length);
    
    console.log("Calling OpenAI extraction...");
    const extractedData = await extractCRMData(meetingSummary);
    console.log("OpenAI extraction successful:", extractedData);
    
    console.log("Storing extraction in database...");
    
    // Database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool });
    
    const [extraction] = await db
      .insert(extractions)
      .values({
        meetingSummary,
        extractedData: JSON.stringify(extractedData),
        syncedToHubspot: false,
      })
      .returning();
      
    console.log("Database storage successful, ID:", extraction.id);

    res.json({
      id: extraction.id,
      extractedData,
    });
  } catch (error) {
    console.error("=== EXTRACTION ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to extract data" 
    });
  }
} 