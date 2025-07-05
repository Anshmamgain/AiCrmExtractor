# CRM Assistant - AI-Powered Meeting Data Extraction

## Overview

This is a full-stack React application that uses AI to extract CRM data from meeting summaries and sync it to HubSpot. The system processes unstructured meeting text using OpenAI's GPT-4 to identify contacts, companies, and deals, then optionally syncs this data to HubSpot CRM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks with TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT-4 for data extraction
- **External APIs**: HubSpot CRM integration
- **Session Management**: Express sessions with PostgreSQL store

### Build System
- **Frontend**: Vite with React plugin and TypeScript
- **Backend**: esbuild for production builds
- **Development**: Hot module replacement and runtime error overlay

## Key Components

### Data Extraction Pipeline
1. **Input Processing**: Meeting summaries are processed through OpenAI's GPT-4
2. **Structured Output**: AI extracts contact, company, and deal information with confidence scores
3. **Data Storage**: Extractions are stored in PostgreSQL with original text and parsed JSON
4. **HubSpot Sync**: Optional synchronization to HubSpot CRM with user-configurable options

### Database Schema
- **contacts**: Contact information with HubSpot integration
- **companies**: Company details with industry and size data
- **deals**: Sales opportunity tracking with stages and values
- **extractions**: AI processing results with sync status

### API Structure
- `POST /api/extract`: Process meeting summary and extract CRM data
- `POST /api/sync-to-hubspot`: Sync extracted data to HubSpot CRM
- `GET /api/hubspot/status`: Check HubSpot API connection

## Data Flow

1. User inputs meeting summary text
2. Frontend sends text to extraction API endpoint
3. Backend processes text through OpenAI GPT-4
4. Structured data is returned with confidence scores
5. User reviews and optionally syncs to HubSpot
6. Background sync process creates/updates HubSpot records

## External Dependencies

### Required Services
- **OpenAI API**: GPT-4 for text processing and data extraction
- **HubSpot API**: CRM integration for contact, company, and deal management
- **PostgreSQL Database**: Data persistence and session storage
- **Neon Database**: Serverless PostgreSQL hosting (via @neondatabase/serverless)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `HUBSPOT_API_KEY`: HubSpot private app token

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- Node.js server with automatic restart via tsx
- Database migrations via Drizzle Kit

### Production
- Static frontend build served by Express
- Single Node.js process handling both API and static files
- Database schema managed through migrations
- Environment-based configuration

### Database Management
- Drizzle ORM with PostgreSQL dialect
- Schema definitions in shared directory
- Migration files generated automatically
- Push-based deployment for rapid iteration

## Changelog

- July 05, 2025: Initial setup with complete CRM Assistant application
- July 05, 2025: Fixed Zod schema validation error for null values in OpenAI extraction
- July 05, 2025: Successfully implemented AI-powered data extraction with HubSpot integration

## User Preferences

Preferred communication style: Simple, everyday language.