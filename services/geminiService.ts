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