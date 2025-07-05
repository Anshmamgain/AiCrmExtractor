# CRM Assistant - AI-Powered Meeting Data Extraction

Transform your B2B sales meeting summaries into structured CRM data automatically using AI, and sync directly to HubSpot.

## 🚀 Features

- **AI-Powered Extraction**: Uses OpenAI GPT-4 to extract contact, company, and deal information from meeting summaries
- **HubSpot Integration**: Automatically sync extracted data to your HubSpot CRM
- **Voice Input**: Record meeting summaries using speech-to-text
- **Real-time Processing**: Instant extraction and validation with confidence scores
- **Modern UI**: Beautiful, responsive interface built with React and Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, Vercel Serverless Functions
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT-4 API
- **CRM**: HubSpot API integration
- **Hosting**: Vercel

## 📋 Prerequisites

- OpenAI API key
- HubSpot account with Private App access
- PostgreSQL database (we recommend Neon)
- Vercel account for deployment

## 🔧 Environment Variables

Set these environment variables in Vercel:

```bash
# OpenAI API (frontend)
VITE_OPENAI_API_KEY=sk-proj-your-openai-key-here

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# HubSpot API (backend)
HUBSPOT_API_KEY=pat-na2-your-hubspot-private-app-token
```

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/AiCrmExtractor.git
cd AiCrmExtractor
npm install
```

### 2. Set Up Environment Variables
Create a `.env` file (for local development only):
```bash
DATABASE_URL="your-postgresql-connection-string"
HUBSPOT_API_KEY="your-hubspot-private-app-token"
```

Create `client/.env` for frontend:
```bash
VITE_OPENAI_API_KEY="your-openai-api-key"
```

### 3. Deploy to Vercel
```bash
# Connect to Vercel
vercel

# Set environment variables in Vercel dashboard
# Deploy
vercel --prod
```

## 🎯 How to Use

### 1. Extract Data
- Paste your B2B sales meeting summary
- Or use voice input to record summaries
- Click "Extract Data" to process with AI

### 2. Review Results
- Check extracted contact, company, and deal information
- Review confidence scores for each field
- Edit any incorrect data

### 3. Sync to HubSpot
- Select what to sync (contacts, companies, deals)
- Click "FolderSync to HubSpot"
- Data is automatically created in your CRM

## 📊 Data Extraction Format

The AI extracts structured data in this format:

```json
{
  "contact": {
    "name": "John Smith",
    "email": "john.smith@acme.com",
    "title": "VP of Sales",
    "phone": "+1-555-0123",
    "confidence": 95
  },
  "company": {
    "name": "Acme Corporation",
    "industry": "Technology",
    "size": "50 employees",
    "website": "acme.com",
    "confidence": 90
  },
  "deal": {
    "name": "Acme Corp - CRM Implementation",
    "value": 10000,
    "closeDate": "2024-Q2",
    "stage": "Qualified Lead",
    "confidence": 85
  }
}
```

## 🔧 HubSpot Setup

### Create a Private App
1. Go to HubSpot → Settings → Integrations → Private Apps
2. Create a new private app
3. Add these scopes:
   - `crm.objects.contacts.write`
   - `crm.objects.companies.write`
   - `crm.objects.deals.write`
4. Copy the access token to use as `HUBSPOT_API_KEY`

## 🧪 Testing

### Test HubSpot Connection
Visit: `https://your-app.vercel.app/api/hubspot/test`

Should return:
```json
{
  "connected": true,
  "detailed": {
    "connectionTest": { "success": true },
    "contactTest": { "success": true, "id": "12345" }
  }
}
```

### Test OpenAI Integration
The frontend will show errors if OpenAI API key is invalid.

## 📁 Project Structure

```
AiCrmExtractor/
├── api/                    # Vercel serverless functions
│   ├── extract.ts         # AI extraction endpoint
│   ├── store-extraction.ts # Database storage
│   ├── sync-to-hubspot.ts # HubSpot sync
│   └── hubspot/
│       └── test.ts        # HubSpot connection test
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # App pages
│   │   └── hooks/         # Custom hooks
│   └── .env              # Frontend environment variables
├── server/                # Express server (development)
├── shared/                # Shared schemas and types
└── README.md
```

## 🔍 Troubleshooting

### Common Issues

**1. "HubSpot Disconnected" Status**
- Check HubSpot API key is set correctly in Vercel
- Ensure Private App has proper scopes
- Test with `/api/hubspot/test` endpoint

**2. "OpenAI API Error"**
- Verify `VITE_OPENAI_API_KEY` is set in Vercel
- Check API key is valid and has credits
- Make sure key starts with `sk-proj-`

**3. "Database Connection Error"**
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from Vercel
- Check connection string format

### Debug Endpoints

- **HubSpot Test**: `/api/hubspot/test`
- **OpenAI Test**: Try extraction with simple text
- **Database Test**: Check Vercel function logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Vercel function logs for detailed errors
3. Open an issue on GitHub with error details

---

Built with ❤️ using OpenAI, HubSpot, and Vercel 