import type { VercelRequest, VercelResponse } from '@vercel/node';
import { hubspotService } from "../server/services/hubspot";

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
    const isConnected = await hubspotService.testConnection();
    res.json({ connected: isConnected });
  } catch (error) {
    res.status(500).json({ 
      connected: false, 
      error: error instanceof Error ? error.message : "Connection test failed" 
    });
  }
} 