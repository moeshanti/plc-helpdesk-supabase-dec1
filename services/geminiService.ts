export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  }
}

export const analyzeTicketImages = async (
  images: ImagePart[],
  context: string,
  isCreationMode: boolean = false
): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        context,
        isCreationMode,
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse AI analysis response:", responseText);
      throw new Error(`Server returned an error (likely local env issue): ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data.text;
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return `Failed to analyze the image(s). ${error.message || 'Please try again later.'}`;
  }
};

import { supabase } from './supabaseClient';

export async function analyzeTicketVideoBackground(videoUrl: string, erpName: string, module: string, accessToken?: string): Promise<any> {
  console.log("Analyzing Video (Background Mode)...", videoUrl);

  // 1. Determine Backend URL
  const isSplitDev = window.location.port === '3009';
  const FUNCTION_URL = isSplitDev
    ? 'http://127.0.0.1:8888/.netlify/functions/analyze-video-background'
    : '/.netlify/functions/analyze-video-background';

  console.log(`Targeting Backend: ${FUNCTION_URL}`);

  // 2. Trigger Background Function
  const analysisId = `vid-${Date.now()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl,
        erpName,
        module,
        accessToken,
        analysisId
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (networkError: any) {
    clearTimeout(timeoutId);
    console.error("Network Error contacting backend:", networkError);
    const msg = networkError.name === 'AbortError' ? 'Connection Timed Out' : networkError.message;
    throw new Error(`Connection Failed: ${msg}. Is backend running on port 8888?`);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown Server Error");
    throw new Error(`Failed to start background analysis: ${response.status} ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
    throw new Error("Configuration Error: Backend URL is incorrect (Received HTML instead of JSON). check console.");
  }

  console.log(`Background job started (ID: ${analysisId}). Polling for result...`);

  // 2. Poll for Result (Max 15 minutes = 900 seconds)
  const POLL_INTERVAL = 3000;
  const MAX_ATTEMPTS = 300; // 15 mins
  let consecutiveErrors = 0;

  // Determine Proxy URL
  const PROXY_URL = isSplitDev
    ? 'http://127.0.0.1:8888/.netlify/functions/get-analysis-result'
    : '/.netlify/functions/get-analysis-result';

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    try {
      // Use Proxy Function to Fetch Result (Bypasses RLS in Dev)
      const res = await fetch(`${PROXY_URL}?analysisId=${analysisId}`);

      if (res.status === 200) {
        const data = await res.json();
        console.log("Analysis Result Found via Proxy!", data);
        return data;
      }

      if (res.status === 422) {
        // 422 indicates the *Error File* was found (Analysis Failed Remotely)
        const errorData = await res.json();
        console.error("Analysis Failed Remote:", errorData);
        throw new Error(errorData.error || "Background analysis reported failure");
      }

      if (res.status === 404) {
        // Still processing...
        if (i % 5 === 0) console.log(`Polling... (${i + 1}/${MAX_ATTEMPTS}) - Status: Pending`);
        consecutiveErrors = 0;
        continue;
      }

      // Other errors
      console.warn(`Polling status: ${res.status}`);
      consecutiveErrors++;

    } catch (e: any) {
      console.warn("Polling network error:", e);
      consecutiveErrors++;
      if (consecutiveErrors > 10) throw e;
    }
  }

  throw new Error("Analysis timed out (polling limit reached)");
}

export async function analyzeTicketVideo(videoFile: File, erpName: string, module: string): Promise<any> {
  // Legacy Sync Function (Kept for reference, but App.tsx will switch to background)
  console.warn("Using Legacy Sync Video Analysis - deprecated");
  // ...
  throw new Error("Use background analysis");
}

export const generateExecutiveSummary = async (tickets: any[]): Promise<string> => {
  try {
    const totalTickets = tickets.length;
    const criticalCount = tickets.filter(t => t.priority === 'Critical').length;
    const highCount = tickets.filter(t => t.priority === 'High').length;
    const openBugs = tickets.filter(t => t.status === 'Open_Bug').map(t => t.title).join(', ');

    // Count by module
    const moduleCounts: Record<string, number> = {};
    tickets.forEach(t => {
      moduleCounts[t.module] = (moduleCounts[t.module] || 0) + 1;
    });
    const moduleSummary = Object.entries(moduleCounts)
      .map(([mod, count]) => `${mod}: ${count}`)
      .join(', ');

    const prompt = `
      You are an IT Director. Write a concise 1-paragraph executive summary for the CTO.
      Highlight critical risks, unstable modules, and recommend a focus area.
      Do not use markdown formatting, just plain professional text.

      Data:
      - Total Tickets: ${totalTickets}
      - Critical Priority: ${criticalCount}
      - High Priority: ${highCount}
      - Module Breakdown: ${moduleSummary}
      - Open Critical Bugs: ${openBugs}
    `;

    const response = await fetch('/.netlify/functions/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("AI Summary Error:", error);
    return `Failed to generate summary. ${error.message || 'Please try again later.'}`;
  }
};