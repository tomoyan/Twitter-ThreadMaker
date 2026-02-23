import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Tweet {
  text: string;
  imagePrompt?: string;
  imageData?: string;
  articleImageUrl?: string;
}

export interface ThreadResult {
  thread: Tweet[];
}

export async function processUrl(url: string): Promise<ThreadResult> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analyze the content of the provided URL: ${url}. 
  1. Create an engaging Twitter thread (5-8 tweets) in Japanese that captures the essence of the content. 
  Do NOT include numbering like (1/n) or (1/6). 
  Include a few relevant hashtags at the end of appropriate tweets.
  Each tweet should stay under 140 characters (standard for Japanese Twitter). 
  The first tweet should be a hook. 
  The last tweet MUST include the original URL (${url}) and a call to action or a final thought.
  2. For each tweet, identify the most relevant image URL from the article itself if available. 
  3. Also provide a descriptive image prompt (in English) that could be used to generate a relevant visual if no suitable image exists in the article.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          thread: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The tweet text in Japanese." },
                imagePrompt: { type: Type.STRING, description: "A descriptive image prompt in English." },
                articleImageUrl: { type: Type.STRING, description: "The URL of a relevant image found in the article." }
              },
              required: ["text", "imagePrompt"]
            },
            description: "An array of tweets, each with text, an image prompt, and optionally an image URL from the article.",
          },
        },
        required: ["thread"],
      },
    },
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result as ThreadResult;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("コンテンツの処理に失敗しました。もう一度お試しください。");
  }
}

export async function generateImage(prompt: string): Promise<string> {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: `Create a high-quality, professional illustration for a Twitter post about: ${prompt}. Style: Modern, clean, digital art.` }],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("画像の生成に失敗しました。");
}
