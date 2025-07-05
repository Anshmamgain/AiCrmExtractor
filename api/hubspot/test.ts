import type { VercelRequest, VercelResponse } from '@vercel/node';

// HubSpot service inline
class HubSpotService {
  private apiKey: string;
  private baseUrl = "https://api.hubapi.com";

  constructor() {
    this.apiKey = process.env.HUBSPOT_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("HubSpot API key not found in environment variables");
    }
  }

  private async makeRequest(endpoint: string, method: string = "GET", data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest("/crm/v3/objects/contacts?limit=1");
      return true;
    } catch (error) {
      console.error("HubSpot connection test failed:", error);
      return false;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== HubSpot Test API called ===");
  console.log("Method:", req.method);
  console.log("HUBSPOT_API_KEY exists:", !!process.env.HUBSPOT_API_KEY);
  
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
    console.log("Testing HubSpot connection...");
    const hubspotService = new HubSpotService();
    const isConnected = await hubspotService.testConnection();
    console.log("HubSpot connection test result:", isConnected);
    res.json({ connected: isConnected });
  } catch (error) {
    console.error("=== HUBSPOT CONNECTION ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    res.status(500).json({ 
      connected: false, 
      error: error instanceof Error ? error.message : "Connection test failed" 
    });
  }
} 