// Any AI provider used for narrative insights implements this — adding a
// second provider later (e.g. Anthropic, OpenAI) means writing one more file
// in ./providers that implements this interface, not touching call sites.
export interface InsightsProvider {
  generateNarrative(prompt: string): Promise<string>;
}

// The four classic business-analytics phases, in the order they should be
// read: what happened, why, what's likely next, what to do about it.
export type AnalyticsInsights = {
  descriptive: string;
  diagnostic: string;
  predictive: string;
  prescriptive: string;
};

export type InsightsResult =
  | { success: true; insights: AnalyticsInsights }
  | { success: false; error: string };
