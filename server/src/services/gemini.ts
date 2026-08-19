import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '../config/index.js';

let client: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!client) {
    client = new GoogleGenerativeAI(config.geminiApiKey);
    model = client.getGenerativeModel({ model: 'gemini-3.6-flash' });
  }
  return model!;
}

/**
 * Sends a prompt and asks for a JSON response.
 * Returns the parsed object so the caller can handle it safely.
 */
export async function generateJson(prompt: string): Promise<Record<string, unknown>> {
  const genModel = getModel();
  const result = await genModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  const text = result.response.text();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('Gemini did not return valid JSON');
  }
  return JSON.parse(text.slice(start, end + 1));
}