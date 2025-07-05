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
    console.log(`🔄 Testing HubSpot API request to: ${url}`);
    
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

    console.log(`   Using API key: ${this.apiKey.substring(0, 10)}...`);
    
    const response = await fetch(url, options);
    
    console.log(`📡 HubSpot API response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HubSpot API error: ${response.status} - ${errorText}`);
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ HubSpot API success response received`);
    return result;
  }

  async testConnection(): Promise<any> {
    try {
      // Test with a simple API call to get account info
      const result = await this.makeRequest("/crm/v3/objects/contacts?limit=1");
      return { success: true, data: result };
    } catch (error) {
      console.error("HubSpot connection test failed:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  async createTestContact(): Promise<any> {
    try {
      const testContact = {
        properties: {
          email: `test-${Date.now()}@example.com`,
          firstname: "Test",
          lastname: "Contact",
          jobtitle: "Test Contact from CRM Assistant",
        },
      };
      
      console.log("Creating test contact:", JSON.stringify(testContact, null, 2));
      const result = await this.makeRequest("/crm/v3/objects/contacts", "POST", testContact);
      return { success: true, data: result };
    } catch (error) {
      console.error("Test contact creation failed:", error);
      return { success: false, error: (error as Error).message };
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== HubSpot Test API called ===");
  console.log("Method:", req.method);
  console.log("HUBSPOT_API_KEY exists:", !!process.env.HUBSPOT_API_KEY);
  console.log("HUBSPOT_API_KEY length:", process.env.HUBSPOT_API_KEY?.length || 0);
  
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
    const hubspotService = new HubSpotService();
    
    // Test 1: Basic connection test
    console.log("🧪 Test 1: Basic connection test...");
    const connectionTest = await hubspotService.testConnection();
    
    // Test 2: Create a test contact
    console.log("🧪 Test 2: Creating test contact...");
    const contactTest = await hubspotService.createTestContact();
    
    res.json({
      success: true,
      tests: {
        connection: connectionTest,
        createContact: contactTest
      },
      apiKeyStatus: {
        exists: !!process.env.HUBSPOT_API_KEY,
        length: process.env.HUBSPOT_API_KEY?.length || 0,
        prefix: process.env.HUBSPOT_API_KEY?.substring(0, 10) || "N/A"
      }
    });
    
  } catch (error) {
    console.error("=== HUBSPOT TEST ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
      apiKeyStatus: {
        exists: !!process.env.HUBSPOT_API_KEY,
        length: process.env.HUBSPOT_API_KEY?.length || 0,
        prefix: process.env.HUBSPOT_API_KEY?.substring(0, 10) || "N/A"
      }
    });
  }
} 