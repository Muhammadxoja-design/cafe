// ... (avvalgi importlar)
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startBot } from "./bot";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // don't rethrow here — we already responded
    console.error('Unhandled error:', err);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  // default host: undefined (let OS choose), but on Windows prefer 127.0.0.1
  const preferredHost = process.platform === "win32" ? "127.0.0.1" : "0.0.0.0";

  // Only pass reusePort on platforms that support it (linux/darwin)
  const listenOptions: any = { port, host: preferredHost };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on http://${listenOptions.host}:${port}`);
    // Start Telegram bot after server is listening
    startBot().catch(err => {
      console.error('Failed to start bot:', err);
    });
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`);
    } else if (err.code === 'ENOTSUP') {
      console.error('Listen option not supported on this platform — retrying without host/reusePort...');
      // fallback: try simple listen without options object
      try {
        server.listen(port, () => {
          log(`Fallback: serving on http://127.0.0.1:${port}`);
          startBot().catch(e => console.error('Failed to start bot after fallback:', e));
        });
      } catch (e) {
        console.error('Fallback listen also failed:', e);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  });

})();
