import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  title: text("title"),
  phone: text("phone"),
  hubspotId: text("hubspot_id"),
  companyId: integer("company_id"),
  confidence: integer("confidence").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  size: text("size"),
  website: text("website"),
  hubspotId: text("hubspot_id"),
  confidence: integer("confidence").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  value: integer("value"),
  closeDate: text("close_date"),
  stage: text("stage"),
  hubspotId: text("hubspot_id"),
  contactId: integer("contact_id"),
  companyId: integer("company_id"),
  confidence: integer("confidence").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const extractions = pgTable("extractions", {
  id: serial("id").primaryKey(),
  meetingSummary: text("meeting_summary").notNull(),
  extractedData: text("extracted_data").notNull(),
  syncedToHubspot: boolean("synced_to_hubspot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
});

export const insertExtractionSchema = createInsertSchema(extractions).omit({
  id: true,
  createdAt: true,
});

export type Contact = typeof contacts.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Extraction = typeof extractions.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type InsertExtraction = z.infer<typeof insertExtractionSchema>;

export const extractedDataSchema = z.object({
  contact: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    phone: z.string().optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
  company: z.object({
    name: z.string().optional(),
    industry: z.string().optional(),
    size: z.string().optional(),
    website: z.string().optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
  deal: z.object({
    name: z.string().optional(),
    value: z.number().optional(),
    closeDate: z.string().optional(),
    stage: z.string().optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
});

export type ExtractedData = z.infer<typeof extractedDataSchema>;
