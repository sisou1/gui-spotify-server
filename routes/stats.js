import { getAnalyticsSnapshot } from "../services/analytics.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "never";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "invalid date";
  }
  return date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function buildStatsPage(snapshot) {
  const usersRows = snapshot.users.length
    ? snapshot.users
        .map(
          (entry) => `
            <tr>
              <td>${escapeHtml(entry.user)}</td>
              <td>${entry.adds}</td>
              <td>${entry.skips}</td>
              <td>${entry.totalCommands}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="4">No data yet</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Server Stats</title>
    <style>
      :root { color-scheme: light; }
      body {
        font-family: "Segoe UI", Tahoma, sans-serif;
        margin: 24px;
        line-height: 1.4;
        background: #f7f7f8;
        color: #1f2937;
      }
      .card {
        background: #fff;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 16px;
      }
      h1, h2 { margin-top: 0; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        text-align: left;
      }
      th { background: #f3f4f6; }
      .muted { color: #6b7280; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Spotify Bot Server Stats</h1>
      <p class="muted">Last update: ${escapeHtml(formatDate(snapshot.updatedAt))}</p>
      <p><strong>Total commands:</strong> ${snapshot.totals.commands}</p>
      <p><strong>Total adds:</strong> ${snapshot.totals.adds}</p>
      <p><strong>Total skips:</strong> ${snapshot.totals.skips}</p>
    </div>

    <div class="card">
      <h2>Users</h2>
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Adds</th>
            <th>Skips</th>
            <th>Total Commands</th>
          </tr>
        </thead>
        <tbody>
          ${usersRows}
        </tbody>
      </table>
    </div>
  </body>
</html>`;
}

export function registerStatsRoute(app) {
  const renderServerStats = (_req, res) => {
    const snapshot = getAnalyticsSnapshot(200);
    return res.type("html").send(buildStatsPage(snapshot));
  };

  app.get("/stats", (req, res) => {
    const requestedLimit = Number(req.query?.top || 20);
    const topLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 20;
    return res.json(getAnalyticsSnapshot(topLimit));
  });

  app.get("/server-stats", renderServerStats);
  app.get("/stats-serveur", renderServerStats);
  app.get("/stats_serveur", (_req, res) => res.redirect(302, "/server-stats"));
}
