import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import coachHandler from "./api/coach.js";
import todayWorkoutHandler from "./api/workout/today.js";
import completeWorkoutHandler from "./api/workout/complete.js";
import sessionHandler from "./api/auth/session.js";
import recordsHistoryHandler from "./api/records/history.js";
import recordsOverviewHandler from "./api/records/overview.js";
import bodyFeedbackHandler from "./api/records/body-feedback.js";
import bodyWeightHandler from "./api/records/body-weight.js";
import safetyHandler from "./api/workout/safety.js";
import replaceHandler from "./api/workout/replace.js";
import maintenanceHandler from "./api/workout/maintenance.js";
import reviewHandler from "./api/workout/review.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.all('/api/auth/session', (req, res) => { void sessionHandler(req, res); });
app.all('/api/workout/today', (req, res) => { void todayWorkoutHandler(req, res); });
app.all('/api/workout/complete', (req, res) => { void completeWorkoutHandler(req, res); });
app.all('/api/workout/safety', (req, res) => { void safetyHandler(req, res); });
app.all('/api/workout/replace', (req, res) => { void replaceHandler(req, res); });
app.all('/api/workout/maintenance', (req, res) => { void maintenanceHandler(req, res); });
app.all('/api/workout/review', (req, res) => { void reviewHandler(req, res); });
app.all('/api/records/history', (req, res) => { void recordsHistoryHandler(req, res); });
app.all('/api/records/overview', (req, res) => { void recordsOverviewHandler(req, res); });
app.all('/api/records/body-feedback', (req, res) => { void bodyFeedbackHandler(req, res); });
app.all('/api/records/body-weight', (req, res) => { void bodyWeightHandler(req, res); });
app.all('/api/coach', (req, res) => { void coachHandler(req, res); });

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
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
