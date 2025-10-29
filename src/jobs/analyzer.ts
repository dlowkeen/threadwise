import { LLMFactory } from "../providers/llmFactory";
import {
  slackClient,
  SlackClientManager,
  ThreadMessage,
} from "../clients/slack";
import { LLMClient, LLMMessage } from "../types/llmProvider.types";
import { config } from "../utils/config";
import {
  CategoryResponse,
  EnhancedThreadContext,
  FilterPrompt,
} from "@/types/threadAnalysis.types";
import { filterPrompt } from "../prompts/filterPrompt";
import {
  questionAnswerPrompt,
  technicalIssuePrompt,
  decisionDiscussionPrompt,
  statusUpdatePrompt,
} from "../prompts/categoriesPrompts";

import {
  questionAnswerContext,
  technicalIssueContext,
  decisionDiscussionContext,
  statusUpdateContext,
  casualChatContext,
} from "../prompts/enhancedContext";

// src/jobs/threadAnalyzer.ts
interface Workspace {
  id: string;
  teamId: string;
  channels: string[];
  settings: {
    threadThreshold: number;
    // other workspace-specific settings
  };
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
          channels: ["C06KQR10T4N"],
          settings: {
            threadThreshold: 2,
          },
        },
      ];

      // 2. Process workspaces in chunks to avoid memory issues
      const CHUNK_SIZE = 5;
      for (let i = 0; i < workspaces.length; i += CHUNK_SIZE) {
        const chunk = workspaces.slice(i, i + CHUNK_SIZE);

        // Process chunk concurrently
        await Promise.all(
          chunk.map((workspace) =>
            this.processWorkspace(workspace as Workspace)
          )
        );
      }
    } catch (error) {
      console.error("Error processing workspaces:", error);
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
          // console.log("thread", thread);
          if (this.shouldProcessThread(thread, workspace.settings)) {
            // console.log("processing thread", thread);
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
      // Get full thread messages (comment messages if you're testing.)
      const messages = await this.slackClient.getThreadMessages(
        channelId,
        thread.ts,
        workspace.id
      );
      const llmClient: LLMClient = LLMFactory.createClient(config.llm);

      // This will select the prompt for the scenario you want.

      // const TEST_MODE: string = "status_update";

      // const enhancedContext =
      //   TEST_MODE === "question_answer"
      //     ? questionAnswerContext
      //     : TEST_MODE === "technical_issue"
      //     ? technicalIssueContext
      //     : TEST_MODE === "decision_discussion"
      //     ? decisionDiscussionContext
      //     : TEST_MODE === "status_update"
      //     ? statusUpdateContext
      //     : casualChatContext;

      //original, ( This is the original uncomment if you want to test the )

      const enhancedContext: EnhancedThreadContext = {
        thread: {
          text: thread.text,
          user: thread.user,
          reply_count: thread.reply_count,
          reply_users_count: thread.reply_users_count,
          reply_users: thread.reply_users,
          reactions: thread.reactions,
          is_locked: thread.is_locked,
        },
        messages: await Promise.all(
          messages.map(async (msg) => ({
            user: msg.user,
            userName: await this.slackClient.getUserName(
              msg.user,
              workspace.id
            ),
            text: msg.text,
            timestamp: msg.ts,
          }))
        ),
      };

      // Approach # 1
      const filteredThreadCategory: FilterPrompt = await this.filterThreads(
        llmClient,
        enhancedContext
      );
      const { category, tone, resolution } = filteredThreadCategory;

      console.log(`filteredThread category: ${category}`);

      if (!!category) {
        switch (category) {
          case "technical_issue":
            return this.categoryResponse(
              llmClient,
              technicalIssuePrompt,
              filteredThreadCategory,
              enhancedContext
            );
          case "question_answer":
            return this.categoryResponse(
              llmClient,
              questionAnswerPrompt,
              filteredThreadCategory,
              enhancedContext
            );
          case "decision_discussion":
            return this.categoryResponse(
              llmClient,
              decisionDiscussionPrompt,
              filteredThreadCategory,
              enhancedContext
            );
          case "status_update":
            return this.categoryResponse(
              llmClient,
              statusUpdatePrompt,
              filteredThreadCategory,
              enhancedContext
            );
          case "casual_chat":
            console.log("casual chat");
        }
      }
    } catch (error) {
      console.error(`Error processing thread ${thread.ts}:`, error);
    }
  }

  private async filterThreads(
    llmClient: LLMClient,
    enhancedContext: EnhancedThreadContext
  ): Promise<FilterPrompt> {
    try {
      const response = await llmClient.generateResponse([
        filterPrompt,
        {
          role: "user",
          content: `Classify this Slack thread:
          Thread data: ${JSON.stringify(enhancedContext, null, 2)}`,
        },
      ]);

      return JSON.parse(response.content);
    } catch (error) {
      console.error(`Error filtering thread:`, error);
      throw error;
    }
  }

  private async categoryResponse(
    llmClient: LLMClient,
    prompt: LLMMessage,
    filteredThreadCategory: FilterPrompt,
    enhancedContext: EnhancedThreadContext
  ): Promise<CategoryResponse> {
    try {
      const categoryResponse = await llmClient.generateResponse([
        prompt,
        {
          role: "user",
          content: `Analyze this technical issue thread:
        Thread Data: ${JSON.stringify(enhancedContext, null, 2)}
        Filter Results: ${JSON.stringify(filteredThreadCategory, null, 2)}`,
        },
      ]);
      console.log(JSON.parse(categoryResponse.content));
      return JSON.parse(categoryResponse.content);
    } catch (error) {
      console.warn(error);
      throw error;
    }
  }
}

//  Approach 1

//       Step 1: Classify (single call)
//       ├─ Category: technical_issue | decision_discussion | casual_chat | status_update | question_answer
//       ├─ Tone: serious | neutral | playful | sarcastic
//       └─ Resolution: resolved | unresolved | not_applicable

//      Step 2: Route to specialized prompt based on category

// Approach 2

//       Stage 1: Filter
// ├─ Casual → "Team chat" or skip
// ├─ Quick Resolution → "Q: [x], A: [y]"
// ├─ Information Sharing → "[Person] announced [x]"
// └─ Substantive → Stage 2

// Stage 2: Deep Analysis
// ├─ Category: technical_issue | decision | question_answer | status_update
// ├─ Resolution: resolved | open
// └─ Generate structured summary with action items

//  Scenario 2

// const filteredThreadCategory: FilterPrompt = await this.filterThreads(
//   llmClient,
//   enhancedContext
// );
// // const { category, tone, resolution } = filteredThreadCategory;
// const { category, reasoning } = filteredThreadCategory;

// console.log(`filteredThread category: ${category}`);

// if (!!category && category == 'substantive') {
//   const categoryResponse = await llmClient.generateResponse([
//     substantiveCategoryPrompt,
//     {
//       role: "user",
//       content: `Classify this substantive thread:
//       ${JSON.stringify(enhancedContext, null, 2)}`
//     }
//   ]);

//   const substantiveCategory = JSON.parse(categoryResponse.content);
//   console.log(`substanstive Category ${substantiveCategory.category}`);

// }

// const response = await llmClient.generateResponse([
//   {
//     role: 'system',
//     content: `You are a Slack thread analyzer. Respond with valid JSON in this exact format:
//     {
//       "summary": "Comprehensive summary focusing on key points, decisions made, and blockers",
//       "resolution": true
//     }`
//   },
//   {
//     role: 'user',
//     content: `Analyze this Slack thread and provide a comprehensive summary focusing on key points, decisions made, and blockers. Also determine if the issue has been resolved.

//     Thread data: ${JSON.stringify(enhancedContext, null, 2)}`
//   }
// ]);
// let { summary, resolution } = JSON.parse(response.content);

// console.log(summary);

// if (resolution) {
//   summary = `Thread is resolved: ${summary}`
//   await this.slackClient.postStatusUpdate({
//     channelId,
//     summary,
//     threadTs: thread.ts,
//     workspaceId: workspace.id
//   })
//   await this.slackClient.addCheckmark(channelId, thread.ts, workspace.id);
// }
// else {
//   summary = `${summary} \n\n Does anyone have a status update on this? `
//   this.slackClient.postStatusUpdate({
//     channelId,
//     summary,
//     threadTs: thread.ts,
//     workspaceId: workspace.id
//   })
// }

// Process thread (summarize, analyze, etc)
// ... your thread processing logic
// console.log("messages", messages);
