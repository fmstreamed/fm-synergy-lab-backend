require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

// NEW: Import the detailed system prompt from its new file
const { jamesSystemPrompt } = require('./jamesDNAPrompt.js');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/ask-james", async (req, res) => {
  const { prompt, grid, sparkPlugReport } = req.body;

  if (!prompt || prompt.trim() === "" || !grid || !sparkPlugReport) {
    return res.status(400).json({ error: "A prompt and full tactical context must be provided." });
  }

  try {
    const activePlayers = grid.flat().filter(p => p.isActive);
    
    const formattedGrid = activePlayers.length > 0
      ? activePlayers.map(p => `- Player at L${p.line}C${p.col}: ${p.role} (${p.duty})`).join('\n')
      : "No active players in the formation.";

    const formattedReport = Array.isArray(sparkPlugReport)
      ? sparkPlugReport.join('\n')
      : "Synergy report is not available in the correct format.";

    const userMessageWithContext = `
Here is my current tactical setup and the latest synergy analysis. Please analyze it and answer my question.

---
## CURRENT TACTICAL SETUP
${formattedGrid}
---
## LATEST SPARKPLUG SYNERGY REPORT
${formattedReport}
---
## MY QUESTION
${prompt}
---
`;

    console.log("🧠 Enhanced prompt sent to James...");

    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          // MODIFIED: Use the imported jamesSystemPrompt variable
          content: jamesSystemPrompt 
        },
        {
          role: "user",
          content: userMessageWithContext
        }
      ]
    });

    const reply = gptResponse.choices[0]?.message?.content?.trim() || "No reply generated.";
    console.log("📬 James reply:", reply);

    res.json({ reply });
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);
    res.status(500).json({ error: "Failed to get a response from James." });
  }
});

app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});