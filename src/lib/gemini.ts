import { GoogleGenAI } from "@google/genai";
import { settingsService } from "../services/SettingsService";

/**
 * Helper to get a Gemini generative model using the API key from system settings.
 * Returns an object exposing the legacy `generateContent(prompt)` signature so existing
 * call sites continue to work with the new @google/genai SDK.
 */
export const getGeminiModel = (modelName = "gemini-1.5-flash") => {
  const settings = settingsService.getSettings();
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    throw new Error("Gemini API Key is not configured in system settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  return {
    generateContent: async (prompt: string) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      const text = response.text ?? "";
      return {
        response: {
          text: () => text,
        },
      };
    },
  };
};

/**
 * Checks if the Gemini API is configured.
 */
export const isGeminiConfigured = () => {
  const settings = settingsService.getSettings();
  return !!settings.geminiApiKey;
};
