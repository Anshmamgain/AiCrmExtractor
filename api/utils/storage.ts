import { 
  contacts, 
  companies, 
  deals, 
  extractions,
  type Contact, 
  type Company, 
  type Deal, 
  type Extraction,
  type InsertContact, 
  type InsertCompany, 
  type InsertDeal, 
  type InsertExtraction
} from "../../shared/schema";

export interface IStorage {
  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  
  // Extraction operations
  getExtraction(id: number): Promise<Extraction | undefined>;
  createExtraction(extraction: InsertExtraction): Promise<Extraction>;
  updateExtraction(id: number, updates: Partial<InsertExtraction>): Promise<Extraction>;
  getAllExtractions(): Promise<Extraction[]>;
}

export class MemStorage implements IStorage {
  private contacts: Map<number, Contact>;
  private companies: Map<number, Company>;
  private deals: Map<number, Deal>;
  private extractions: Map<number, Extraction>;
  private currentContactId: number;
  private currentCompanyId: number;
  private currentDealId: number;
  private currentExtractionId: number;

  constructor() {
    this.contacts = new Map();
    this.companies = new Map();
    this.deals = new Map();
    this.extractions = new Map();
    this.currentContactId = 1;
    this.currentCompanyId = 1;
    this.currentDealId = 1;
    this.currentExtractionId = 1;
  }

  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = {
      id,
      name: insertContact.name,
      email: insertContact.email,
      title: insertContact.title ?? null,
      phone: insertContact.phone ?? null,
      confidence: insertContact.confidence ?? null,
      hubspotId: insertContact.hubspotId ?? null,
      companyId: insertContact.companyId ?? null,
      createdAt: new Date(),
    };
    this.contacts.set(id, contact);
    return contact;
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const company: Company = {
      id,
      name: insertCompany.name,
      industry: insertCompany.industry ?? null,
      size: insertCompany.size ?? null,
      website: insertCompany.website ?? null,
      confidence: insertCompany.confidence ?? null,
      hubspotId: insertCompany.hubspotId ?? null,
      createdAt: new Date(),
    };
    this.companies.set(id, company);
    return company;
  }

  // Deal operations
  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const id = this.currentDealId++;
    const deal: Deal = {
      id,
      name: insertDeal.name,
      value: insertDeal.value ?? null,
      closeDate: insertDeal.closeDate ?? null,
      stage: insertDeal.stage ?? null,
      hubspotId: insertDeal.hubspotId ?? null,
      contactId: insertDeal.contactId ?? null,
      companyId: insertDeal.companyId ?? null,
      confidence: insertDeal.confidence ?? null,
      createdAt: new Date(),
    };
    this.deals.set(id, deal);
    return deal;
  }

  // Extraction operations
  async getExtraction(id: number): Promise<Extraction | undefined> {
    return this.extractions.get(id);
  }

  async createExtraction(insertExtraction: InsertExtraction): Promise<Extraction> {
    const id = this.currentExtractionId++;
    const extraction: Extraction = {
      id,
      meetingSummary: insertExtraction.meetingSummary,
      extractedData: insertExtraction.extractedData,
      syncedToHubspot: insertExtraction.syncedToHubspot ?? null,
      createdAt: new Date(),
    };
    this.extractions.set(id, extraction);
    return extraction;
  }

  async updateExtraction(id: number, updates: Partial<InsertExtraction>): Promise<Extraction> {
    const existing = this.extractions.get(id);
    if (!existing) {
      throw new Error("Extraction not found");
    }
    
    const updated = { ...existing, ...updates };
    this.extractions.set(id, updated);
    return updated;
  }

  async getAllExtractions(): Promise<Extraction[]> {
    return Array.from(this.extractions.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }
}

import { db } from "./db";
import { eq } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await db
      .insert(contacts)
      .values(insertContact)
      .returning();
    return contact;
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal || undefined;
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const [deal] = await db
      .insert(deals)
      .values(insertDeal)
      .returning();
    return deal;
  }

  async getExtraction(id: number): Promise<Extraction | undefined> {
    const [extraction] = await db.select().from(extractions).where(eq(extractions.id, id));
    return extraction || undefined;
  }

  async createExtraction(insertExtraction: InsertExtraction): Promise<Extraction> {
    const [extraction] = await db
      .insert(extractions)
      .values(insertExtraction)
      .returning();
    return extraction;
  }

  async updateExtraction(id: number, updates: Partial<InsertExtraction>): Promise<Extraction> {
    const [extraction] = await db
      .update(extractions)
      .set(updates)
      .where(eq(extractions.id, id))
      .returning();
    
    if (!extraction) {
      throw new Error("Extraction not found");
    }
    
    return extraction;
  }

  async getAllExtractions(): Promise<Extraction[]> {
    return await db.select().from(extractions).orderBy(extractions.createdAt);
  }
}

export const storage = new DatabaseStorage();
