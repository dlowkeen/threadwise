import { Router, Request, Response } from "express";
import { query } from "../../shared/utils/db";
import { WorkspaceAnalyzer } from "@/services/workspaceAnalyzer";
import { prisma } from "@/utils/prisma";

const router = Router();
const analyzer = new WorkspaceAnalyzer();

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

router.post("/:workspaceId/analyze", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    console.log(`Analyzing workspace: ${workspaceId}`);
    const result = await analyzer.analyzeWorkspace(workspaceId);

    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error(
      `Error analyzing workspace ${req.params.workspaceId}:`,
      error
    );
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});


router.get("/ids", async (req: Request, res: Response) => {
  try {
    const workspaceIds = await prisma.workspace.findMany({
      select: {
        id: true
      }
    });

    const ids = workspaceIds.map(ws => ws.id);

    res.json({
      success: true, 
      workspaces: ids
    });

  } catch (error: any) {
    console.error("Error fetching workspace IDs:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
});


router.get("/:workspaceId/channelIds", async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  
  if (!workspaceId) {
    return res.status(400).json({
      success: false,
      error: "Missing workspaceId parameter"
    });
  }

  try {
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId: workspaceId
      },
      select: {
        slackChannelId: true 
      }
    });

    const channelIds = channels.map(chan => chan.slackChannelId);

    res.json({
      success: true,
      channelIds
    });
  } catch (error: any) {
    console.error("Error fetching channel IDs for workspace:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
});

export { router as workspacesRouter };
