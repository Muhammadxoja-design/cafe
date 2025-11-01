import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Try common development template locations (prefer project-level client)
      const clientCandidates = [
        path.resolve(process.cwd(), "client", "index.html"),      // monorepo-style
        path.resolve(__dirname, "..", "client", "index.html"),    // server/../client
        path.resolve(process.cwd(), "public", "index.html"),      // fallback
      ];

      const clientTemplatePath = clientCandidates.find(p => fs.existsSync(p));

      if (!clientTemplatePath) {
        throw new Error(
          `Could not find client index.html. Tried:\n  ${clientCandidates.join("\n  ")}`
        );
      }

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplatePath, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Candidate build locations (production). Order matters.
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"), // Vite default build output
    path.resolve(process.cwd(), "server", "public"), // older layout: server/public
    path.resolve(process.cwd(), "public"), // simple public folder
    path.resolve(__dirname, "public"), // relative to compiled server file
  ];

  const found = candidates.find(p => fs.existsSync(p));

  if (!found) {
    throw new Error(
      `Could not find the build directory. Tried:\n  ${candidates.join("\n  ")}\n` +
      `Run 'npm run build' locally and ensure build output (dist/public) is produced during build step.`
    );
  }

  // log for visibility in deploy logs
  console.log(`Serving static files from: ${found}`);

  app.use(express.static(found));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(found, "index.html"));
  });
}
