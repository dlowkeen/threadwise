import { Router, Request, Response } from "express";
import { query } from "../../shared/utils/db";

const router = Router();

interface WorkspaceRow {
  id: string;
  slack_team_id: string;
  thread_threshold: number;
  slack_channel_id: string | null;
}

interface WorkspaceResponse {
  id: string;
  teamId: string;
  channels: string[];
  settings: {
    threadThreshold: number;
  };
}

/**
 * Get all workspaces with their active channels
 * GET /api/workspaces
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    // Query to fetch all workspaces with their active channels
    const sql = `
      SELECT 
        w.id,
        w.slack_team_id,
        w.thread_threshold,
        c.slack_channel_id
      FROM workspaces w
      LEFT JOIN channels c ON w.id = c.workspace_id AND c.is_active = true
      ORDER BY w.id, c.slack_channel_id
    `;

    const rows = await query<WorkspaceRow>(sql);

    // Transform flat result set into nested workspace objects
    const workspaceMap = new Map<string, WorkspaceResponse>();

    for (const row of rows) {
      if (!workspaceMap.has(row.id)) {
        workspaceMap.set(row.id, {
          id: row.id,
          teamId: row.slack_team_id,
          channels: [],
          settings: {
            threadThreshold: row.thread_threshold,
          },
        });
      }

      const workspace = workspaceMap.get(row.id)!;
      if (row.slack_channel_id) {
        workspace.channels.push(row.slack_channel_id);
      }
    }

    const workspaces = Array.from(workspaceMap.values());

    res.json({
      success: true,
      workspaces,
    });
  } catch (error: any) {
    console.error("Error fetching workspaces:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export { router as workspacesRouter };
