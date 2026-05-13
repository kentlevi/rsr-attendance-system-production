import { GoogleGenerativeAI } from "@google/genai";
import { settingsService } from "../services/SettingsService";

/**
 * Helper to get a Gemini generative model using the API key from system settings.
 * @param modelName The model to use (default: gemini-1.5-flash)
 * @returns The generative model instance
 */
export const getGeminiModel = (modelName = "gemini-1.5-flash") => {
  const settings = settingsService.getSettings();
  const apiKey = settings.geminiApiKey;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is not configured in system settings.");
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * Checks if the Gemini API is configured.
 * @returns boolean
 */
export const isGeminiConfigured = () => {
  const settings = settingsService.getSettings();
  return !!settings.geminiApiKey;
};
