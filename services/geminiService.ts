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

export const analyzeTicketVideo = async (
  videoBase64: string,
  mimeType: string,
  erpName?: string,
  module?: string
): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/analyze-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoBase64,
        mimeType,
        erpName,
        module
      }),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // If parsing fails, it's likely an HTML error page (e.g. 413 Payload Too Large, 500, 404)
      console.error("Failed to parse video analysis response:", responseText);
      throw new Error(`Server returned an error (likely file too large or timeout): ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data.text;
  } catch (error: any) {
    console.error("AI Video Analysis Error:", error);
    return `Failed to analyze the video. ${error.message || 'Please try again later.'}`;
  }
};

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