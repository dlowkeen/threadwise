import { slackClient, SlackClientManager, ThreadMessage } from '../clients/slack';

// src/jobs/threadAnalyzer.ts
interface Workspace {
  id: string;
  teamId: string;
  channels: string[];
  settings: {
    threadThreshold: number;
    // other workspace-specific settings
  }
}

export class ThreadAnalyzerJob {
  private slackClient: SlackClientManager;

  constructor() {
    this.slackClient = slackClient;
  }

  async processAllWorkspaces() {
    try {
      // 1. Get all active workspaces from DB
    //   const workspaces = await db.workspaces.findAll({
    //     where: { isActive: true }
    //   }); // TO-DO: Implement database lookup for workspaces, hardcoding sample for now
    const workspaces = [
        {
            id: null as unknown as string,
            channels: ['C06KQR10T4N'],
            settings: {
                threadThreshold: 2
            }
        }
    ];

      // 2. Process workspaces in chunks to avoid memory issues
      const CHUNK_SIZE = 5;
      for (let i = 0; i < workspaces.length; i += CHUNK_SIZE) {
        const chunk = workspaces.slice(i, i + CHUNK_SIZE);
        
        // Process chunk concurrently
        await Promise.all(
          chunk.map(workspace => this.processWorkspace(workspace as Workspace))
        );
      }
    } catch (error) {
      console.error('Error processing workspaces:', error);
    }
  }

  async processWorkspace(workspace: Workspace) {
    try {
      // Process each channel in the workspace
      for (const channelId of workspace.channels) {
        // Get threads using workspace-specific client
        const threads = await this.slackClient.getThreadRoots(
          channelId,
          workspace.id
        );

        // Process each thread
        for (const thread of threads) {
          console.log("thread", thread);
          if (this.shouldProcessThread(thread, workspace.settings)) {
            console.log("processing thread", thread);
            await this.processThread(thread, channelId, workspace);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing workspace ${workspace.id}:`, error);
      // Log workspace error for monitoring
      await console.error(`Error processing workspace ${workspace.id}:`, error);
    }
  }

  private shouldProcessThread(thread: ThreadMessage, settings: any): boolean {
    return (thread.reply_count || 0) > settings.threadThreshold;
  }

  private async processThread(
    thread: ThreadMessage, 
    channelId: string,
    workspace: Workspace
  ) {
    try {
      // Get full thread messages
      const messages = await this.slackClient.getThreadMessages(
        channelId,
        thread.ts,
        workspace.id
      );

      // Process thread (summarize, analyze, etc)
      // ... your thread processing logic
      console.log("messages", messages);
      // Mark as processed
    //   await this.slackClient.addCheckmark(
    //     channelId,
    //     thread.ts,
    //     workspace.id
    //   );

    } catch (error) {
      console.error(`Error processing thread ${thread.ts}:`, error);
    }
  }
}
