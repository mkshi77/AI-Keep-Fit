import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import todayWorkoutHandler from "./api/workout/today.js";
import completeWorkoutHandler from "./api/workout/complete.js";
import sessionHandler from "./api/auth/session.js";
import recordsHistoryHandler from "./api/records/history.js";
import recordsOverviewHandler from "./api/records/overview.js";
import bodyFeedbackHandler from "./api/records/body-feedback.js";
import bodyWeightHandler from "./api/records/body-weight.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.all('/api/auth/session', (req, res) => { void sessionHandler(req, res); });
app.all('/api/workout/today', (req, res) => { void todayWorkoutHandler(req, res); });
app.all('/api/workout/complete', (req, res) => { void completeWorkoutHandler(req, res); });
app.all('/api/records/history', (req, res) => { void recordsHistoryHandler(req, res); });
app.all('/api/records/overview', (req, res) => { void recordsOverviewHandler(req, res); });
app.all('/api/records/body-feedback', (req, res) => { void bodyFeedbackHandler(req, res); });
app.all('/api/records/body-weight', (req, res) => { void bodyWeightHandler(req, res); });

// Lazy-initialized Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Coach chat endpoint
app.post("/api/coach", async (req, res) => {
  try {
    const { message, history, context } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const ai = getGeminiClient();

    // Fallback if no Gemini API key configured
    if (!ai) {
      // Provide intelligent context-aware local response
      let reply = "收到。请继续保持专注，注意动作离心控制与稳定支撑。";
      let proposedFeedback = null;

      const lower = message.toLowerCase();
      if (message.includes("不舒服") || message.includes("痛") || message.includes("酸") || message.includes("肩") || message.includes("膝")) {
        reply = "收到，如果局部出现牵拉刺痛或不适，建议调整握距/站距，并在动作行程末端减小幅度或稍微降重。已为你准备身体反馈记录：";
        proposedFeedback = {
          exercise: context?.currentExercise || "坐姿绳索划船",
          location: message.includes("膝") ? "右膝关节" : (message.includes("肩") ? "右肩前侧" : "不适部位"),
          discomfortLevel: "4 / 10",
          note: message
        };
      } else if (message.includes("加重量") || message.includes("重量")) {
        reply = "如果上一组 RIR 储备在 2 次以上且轨迹稳定，下一组建议微增 +2.5kg；若目标次数较为勉强（RIR ≤ 1），请保持现有重量夯实质量。";
      } else if (message.includes("RIR") || message.includes("怎么做")) {
        reply = "当前 RIR 2 处于超量恢复的黄金刺激区间！下一组保持相同的离心节奏（下降2秒），确保核心收紧，稳健完成设定次数即可。";
      }

      res.json({
        reply,
        proposedFeedback,
      });
      return;
    }

    const systemInstruction = `你是一位顶级力量训练与健美体能教练，名字叫「Keep Fit AI 教练」。
你专业、冷静、鼓励性强且注重安全与动作模式（基于科学阻抗训练、RPE/RIR 力竭储备理论、动作力线与关节健康）。
当前训练上下文:
- 当前动作: ${context?.currentExercise || "坐姿绳索划船"}
- 进度: ${context?.currentSet || 6} / ${context?.totalSets || 12} 组
- 用户之前动作: 史密斯平板卧推 (4组已完成)

回答要求:
1. 用中文回答，言简意赅（通常 1-3 句话），直击要害，适合在健身房训练间歇快速阅读。
2. 如果用户反馈了身体不适、疼痛或异常受力（例如“肩不舒服”、“刺痛”），必须：
   - 给出即时动作微调建议（如改变握距、沉肩、减小行程或降重）；
   - 在回答最后输出 JSON 代码块格式的记录建议，格式为：
   \`\`\`json
   {
     "proposedFeedback": {
       "exercise": "动作名称",
       "location": "不适位置",
       "discomfortLevel": "X / 10",
       "note": "简短备注"
     }
   }
   \`\`\`
3. 如果用户询问是否加重、减重、或组间恢复，依据 RIR 给出现实可执行的建议。`;

    // Format chat history
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const replyText = response.text || "已收到，请保持核心稳定并注意呼吸。";

    // Extract any JSON proposedFeedback
    let proposedFeedback = null;
    let cleanReply = replyText;
    const jsonMatch = replyText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.proposedFeedback) {
          proposedFeedback = parsed.proposedFeedback;
        }
        cleanReply = replyText.replace(/```json[\s\S]*?```/, "").trim();
      } catch (e) {
        // ignore parse error
      }
    }

    res.json({
      reply: cleanReply,
      proposedFeedback,
    });
  } catch (error: any) {
    console.error("AI Coach Error:", error);
    res.status(500).json({
      reply: "训练中保持专注。如果感到明显刺痛，请立即停止动作并休息。",
      error: error?.message || "Internal error",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Keep Fit Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
