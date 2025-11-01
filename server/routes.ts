// server/routes.ts
import { Express } from "express";
import http from "http";

export async function registerRoutes(app: Express): Promise<http.Server> {
  // misol route'lar
  app.get("/api/hello", (_req, res) => res.json({ hello: "world" }));

  // Agar serverni shu yerda yaratishni xohlasangiz:
  const server = http.createServer(app);
  return server;
}

// Agar boshqa joylarda default import bilan ishlashsa, ham named ham default eksport qiling:
export default registerRoutes;
