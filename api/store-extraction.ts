import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from "zod";
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== Store Extraction API called ===");
  console.log("Method:", req.method);
  
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
    const { meetingSummary, extractedData } = z.object({
      meetingSummary: z.string().min(1, "Meeting summary is required"),
      extractedData: z.any(), // The extracted data object
    }).parse(req.body);

    console.log("Meeting summary length:", meetingSummary.length);
    console.log("Extracted data:", extractedData);
    
    // Database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool });
    
    console.log("Storing extraction in database...");
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
      success: true,
    });
  } catch (error) {
    console.error("=== STORE EXTRACTION ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to store extraction" 
    });
  }
} 