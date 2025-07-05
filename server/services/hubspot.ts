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
    this.apiKey = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN || "";
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

export const hubspotService = new HubSpotService();
