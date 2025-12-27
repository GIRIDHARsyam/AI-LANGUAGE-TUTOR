import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Path setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load environment variables ---
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Ping route for testing ---
app.get("/ping", (req, res) => res.send("pong"));

// --- Serve frontend ---
const frontendPath = path.join(__dirname, "../frontend");
if (fs.existsSync(frontendPath) && fs.statSync(frontendPath).isDirectory()) {
  app.use(express.static(frontendPath));
  app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    const indexFile = path.join(frontendPath, "index.html");
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    next();
  });
}

// --- Initialize Gemini client ---
let genClient = null;
if (process.env.GEMINI_API_KEY) {
  try {
    genClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("✅ Google Gemini AI client initialized.");
  } catch (error) {
    console.error("❌ Failed to initialize Gemini client:", error);
  }
} else {
  console.warn("⚠️ GEMINI_API_KEY missing. Using demo fallback.");
}

// --- Clean AI feedback ---
function cleanFeedback(text) {
  if (!text) return "";
  let cleaned = text.replace(/[*_#>-]/g, "");
  cleaned = cleaned.replace(/\n+/g, "\n").replace(/\s{2,}/g, " ").trim();
  return cleaned;
}

// --- Feedback API endpoint ---
app.post("/api/feedback", async (req, res) => {
  console.log("📩 Incoming feedback request:", req.body);

  try {
    const { transcript, language, userLevel } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    // Demo fallback
    if (!genClient) {
      const demo = `Good job! "${transcript}" is correct. Tip: Keep practicing to improve further.`;
      return res.json({ feedback: demo });
    }

    // --- Human-friendly prompt with 5 tips ---
    const prompt = `
You are a friendly language tutor. A student at the "${userLevel || 'intermediate'}" level 
is learning "${language || 'English'}". 

Provide a short, simple, human-friendly feedback for this sentence:
"${transcript}"

Include **exactly 5 simple tips** to improve, in a friendly way. 
Do not give grammar rules or dictionary-style explanations.
Keep it concise, natural, and encouraging.
`;

    // --- Use supported Gemini model ---
    const modelName = 'gemini-2.5-flash';
    const model = genClient.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);

    // --- Extract text from response ---
    let textResponse = "";
    if (result?.response?.text) {
      textResponse = await result.response.text();
    } else if (result?.response?.candidates?.length) {
      textResponse = result.response.candidates[0]?.content?.parts?.[0]?.text || "";
    }

    // --- Clean the response ---
    const cleanText = cleanFeedback(textResponse);

    if (!cleanText) {
      console.error("❌ Gemini returned empty response after cleaning");
      return res.status(500).json({ error: "No feedback generated" });
    }

    console.log("✅ Feedback generated:", cleanText);
    res.status(200).json({ feedback: cleanText });

  } catch (err) {
    console.error("❌ Error in /api/feedback:", err.stack || err);
    res.status(500).json({ error: "Server error", message: err.message || "Internal server error" });
  }
});

// --- Start server ---
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
