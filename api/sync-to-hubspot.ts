import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from "zod";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { serial, text, boolean, timestamp, pgTable, integer } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import ws from "ws";

// Database setup
neonConfig.webSocketConstructor = ws;

// Schema definitions
const extractions = pgTable("extractions", {
  id: serial("id").primaryKey(),
  meetingSummary: text("meeting_summary").notNull(),
  extractedData: text("extracted_data").notNull(),
  syncedToHubspot: boolean("synced_to_hubspot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  title: text("title"),
  phone: text("phone"),
  confidence: integer("confidence"),
  hubspotId: text("hubspot_id"),
  companyId: integer("company_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name"),
  industry: text("industry"),
  size: text("size"),
  website: text("website"),
  confidence: integer("confidence"),
  hubspotId: text("hubspot_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name"),
  value: integer("value"),
  closeDate: text("close_date"),
  stage: text("stage"),
  hubspotId: text("hubspot_id"),
  contactId: integer("contact_id"),
  companyId: integer("company_id"),
  confidence: integer("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

// HubSpot service inline
interface HubSpotContact {
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    jobtitle?: string;
    phone?: string;
    company?: string;
  };
}

interface HubSpotCompany {
  properties: {
    name: string;
    industry?: string;
    numberofemployees?: string;
    website?: string;
  };
}

interface HubSpotDeal {
  properties: {
    dealname: string;
    amount?: string;
    closedate?: string;
    dealstage?: string;
    pipeline?: string;
  };
  associations?: {
    companies?: Array<{ id: string }>;
    contacts?: Array<{ id: string }>;
  };
}

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

  async createContact(contactData: {
    name?: string;
    email?: string;
    title?: string;
    phone?: string;
    companyName?: string;
  }): Promise<{ id: string }> {
    const [firstName, ...lastNameParts] = (contactData.name || "").split(" ");
    const lastName = lastNameParts.join(" ");

    const hubspotContact: HubSpotContact = {
      properties: {
        email: contactData.email || "",
        firstname: firstName || "",
        lastname: lastName || "",
        jobtitle: contactData.title || "",
        phone: contactData.phone || "",
        company: contactData.companyName || "",
      },
    };

    const result = await this.makeRequest("/crm/v3/objects/contacts", "POST", hubspotContact);
    return { id: result.id };
  }

  async createCompany(companyData: {
    name?: string;
    industry?: string;
    size?: string;
    website?: string;
  }): Promise<{ id: string }> {
    const hubspotCompany: HubSpotCompany = {
      properties: {
        name: companyData.name || "",
        industry: companyData.industry || "",
        numberofemployees: companyData.size || "",
        website: companyData.website || "",
      },
    };

    const result = await this.makeRequest("/crm/v3/objects/companies", "POST", hubspotCompany);
    return { id: result.id };
  }

  async createDeal(dealData: {
    name?: string;
    value?: number;
    closeDate?: string;
    stage?: string;
    contactId?: string;
    companyId?: string;
  }): Promise<{ id: string }> {
    const hubspotDeal: HubSpotDeal = {
      properties: {
        dealname: dealData.name || "",
        amount: dealData.value ? dealData.value.toString() : "",
        closedate: dealData.closeDate || "",
        dealstage: dealData.stage || "qualifiedtobuy",
        pipeline: "default",
      },
    };

    // Add associations if provided
    if (dealData.contactId || dealData.companyId) {
      hubspotDeal.associations = {};
      if (dealData.contactId) {
        hubspotDeal.associations.contacts = [{ id: dealData.contactId }];
      }
      if (dealData.companyId) {
        hubspotDeal.associations.companies = [{ id: dealData.companyId }];
      }
    }

    const result = await this.makeRequest("/crm/v3/objects/deals", "POST", hubspotDeal);
    return { id: result.id };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== Sync API called ===");
  console.log("Method:", req.method);
  console.log("Environment check:");
  console.log("- DATABASE_URL exists:", !!process.env.DATABASE_URL);
  console.log("- HUBSPOT_API_KEY exists:", !!process.env.HUBSPOT_API_KEY);
  
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
    const { extractionId, syncOptions } = z.object({
      extractionId: z.number(),
      syncOptions: z.object({
        createContact: z.boolean().default(true),
        createCompany: z.boolean().default(true),
        createDeal: z.boolean().default(true),
      }),
    }).parse(req.body);

    console.log("Extraction ID:", extractionId);
    console.log("Sync options:", syncOptions);

    // Database connection
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle({ client: pool });

    console.log("Getting extraction from database...");
    const [extraction] = await db.select().from(extractions).where(eq(extractions.id, extractionId));
    if (!extraction) {
      return res.status(404).json({ message: "Extraction not found" });
    }

    console.log("Parsing extracted data...");
    const extractedData = JSON.parse(extraction.extractedData);
    const syncResults: any = {};

    const hubspotService = new HubSpotService();

    // Create company first (if enabled and data exists)
    let companyId: string | undefined;
    if (syncOptions.createCompany && extractedData.company?.name) {
      try {
        console.log("Creating company in HubSpot...");
        const company = await hubspotService.createCompany(extractedData.company);
        companyId = company.id;
        syncResults.company = { success: true, id: company.id };
        
        // Store company in our database
        console.log("Storing company in database...");
        await db.insert(companies).values({
          name: extractedData.company.name,
          industry: extractedData.company.industry,
          size: extractedData.company.size,
          website: extractedData.company.website,
          hubspotId: company.id,
          confidence: extractedData.company.confidence || 0,
        });
      } catch (error) {
        console.error("Company creation failed:", error);
        syncResults.company = { success: false, error: (error as Error).message };
      }
    }

    // Create contact (if enabled and data exists)
    let contactId: string | undefined;
    if (syncOptions.createContact && extractedData.contact?.email) {
      try {
        console.log("Creating contact in HubSpot...");
        const contact = await hubspotService.createContact({
          ...extractedData.contact,
          companyName: extractedData.company?.name,
        });
        contactId = contact.id;
        syncResults.contact = { success: true, id: contact.id };
        
        // Store contact in our database
        console.log("Storing contact in database...");
        await db.insert(contacts).values({
          name: extractedData.contact.name,
          email: extractedData.contact.email,
          title: extractedData.contact.title,
          phone: extractedData.contact.phone,
          hubspotId: contact.id,
          confidence: extractedData.contact.confidence || 0,
        });
      } catch (error) {
        console.error("Contact creation failed:", error);
        syncResults.contact = { success: false, error: (error as Error).message };
      }
    }

    // Create deal (if enabled and data exists)
    if (syncOptions.createDeal && extractedData.deal?.name) {
      try {
        console.log("Creating deal in HubSpot...");
        const deal = await hubspotService.createDeal({
          ...extractedData.deal,
          contactId,
          companyId,
        });
        syncResults.deal = { success: true, id: deal.id };
        
        // Store deal in our database
        console.log("Storing deal in database...");
        await db.insert(deals).values({
          name: extractedData.deal.name,
          value: extractedData.deal.value,
          closeDate: extractedData.deal.closeDate,
          stage: extractedData.deal.stage,
          hubspotId: deal.id,
          confidence: extractedData.deal.confidence || 0,
        });
      } catch (error) {
        console.error("Deal creation failed:", error);
        syncResults.deal = { success: false, error: (error as Error).message };
      }
    }

    // Update extraction as synced
    console.log("Updating extraction as synced...");
    await db.update(extractions).set({ syncedToHubspot: true }).where(eq(extractions.id, extractionId));

    console.log("Sync completed successfully!");
    res.json({
      success: true,
      results: syncResults,
    });
  } catch (error) {
    console.error("=== SYNC ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to sync to HubSpot" 
    });
  }
} 