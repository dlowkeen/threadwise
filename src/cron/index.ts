import cron from "node-cron";
import axios from "axios";
import { config } from "../shared/utils/config";
import { ExecutionAdapter } from "./adapters/executionAdapter";
import { ExecutionAdapterFactory } from "./adapters/executionAdapterFactory";

interface Workspace {
  id: string;
  channels: string[];
}

class CronOrchestrator {
  private executionAdapter: ExecutionAdapter;
  private isRunning: boolean = false;
  private apiUrl: string;

  constructor() {
    // Create the appropriate execution adapter based on config
    this.executionAdapter = ExecutionAdapterFactory.createAdapter();

    // Set up API URL for fetching workspaces
    const port = config.server.port;
    const host = config.server.host;
    this.apiUrl = process.env.API_URL || `http://${host}:${port}`;

    console.log(
      `CronOrchestrator initialized with ${config.execution.mode} execution mode`
    );
  }

  /**
   * Trigger workspace analysis using the configured execution adapter
   */
  async triggerWorkspaceAnalysis(): Promise<void> {
    if (this.isRunning) {
      console.log("Analysis already running, skipping this cycle");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(
        `[${new Date().toISOString()}] Starting workspace analysis cycle`
      );
      console.log(`Execution mode: ${config.execution.mode}`);

      // Get all workspaces from database
      const workspaces = await this.getAllWorkspacesIds();
      console.log(`Found ${workspaces.length} workspaces to analyze`);

      // Execute analysis using the configured adapter
      const workspaceIds = workspaces.map((w) => w.id);
      const results = await this.executionAdapter.executeWorkspaces(
        workspaceIds
      );

      // Log results
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const duration = Date.now() - startTime;

      console.log(`Analysis cycle completed in ${duration}ms`);
      console.log(`Results: ${successful} successful, ${failed} failed`);

      // Log failed workspaces
      results.forEach((result) => {
        if (!result.success) {
          console.error(
            `Failed to analyze workspace ${result.workspaceId}: ${result.error}`
          );
        }
      });

      // Cleanup if supported (for K8s adapter)
      if (this.executionAdapter.cleanup) {
        await this.executionAdapter.cleanup();
      }
    } catch (error) {
      console.error("Error in analysis cycle:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get all workspaces from database via API server
   */
  private async getAllWorkspacesIds(): Promise<Workspace[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/workspaces/ids`, {
        timeout: 10000, // 10 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success && response.data.workspaces) {
        return response.data.workspaces;
      }
      throw new Error(
        "API returned unsuccessful response or missing workspaces"
      );
    } catch (error: any) {
      console.error(
        `Failed to fetch workspaces from API: ${error.message}`,
        error.response?.data || ""
      );
      throw new Error(`Failed to fetch workspaces from API: ${error.message}`);
    }
  }

  /**
   * Start the cron scheduler
   */
  start(schedule: string = "*/15 * * * *"): void {
    console.log(`Starting cron orchestrator with schedule: ${schedule}`);

    // Validate cron expression
    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }

    // Schedule the job
    cron.schedule(schedule, () => {
      this.triggerWorkspaceAnalysis();
    });

    console.log("✅ Cron orchestrator started successfully");

    // Optional: Run immediately on start
    if (process.env.RUN_ON_START === "true") {
      console.log("Running initial analysis...");
      this.triggerWorkspaceAnalysis();
    }
  }

  /**
   * Manually trigger analysis (for testing)
   */
  async runOnce(): Promise<void> {
    await this.triggerWorkspaceAnalysis();
  }
}

const cronOrchestrator = new CronOrchestrator();

// Start the cron when this file is run directly
const schedule = process.env.CRON_SCHEDULE || "*/15 * * * *";
cronOrchestrator.start(schedule);

// Handle process termination
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down gracefully...");
  process.exit(0);
});
