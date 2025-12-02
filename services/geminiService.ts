export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  }
}

export const analyzeTicketAttachment = async (
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return `Failed to analyze the image(s). ${error.message || 'Please try again later.'}`;
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