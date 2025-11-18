/**
 * server/index.js
 * Node.js + Express server that calls Gemini (Google Gen AI JS SDK)
 *
 * Notes:
 * - Requires Node 18+.
 * - Set GEMINI_API_KEY in server/.env
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Sentiment from "sentiment";
import path from "path";
import { fileURLToPath } from "url";

import { GoogleGenAI } from "@google/genai"; // per quickstart; SDK will pick up GEMINI_API_KEY env var

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public"))); // serve frontend

const sentiment = new Sentiment();

// Init Gemini SDK client. If constructor supports explicit apiKey param, we pass it,
// otherwise the SDK will read GEMINI_API_KEY from env (both methods are common).
let ai;
try {
  // Try explicit init
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  // Fallback to default init (SDK often reads GEMINI_API_KEY)
  ai = new GoogleGenAI({});
}

/** Basic urgent / self-harm keyword detector */
function detectUrgent(text) {
  const lowered = text.toLowerCase();
  // simple keyword list — this is intentionally conservative.
  const urgentRegex = /\b(suicide|kill myself|want to die|end my life|hurt myself|self[- ]harm|cutting|die by suicide|i can't go on)\b/i;
  return urgentRegex.test(lowered);
}

/** Map a sentiment score to a short mood label */
function moodFromScore(score) {
  if (score <= -4) return "very negative";
  if (score <= -1) return "negative";
  if (score === 0) return "neutral";
  if (score <= 3) return "positive";
  return "very positive";
}

/** Build a controlled prompt to send to Gemini */
function buildPrompt(userMessage, mood, score, urgent) {
  if (urgent) {
    // If urgent, ask model to be brief, supportive, and include crisis resources
    return `You are an empathetic mental health companion for university students.
User message: """${userMessage}"""
Sentiment score: ${score} -> mood: ${mood}
The user may be in crisis. Respond in a calm, non-judgmental and supportive tone. 
Provide a short empathetic reply (1-3 sentences), then give 2 immediate grounding/comfort techniques the user can do right now (very short), and strongly encourage contacting emergency services or a trusted person.
Also include a short list of crisis resources (country-agnostic + India TeleMANAS 14416, KIRAN 1800-599-0019, US 988), and a 1-line follow-up question to keep the conversation going if the user wants to continue.
Return ONLY a JSON object with these keys:
{
  "reply": "<empathetic text>",
  "tips": ["...","..."],
  "resources": ["...","..."],
  "followup": "..."
}
Do NOT provide instructions for self-harm. Keep responses brief and supportive.`;
  } else {
    // Non-urgent flow: sentiment + tips + short follow up
    return `You are an empathetic mental health companion for university students.
User message: """${userMessage}"""
Sentiment score: ${score} -> mood: ${mood}
Generate a compassionate, empathetic reply (2-4 sentences) tailored to the mood.
Then provide 3 short, practical relaxation tips (each 1-2 short phrases the user can try immediately).
Return a short, friendly follow-up question to continue the conversation.
Please reply in strict JSON with this structure:
{
  "reply": "<empathetic text>",
  "tone": "<tone label like 'calm' or 'encouraging'>",
  "tips": ["tip1","tip2","tip3"],
  "followup": "<one short question>"
}
Return JSON only (no extra text).`;
  }
}

/** POST /api/chat
 * Request body: { message: string }
 * Response: JSON produced by Gemini plus upstream metadata
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }

    // 1) local sentiment analysis
    const s = sentiment.analyze(message);
    const score = s.score;
    const mood = moodFromScore(score);

    // 2) urgent detection
    const urgent = detectUrgent(message);

    // 3) build prompt for Gemini
    const prompt = buildPrompt(message, mood, score, urgent);

    // 4) call Gemini via Google Gen AI SDK
    // using generateContent per docs
    const modelName = "gemini-2.5-flash"; // change if you want another model
    const payload = {
      model: modelName,
      // many SDKs accept 'contents' as array of messages or single string
      // this follows the docs examples: contents as array with role/parts
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // optional: generation config (tokens etc) may be supported
      // generation_config: { max_output_tokens: 512 },
    };

    const aiResponse = await ai.models.generateContent(payload);

    // SDKs commonly return `.text` or structured outputs. Try common paths:
    let textResponse = "";
    if (aiResponse?.text) textResponse = aiResponse.text;
    else if (Array.isArray(aiResponse?.outputs) && aiResponse.outputs[0]?.content) {
      // some SDK shapes
      textResponse = aiResponse.outputs[0].content[0]?.text || aiResponse.outputs[0].content?.[0];
    } else {
      // fallback: stringify entire response
      textResponse = JSON.stringify(aiResponse);
    }

    // 5) try to parse JSON out of the model response
    let parsed = null;
    try {
      // models should return pure JSON as requested; attempt parse
      parsed = JSON.parse(textResponse.trim());
    } catch (err) {
      // try to extract JSON block inside text (best-effort)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}$/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          parsed = { raw: textResponse };
        }
      } else {
        parsed = { raw: textResponse };
      }
    }

    // 6) build final response
    const result = {
      parsed,
      mood,
      score,
      urgent,
      rawModelResponse: textResponse,
    };

    // If it's urgent, we add a standard emergency suggestion to parsed.resources (if not present)
    if (urgent) {
      if (!parsed.resources) parsed.resources = [];
      parsed.resources.push("If you are in immediate danger call local emergency services (e.g. 112, 911) or the crisis lines below.");
      // Add India / US resources (examples)
      parsed.resources.push("India TeleMANAS: 14416 (mental health helpline).");
      parsed.resources.push("India KIRAN mental health helpline: 1800-599-0019.");
      parsed.resources.push("US Suicide & Crisis Lifeline: 988.");
    }

    return res.json(result);
  } catch (err) {
    console.error("Error in /api/chat:", err);
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
