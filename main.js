import express from "express";
import cors from "cors";
import { registerAddSongRoute } from "./routes/add-song.js";
import { registerSkipRoute } from "./routes/skip.js";
import { registerWidgetStateRoute } from "./routes/widget-state.js";
import { registerStatsRoute } from "./routes/stats.js";
import { initializeAnalytics } from "./services/analytics.js";
import { isPlaybackMockEnabled, runtimeMode } from "./services/runtime-config.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const isAdminSkipRequest = req.method === "GET" && /^\/admin\/skip\/[^/]+/.test(req.url);
  const isWidgetStatePoll = req.method === "GET" && req.url === "/widget-state";
  const isStatsPageRequest =
    req.method === "GET" &&
    (req.url === "/server-stats" || req.url === "/stats-serveur" || req.url === "/stats_serveur");
  const requestUrlForLogs = isAdminSkipRequest ? "/admin/skip/[REDACTED]" : req.url;

  if (req.method === "POST" && req.url === "/add-song") {
    const query = req.body?.query ?? "";
    const user = req.body?.user ?? "";
    console.log(`[REQ] POST /add-song query="${query}" user="${user}"`);
  } else if (isAdminSkipRequest) {
    console.log(`[REQ] ${req.method} ${requestUrlForLogs} body={}`);
  } else if (isWidgetStatePoll) {
    // no-op
  } else {
    const bodyLog = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : "{}";
    console.log(`[REQ] ${req.method} ${requestUrlForLogs} body=${bodyLog}`);
  }

  const originalSend = res.send.bind(res);
  res.send = (payload) => {
    if (req.method === "POST" && req.url === "/add-song") {
      const result = typeof payload === "string" ? payload : JSON.stringify(payload);
      const trackLog = res.locals?.trackLabel ? ` track="${res.locals.trackLabel}"` : "";
      console.log(`[RES] POST /add-song status=${res.statusCode} result="${result}"${trackLog}`);
    } else if (isAdminSkipRequest) {
      const result = typeof payload === "string" ? payload : JSON.stringify(payload);
      console.log(`[RES] ${req.method} ${requestUrlForLogs} status=${res.statusCode} body=${result}`);
    } else if (isStatsPageRequest) {
      const html = typeof payload === "string" ? payload : "";
      const bytes = Buffer.byteLength(html, "utf8");
      console.log(`[RES] ${req.method} ${requestUrlForLogs} status=${res.statusCode} body=[html ${bytes} bytes]`);
    } else if (isWidgetStatePoll) {
      // no-op
    } else {
      let responseLog = typeof payload === "string" ? payload : JSON.stringify(payload);
      if (responseLog.length > 500) {
        responseLog = `${responseLog.slice(0, 500)}... [truncated ${responseLog.length} chars]`;
      }
      console.log(`[RES] ${req.method} ${requestUrlForLogs} status=${res.statusCode} body=${responseLog}`);
    }
    return originalSend(payload);
  };

  next();
});

app.get("/", (_req, res) => {
  res.send("alive");
});

registerAddSongRoute(app);
registerSkipRoute(app);
registerWidgetStateRoute(app);
registerStatsRoute(app);

const PORT = process.env.PORT || 3000;

async function startServer() {
  await initializeAnalytics();
  app.listen(PORT, () => {
    console.log(
      `Server listening on port ${PORT} (mode=${runtimeMode}, playbackMock=${isPlaybackMockEnabled})`
    );
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
