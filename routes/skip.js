import { isRecentDuplicateRequest, skipCurrentTrack } from "../services/spotify.js";
import { recordSkip } from "../services/analytics.js";
import { setLastSkipEvent } from "../services/widget-state.js";

export function registerSkipRoute(app) {
  const adminSkipToken = String(process.env.ADMIN_SKIP_TOKEN || "").trim();

  const executeSkip = async ({ user, duplicateKey }, res) => {
    try {
      if (isRecentDuplicateRequest(user, duplicateKey)) {
        return res.send("duplicate");
      }

      await skipCurrentTrack();
      setLastSkipEvent();
      recordSkip({ user });
      return res.send("skipped");
    } catch (error) {
      console.error("Skip failed:", error.response?.data || error.message);
      return res.status(500).send("error");
    }
  };

  app.post("/skip", async (req, res) => {
    const user = req.body?.user;
    if (!user || !String(user).trim()) {
      return res.status(400).send("missing user");
    }
    return executeSkip({ user: String(user).trim(), duplicateKey: "__skip__" }, res);
  });

  app.get("/skip", (_req, res) => {
    return res.status(405).send("method not allowed");
  });

  app.get("/admin/skip/:token", async (req, res) => {
    const providedToken = String(req.params?.token || "").trim();
    if (!adminSkipToken || providedToken !== adminSkipToken) {
      return res.status(404).send("not found");
    }

    return executeSkip({ user: "admin", duplicateKey: "__skip_admin__" }, res);
  });
}
