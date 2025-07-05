import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Bot, 
  FileText, 
  Database, 
  User, 
  Building, 
  Handshake, 
  FolderSync, 
  Upload, 
  Eye,
  Edit,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Settings,
  History,
  Cog,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import type { ExtractedData } from "@shared/schema";
import OpenAI from "openai";

interface ExtractionResponse {
  id: number;
  extractedData: ExtractedData;
}

export default function Home() {
  const [meetingSummary, setMeetingSummary] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractionId, setExtractionId] = useState<number | null>(null);
  const [syncOptions, setSyncOptions] = useState({
    createContact: true,
    createCompany: true,
    createDeal: true,
  });
  
  const { toast } = useToast();
  const {
    isListening,
    transcript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText();

  // Sync transcript with meeting summary
  useEffect(() => {
    if (transcript) {
      setMeetingSummary(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Show speech error as toast
  useEffect(() => {
    if (speechError) {
      toast({
        variant: "destructive",
        title: "Speech recognition error",
        description: speechError,
      });
    }
  }, [speechError, toast]);

  // Test HubSpot connection
  const { data: hubspotStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/hubspot/test"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // OpenAI client - using environment variable
  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || "YOUR_API_KEY_HERE",
    dangerouslyAllowBrowser: true
  });

  // Extract data mutation - now calling OpenAI directly
  const extractMutation = useMutation({
    mutationFn: async (summary: string) => {
      // Step 1: Call OpenAI to extract the data
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert CRM data extraction assistant. Extract structured contact, company, and deal information from B2B sales meeting summaries. 

            Respond with JSON in this exact format:
            {
              "contact": {
                "name": "string or null",
                "email": "string or null", 
                "title": "string or null",
                "phone": "string or null",
                "confidence": 85
              },
              "company": {
                "name": "string or null",
                "industry": "string or null",
                "size": "string or null", 
                "website": "string or null",
                "confidence": 85
              },
              "deal": {
                "name": "string or null",
                "value": 10000,
                "closeDate": "string or null",
                "stage": "string or null",
                "confidence": 85
              }
            }

            Guidelines:
            - Extract only explicitly mentioned information
            - Set confidence scores based on clarity of information (0-100)
            - For deal value, extract numeric amount only (no currency symbols)
            - For company size, use format like "50 employees" or "small team"
            - For deal stage, use standard sales stages like "Qualified Lead", "Proposal", "Negotiation"
            - Generate appropriate deal names like "Company Name - Product/Service"
            - IMPORTANT: Use null (not undefined) for missing information, don't make assumptions
            - Ensure all string fields are either valid strings or explicitly null
            - Always include confidence scores as numbers between 0-100`
          },
          {
            role: "user",
            content: summary
          }
        ],
        response_format: { type: "json_object" },
      });

      const extractedJson = JSON.parse(response.choices[0].message.content || "{}");
      
      // Step 2: Store the extraction in the database
      const storeResponse = await apiRequest("POST", "/api/store-extraction", {
        meetingSummary: summary,
        extractedData: extractedJson
      });
      const storeResult = await storeResponse.json();
      
      // Return with the real database ID
      return {
        id: storeResult.id,
        extractedData: extractedJson
      } as ExtractionResponse;
    },
    onSuccess: (data) => {
      setExtractedData(data.extractedData);
      setExtractionId(data.id);
      toast({
        variant: "success",
        title: "Data extracted successfully!",
        description: "Ready to sync with HubSpot CRM",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Extraction failed",
        description: error instanceof Error ? error.message : "Please check your input and try again",
      });
    },
  });

  // FolderSync to HubSpot mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!extractionId) throw new Error("No extraction to sync");
      const response = await apiRequest("POST", "/api/sync-to-hubspot", {
        extractionId,
        syncOptions,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/extractions"] });
      toast({
        variant: "success",
        title: "Successfully synced to HubSpot!",
        description: "All selected data has been created in your CRM",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "FolderSync failed",
        description: error instanceof Error ? error.message : "Failed to sync to HubSpot",
      });
    },
  });

  const handleExtraction = () => {
    if (!meetingSummary.trim()) {
      toast({
        variant: "destructive",
        title: "Missing input",
        description: "Please enter a meeting summary before extracting data",
      });
      return;
    }
    extractMutation.mutate(meetingSummary);
  };

  const handleSync = () => {
    if (!extractionId) {
      toast({
        variant: "destructive",
        title: "No data to sync",
        description: "Please extract data first",
      });
      return;
    }
    syncMutation.mutate();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-500";
    if (confidence >= 70) return "bg-blue-500";
    if (confidence >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(217, 33%, 97%)" }}>
      {/* Header */}
      <header className="glass-card sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
                <Bot className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-xl" style={{ color: "hsl(215, 25%, 27%)" }}>CRM Assistant</h1>
                <p className="text-sm text-gray-600">Automated Data Entry</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  hubspotStatus?.connected ? "bg-green-500" : "bg-red-500"
                )} />
                <span>{hubspotStatus?.connected ? "Connected to HubSpot" : "HubSpot Disconnected"}</span>
              </div>
              <Button variant="ghost" size="sm" className="glass-card">
                <Settings size={16} className="mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Section */}
        <section className="mb-8">
          <Card className="glass-card-dark border-0">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl" style={{ color: "hsl(215, 25%, 27%)" }}>
                <FileText className="mr-3" style={{ color: "hsl(248, 85%, 67%)" }} />
                Meeting Summary Input
              </CardTitle>
              <p className="text-gray-600">
                Paste your B2B sales meeting summary below and let AI extract structured CRM data automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={meetingSummary}
                  onChange={(e) => setMeetingSummary(e.target.value)}
                  placeholder="Example: Had a great meeting with John Smith from Acme Corp today. They're looking for a CRM solution for their 50-person sales team. Budget is around $10k monthly. John is the VP of Sales, email: john.smith@acme.com. They want to implement by Q2 2024..."
                  className="neomorphism min-h-[160px] resize-none border-0 focus:ring-2 focus:ring-primary/50 pr-20"
                  style={{ background: "hsl(217, 33%, 97%)" }}
                  maxLength={2000}
                />
                
                {/* Voice Input Controls */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {isSupported ? (
                    <>
                      <Button
                        type="button"
                        variant={isListening ? "destructive" : "outline"}
                        size="sm"
                        onClick={isListening ? stopListening : startListening}
                        className={cn(
                          "p-2 transition-all duration-200",
                          isListening 
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse" 
                            : "glass-card hover:shadow-md"
                        )}
                        title={isListening ? "Stop recording" : "Start voice input"}
                      >
                        {isListening ? (
                          <MicOff size={16} />
                        ) : (
                          <Mic size={16} />
                        )}
                      </Button>
                      
                      {isListening && (
                        <div className="flex items-center space-x-1 glass-card px-2 py-1 text-xs text-gray-600">
                          <Volume2 size={12} className="animate-pulse" />
                          <span>Listening...</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 glass-card px-2 py-1">
                      Voice input not supported
                    </div>
                  )}
                </div>
                
                <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                  {meetingSummary.length}/2000 characters
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <Checkbox defaultChecked />
                    <span>Auto-extract contact information</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <Checkbox defaultChecked />
                    <span>Extract deal details</span>
                  </label>
                </div>
                
                <Button 
                  onClick={handleExtraction}
                  disabled={extractMutation.isPending}
                  className="gradient-bg text-white px-8 py-3 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {extractMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {extractMutation.isPending ? "Extracting..." : "Extract Data"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Extracted Data Section */}
        <section className="mb-8">
          <div className="mb-6">
            <h2 className="font-semibold text-2xl mb-2" style={{ color: "hsl(215, 25%, 27%)" }}>
              <Database className="inline mr-3" style={{ color: "hsl(262, 83%, 70%)" }} />
              Extracted CRM Data
            </h2>
            <p className="text-gray-600">Review and verify the extracted information before syncing to HubSpot CRM.</p>
          </div>

          {/* Loading State */}
          {extractMutation.isPending && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <Card key={item} className="glass-card">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Extracted Data Cards */}
          {extractedData && !extractMutation.isPending && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
              {/* Contact Information Card */}
              <Card className="glass-card-dark border-l-4" style={{ borderLeftColor: "hsl(248, 85%, 67%)" }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center text-lg" style={{ color: "hsl(215, 25%, 27%)" }}>
                    <User className="mr-2" style={{ color: "hsl(248, 85%, 67%)" }} />
                    Contact Information
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                    <p className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.contact.name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.contact.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.contact.title || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.contact.phone || "Not provided"}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Confidence Score</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className={cn("h-2 rounded-full", getConfidenceColor(extractedData.contact.confidence))}
                            style={{ width: `${extractedData.contact.confidence}%` }}
                          />
                        </div>
                        <span className="font-medium text-green-600">{extractedData.contact.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Information Card */}
              <Card className="glass-card-dark border-l-4" style={{ borderLeftColor: "hsl(262, 83%, 70%)" }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center text-lg" style={{ color: "hsl(215, 25%, 27%)" }}>
                    <Building className="mr-2" style={{ color: "hsl(262, 83%, 70%)" }} />
                    Company Information
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</label>
                    <p className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.company.name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.company.industry || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company Size</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.company.size || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.company.website || "Not provided"}
                    </p>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Confidence Score</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className={cn("h-2 rounded-full", getConfidenceColor(extractedData.company.confidence))}
                            style={{ width: `${extractedData.company.confidence}%` }}
                          />
                        </div>
                        <span className="font-medium" style={{ color: "hsl(262, 83%, 70%)" }}>{extractedData.company.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deal Information Card */}
              <Card className="glass-card-dark border-l-4 border-amber-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="flex items-center text-lg" style={{ color: "hsl(215, 25%, 27%)" }}>
                    <Handshake className="mr-2 text-amber-500" />
                    Deal Information
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Name</label>
                    <p className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.deal.name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Value</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.deal.value ? `$${extractedData.deal.value.toLocaleString()}` : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Close</label>
                    <p style={{ color: "hsl(215, 25%, 27%)" }}>
                      {extractedData.deal.closeDate || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</label>
                    {extractedData.deal.stage ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {extractedData.deal.stage}
                      </Badge>
                    ) : (
                      <p style={{ color: "hsl(215, 25%, 27%)" }}>Not provided</p>
                    )}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Confidence Score</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className={cn("h-2 rounded-full", getConfidenceColor(extractedData.deal.confidence))}
                            style={{ width: `${extractedData.deal.confidence}%` }}
                          />
                        </div>
                        <span className="font-medium text-amber-600">{extractedData.deal.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        {/* CRM FolderSync Section */}
        {extractedData && (
          <section>
            <Card className="glass-card-dark border-0">
              <CardHeader>
                <CardTitle className="flex items-center text-2xl" style={{ color: "hsl(215, 25%, 27%)" }}>
                  <FolderSync className="mr-3" style={{ color: "hsl(248, 85%, 67%)" }} />
                  FolderSync to HubSpot CRM
                </CardTitle>
                <p className="text-gray-600">Review the data mapping and sync the extracted information to your HubSpot CRM.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* FolderSync Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="glass-card p-4 cursor-pointer hover:bg-white/50 transition-all">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <Checkbox
                        checked={syncOptions.createContact}
                        onCheckedChange={(checked) => 
                          setSyncOptions(prev => ({ ...prev, createContact: !!checked }))
                        }
                      />
                      <div>
                        <p className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>Create Contact</p>
                        <p className="text-xs text-gray-600">Add contact to HubSpot</p>
                      </div>
                    </label>
                  </Card>
                  
                  <Card className="glass-card p-4 cursor-pointer hover:bg-white/50 transition-all">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <Checkbox
                        checked={syncOptions.createCompany}
                        onCheckedChange={(checked) => 
                          setSyncOptions(prev => ({ ...prev, createCompany: !!checked }))
                        }
                      />
                      <div>
                        <p className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>Create Company</p>
                        <p className="text-xs text-gray-600">Add company to HubSpot</p>
                      </div>
                    </label>
                  </Card>
                  
                  <Card className="glass-card p-4 cursor-pointer hover:bg-white/50 transition-all">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <Checkbox
                        checked={syncOptions.createDeal}
                        onCheckedChange={(checked) => 
                          setSyncOptions(prev => ({ ...prev, createDeal: !!checked }))
                        }
                      />
                      <div>
                        <p className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>Create Deal</p>
                        <p className="text-xs text-gray-600">Add deal to HubSpot</p>
                      </div>
                    </label>
                  </Card>
                </div>

                {/* FolderSync Status */}
                <Card className="neomorphism p-6 border-0" style={{ background: "hsl(217, 33%, 97%)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium" style={{ color: "hsl(215, 25%, 27%)" }}>FolderSync Status</h3>
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Ready to sync</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Contact sync</span>
                      <span className="text-green-600">Ready</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Company sync</span>
                      <span className="text-green-600">Ready</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Deal sync</span>
                      <span className="text-green-600">Ready</span>
                    </div>
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                      <History className="mr-2 h-4 w-4" />
                      View Previous Syncs
                    </Button>
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                      <Cog className="mr-2 h-4 w-4" />
                      Configure Mapping
                    </Button>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline" className="glass-card">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Changes
                    </Button>
                    <Button 
                      onClick={handleSync}
                      disabled={syncMutation.isPending}
                      className="gradient-bg text-white px-8 py-3 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {syncMutation.isPending ? "Syncing..." : "FolderSync to HubSpot"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-card mt-16 border-t border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <p className="text-sm text-gray-600">© 2024 CRM Assistant. AI-powered data extraction.</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Processing Time: 1.2s avg</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <span className="sr-only">GitHub</span>
                📚
              </Button>
              <Button variant="ghost" size="sm">
                <span className="sr-only">Documentation</span>
                📖
              </Button>
              <Button variant="ghost" size="sm">
                <span className="sr-only">Support</span>
                🆘
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
