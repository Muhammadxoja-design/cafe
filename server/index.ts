import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startBot } from "./bot";
import { type Server } from "http";

const app = express();

// Basic security + performance middleware
app.set("trust proxy", true); // if behind a proxy (Render, Heroku)
app.use(helmet());
app.use(compression());

// rate limiting (basic)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
  })
);

// Parse bodies with sane limits
app.use(
  express.json({
    limit: "100kb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Simple request logger (keeps your previous style)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  (res as any).json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 240) logLine = logLine.slice(0, 239) + "…";
      log(logLine);
    }
  });

  next();
});

// Health & readiness endpoints
app.get("/_health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/_ready", (_req, res) => res.status(200).send("ready"));

let server: Server | null = null;

async function startServer() {
  try {
    server = await registerRoutes(app);

    // Error-handling middleware should be registered AFTER routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err?.status || err?.statusCode || 500;
      const message = err?.message || "Internal Server Error";
      console.error("Unhandled error:", err);
      res.status(status).json({ message });
      // do not rethrow; we've responded
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = Number(process.env.PORT || "5000");
    const preferredHost = process.platform === "win32" ? "127.0.0.1" : "0.0.0.0";

    const listenOptions: any = { port, host: preferredHost };
    if (process.platform !== "win32") listenOptions.reusePort = true;

    server.listen(listenOptions, async () => {
      log(`serving on http://${listenOptions.host}:${port}`);
      try {
        await startBot();
        log("Telegram bot started");
      } catch (err) {
        console.error("Failed to start bot:", err);
      }
    });

    server.on("error", (err: any) => {
      console.error("Server listen error:", err);
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use.`);
      } else if (err.code === "ENOTSUP") {
        console.error("Listen option not supported — retrying without host/reusePort...");
        try {
          server!.listen(port, () => {
            log(`Fallback: serving on http://127.0.0.1:${port}`);
          });
        } catch (e) {
          console.error("Fallback listen failed:", e);
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(exitCode = 0) {
  console.log("Shutting down...");
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          console.log("HTTP server closed");
          resolve();
        });
      });
    }
    // if your bot exposes a stop method, call it here, e.g. await stopBot();
    // await stopBot?.();

    console.log("Shutdown complete");
    process.exit(exitCode);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // optional: shutdown(1);
});

// Warn if essential env vars missing
if (!process.env.BOT_TOKEN) {
  console.warn("Warning: BOT_TOKEN not set in environment");
}
if (!process.env.DB_PATH && !process.env.DATABASE_URL) {
  console.warn("Warning: no DB_PATH or DATABASE_URL env var set; ensure DB is configured");
}

// server/index.ts — qo'shing / yangilang (yuqori qismga)
const TRUST_PROXY = process.env.TRUST_PROXY ?? (process.env.NODE_ENV === "production" ? "1" : "0");

if (TRUST_PROXY === "0" || TRUST_PROXY.toLowerCase?.() === "false") {
  app.set("trust proxy", false);
} else if (/^\d+$/.test(TRUST_PROXY)) {
  app.set("trust proxy", Number(TRUST_PROXY)); // e.g. 1
} else {
  app.set("trust proxy", TRUST_PROXY); // string expression or subnet if needed
}

startServer();
