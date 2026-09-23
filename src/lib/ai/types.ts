// Any AI provider used for narrative insights implements this — adding a
// second provider later (e.g. Anthropic, OpenAI) means writing one more file
// in ./providers that implements this interface, not touching call sites.
export interface InsightsProvider {
  generateNarrative(prompt: string): Promise<string>;
}

export type InsightsResult = { success: true; text: string } | { success: false; error: string };
