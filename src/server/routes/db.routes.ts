import { Express } from "express";
import { createFile, fetchFiles } from "../api/db/file.api";
import { requireActiveSession } from "../api/middleware/auth.middleware";


export function setupDbRoutes(app: Express): void {
  // Route: Create a new file
  app.post("/api/files/create", requireActiveSession, async (req: any, res: any) => {
    try {
      const { userEmail, fileName } = req.body;

      if (!userEmail) {
        res.status(400).json({ error: "userEmail is required" });
        return;
      }

      const file = await createFile({ userEmail, fileName });

      res.status(201).json({ success: true, file });
    } catch (error: any) {
      console.error("Error creating file:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route: Fetch files for a user
  app.get("/api/files", async (req: any, res: any) => {
    try {
      const { userEmail, includeTrash } = req.query;

      if (!userEmail) {
        res.status(400).json({ error: "userEmail is required" });
        return;
      }

      const files = await fetchFiles({
        userEmail,
        includeTrash: includeTrash === "true",
      });

      res.status(200).json({ success: true, files });
    } catch (error: any) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
