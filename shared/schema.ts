import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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

// Define relations
export const contactsRelations = relations(contacts, ({ one }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [deals.companyId],
    references: [companies.id],
  }),
}));

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
    name: z.union([z.string(), z.null()]).optional(),
    email: z.union([z.string(), z.null()]).optional(),
    title: z.union([z.string(), z.null()]).optional(),
    phone: z.union([z.string(), z.null()]).optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
  company: z.object({
    name: z.union([z.string(), z.null()]).optional(),
    industry: z.union([z.string(), z.null()]).optional(),
    size: z.union([z.string(), z.null()]).optional(),
    website: z.union([z.string(), z.null()]).optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
  deal: z.object({
    name: z.union([z.string(), z.null()]).optional(),
    value: z.union([z.number(), z.null()]).optional(),
    closeDate: z.union([z.string(), z.null()]).optional(),
    stage: z.union([z.string(), z.null()]).optional(),
    confidence: z.number().min(0).max(100).default(0),
  }),
});

export type ExtractedData = z.infer<typeof extractedDataSchema>;
