import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from "zod";
import { storage } from "../server/storage";
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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { extractionId, syncOptions } = z.object({
      extractionId: z.number(),
      syncOptions: z.object({
        createContact: z.boolean().default(true),
        createCompany: z.boolean().default(true),
        createDeal: z.boolean().default(true),
      }),
    }).parse(req.body);

    const extraction = await storage.getExtraction(extractionId);
    if (!extraction) {
      return res.status(404).json({ message: "Extraction not found" });
    }

    const extractedData = JSON.parse(extraction.extractedData);
    const syncResults: any = {};

    // Create company first (if enabled and data exists)
    let companyId: string | undefined;
    if (syncOptions.createCompany && extractedData.company?.name) {
      try {
        const company = await hubspotService.createCompany(extractedData.company);
        companyId = company.id;
        syncResults.company = { success: true, id: company.id };
        
        // Store company in our database
        await storage.createCompany({
          ...extractedData.company,
          hubspotId: company.id,
          confidence: extractedData.company.confidence || 0,
        });
      } catch (error) {
        syncResults.company = { success: false, error: (error as Error).message };
      }
    }

    // Create contact (if enabled and data exists)
    let contactId: string | undefined;
    if (syncOptions.createContact && extractedData.contact?.email) {
      try {
        const contact = await hubspotService.createContact({
          ...extractedData.contact,
          companyName: extractedData.company?.name,
        });
        contactId = contact.id;
        syncResults.contact = { success: true, id: contact.id };
        
        // Store contact in our database
        await storage.createContact({
          ...extractedData.contact,
          hubspotId: contact.id,
          confidence: extractedData.contact.confidence || 0,
        });
      } catch (error) {
        syncResults.contact = { success: false, error: (error as Error).message };
      }
    }

    // Create deal (if enabled and data exists)
    if (syncOptions.createDeal && extractedData.deal?.name) {
      try {
        const deal = await hubspotService.createDeal({
          ...extractedData.deal,
          contactId,
          companyId,
        });
        syncResults.deal = { success: true, id: deal.id };
        
        // Store deal in our database
        await storage.createDeal({
          ...extractedData.deal,
          hubspotId: deal.id,
          confidence: extractedData.deal.confidence || 0,
        });
      } catch (error) {
        syncResults.deal = { success: false, error: (error as Error).message };
      }
    }

    // Update extraction as synced
    await storage.updateExtraction(extractionId, { syncedToHubspot: true });

    res.json({
      success: true,
      results: syncResults,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to sync to HubSpot" 
    });
  }
} 