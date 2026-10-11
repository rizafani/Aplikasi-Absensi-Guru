// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var distPath = path.resolve(__dirname, "dist");
app.use(express.json());
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Index file not found. Please build the frontend.");
    }
  });
} else {
  app.get("*", (_req, res) => {
    res.status(200).send("Server is running. Please run npm run build to generate dist assets.");
  });
}
var defaultPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var isNginxPresent = fs.existsSync("/etc/nginx/nginx.conf");
var targetPort = isNginxPresent ? 3e3 : defaultPort;
function startServer(port, attemptFallback = true) {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port} (0.0.0.0)`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attemptFallback) {
      const fallbackPort = port === 3e3 ? 8080 : 3e3;
      console.warn(`Port ${port} is in use. Falling back to port ${fallbackPort}...`);
      startServer(fallbackPort, false);
    } else {
      console.error(`Server error on port ${port}:`, err);
      process.exit(1);
    }
  });
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      console.log("HTTP server closed");
    });
  });
}
startServer(targetPort);
