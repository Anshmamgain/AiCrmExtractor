import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from "zod";
import { storage } from "../server/storage";
import { extractCRMData } from "../server/services/openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { meetingSummary } = z.object({
      meetingSummary: z.string().min(1, "Meeting summary is required"),
    }).parse(req.body);

    const extractedData = await extractCRMData(meetingSummary);
    
    // Store the extraction
    const extraction = await storage.createExtraction({
      meetingSummary,
      extractedData: JSON.stringify(extractedData),
      syncedToHubspot: false,
    });

    res.json({
      id: extraction.id,
      extractedData,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to extract data" 
    });
  }
} 