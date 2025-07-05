import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from "openai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("=== OpenAI Test API called ===");
  console.log("Method:", req.method);
  
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
    console.log("Environment check:");
    console.log("- OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("- OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length || 0);
    console.log("- OPENAI_API_KEY prefix:", process.env.OPENAI_API_KEY?.substring(0, 20) || "undefined");
    console.log("- All env vars with OPENAI:", Object.keys(process.env).filter(key => key.includes('OPENAI')));
    
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY not found in environment variables",
        availableKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
      });
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log("Testing OpenAI API connection...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Say 'Hello, API test successful!'"
        }
      ],
      max_tokens: 50
    });

    console.log("OpenAI API test successful!");
    res.json({
      success: true,
      message: "OpenAI API key is working correctly",
      response: response.choices[0].message.content,
      usage: response.usage
    });

  } catch (error) {
    console.error("=== OPENAI API TEST ERROR ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      apiKeyExists: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    });
  }
} 