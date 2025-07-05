import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "./utils/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const extractions = await storage.getAllExtractions();
    res.json(extractions);
  } catch (error) {
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to fetch extractions" 
    });
  }
} 