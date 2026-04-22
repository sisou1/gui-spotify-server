import express from "express";
import cors from "cors";
import { registerAddSongRoute } from "./routes/add-song.js";
import { registerSkipRoute } from "./routes/skip.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const bodyLog = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : "{}";
  console.log(`[REQ] ${req.method} ${req.url} body=${bodyLog}`);

  const originalSend = res.send.bind(res);
  res.send = (payload) => {
    const responseLog =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    console.log(`[RES] ${req.method} ${req.url} status=${res.statusCode} body=${responseLog}`);
    return originalSend(payload);
  };

  next();
});

app.get("/", (_req, res) => {
  res.send("alive");
});

registerAddSongRoute(app);
registerSkipRoute(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
