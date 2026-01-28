import { GoogleGenAI, Type } from "@google/genai";
import { Subtitle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/mp3;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateSubtitles = async (audioFile: File): Promise<Subtitle[]> => {
  try {
    const audioBase64 = await fileToGenerativePart(audioFile);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioFile.type,
              data: audioBase64
            }
          },
          {
            text: "Generate subtitles for this audio."
          }
        ]
      },
      config: {
        temperature: 0, // Deterministic output for better timing
        systemInstruction: `You are a professional lyrics synchronizer.
Your task is to generate precise, line-by-line subtitles for the provided song.

STRICT RULES FOR TIMING:
1. **Short Durations**: A single subtitle line usually lasts 2 to 6 seconds. If you calculate a duration > 10 seconds, you are likely missing a line break or an instrumental gap.
2. **Exact End Times**: The 'endTime' must mark the exact moment the singer stops singing that phrase. Do NOT extend the time through instrumental breaks or silence.
3. **No Overlaps**: Ensure one line ends before the next begins.
4. **Format**: JSON Array of objects with 'text', 'startTime', 'endTime'.
5. **Values**: Time must be in float seconds (e.g. 12.45).
6. **Ensure synchronization is extremely accurate and precise

Ignore instrumental sections. Only transcribe sung lyrics.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              startTime: { type: Type.NUMBER, description: "Start time in seconds (float)" },
              endTime: { type: Type.NUMBER, description: "End time in seconds (float)" },
            },
            required: ["text", "startTime", "endTime"]
          }
        }
      }
    });

    if (response.text) {
      const rawData = JSON.parse(response.text);
      // Data is already in numbers due to schema enforcement
      let parsedData: Subtitle[] = rawData.map((item: any) => {
        let startTime = Number(item.startTime);
        let endTime = Number(item.endTime);

        // Sanity Check: Ensure valid numbers
        if (isNaN(startTime)) startTime = 0;
        if (isNaN(endTime) || endTime <= startTime) {
            endTime = startTime + 3.0; // Fallback duration
        }
        
        // Safety cap: If AI generates a massive duration (> 12s), cap it to prevent 'stuck' subtitles
        if (endTime - startTime > 12.0) {
             endTime = startTime + 5.0;
        }

        return {
            startTime,
            endTime,
            text: item.text
        };
      });

      parsedData = parsedData.sort((a, b) => a.startTime - b.startTime);

      // POST-PROCESSING: Fill small gaps between subtitles for seamless playback
      for (let i = 0; i < parsedData.length - 1; i++) {
        const current = parsedData[i];
        const next = parsedData[i + 1];
        
        // If the gap is small (less than 1 seconds), extend current endTime to next startTime
        // Reduced from 2.0 to 1.0 to prevent long holds during musical pauses
        if (next.startTime - current.endTime < 1.0 && next.startTime > current.endTime) {
            current.endTime = next.startTime;
        }
      }

      return parsedData;
    }
    return [];
  } catch (error) {
    console.error("Error generating subtitles:", error);
    throw error;
  }
};