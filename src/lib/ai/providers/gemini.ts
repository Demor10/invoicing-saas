import { GoogleGenAI } from "@google/genai";
import type { InsightsProvider } from "@/lib/ai/types";

// NOTE: this was written without a live Gemini API key to test against (this
// dev sandbox has no network access to Google's API), so it's based on
// current published SDK docs rather than a verified live call. Google's
// @google/genai SDK has been changing quickly — if this throws a shape
// mismatch error, check response.text is still a plain string property
// (not a method) in whatever @google/genai version actually gets installed.
export class GeminiProvider implements InsightsProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateNarrative(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    return text;
  }
}
