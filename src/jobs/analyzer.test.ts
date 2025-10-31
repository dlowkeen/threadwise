import { LLMClient } from "@/types/llmProvider.types";
import { ThreadAnalyzerJob } from "./analyzer";
import { questionAnswerContext } from "../prompts/enhancedContext";
import { LLMFactory } from "../providers/llmFactory";
import { config } from "../utils/config";
import { config as dotenvConfig } from "dotenv";
import { questionAnswerPrompt } from "../prompts/categoriesPrompts";
dotenvConfig();

describe("ThreadAnalyzerJob", () => {
  let LLMClient: LLMClient;
  let threadAnalyzer: ThreadAnalyzerJob;

  beforeEach(() => {
    threadAnalyzer = new ThreadAnalyzerJob();
    LLMClient = LLMFactory.createClient(config.llm);
  });

  describe("categorizingThreads", () => {
    describe("With a question and answer thread message", () => {
      it("Should return a valid JSON object with category, tone, resolution and category = question_answer", async () => {
        const questionAnswerResponse = await (
          threadAnalyzer as any
        ).categorizingThreads(LLMClient, questionAnswerContext);

        expect(questionAnswerResponse).toHaveProperty("category");
        expect(questionAnswerResponse).toHaveProperty("tone");
        expect(questionAnswerResponse).toHaveProperty("resolution");
        //don't want to separate this as another test because it would have to make another API Call
        expect(questionAnswerResponse).toHaveProperty(
          "category",
          "question_answer"
        );
        expect(questionAnswerResponse).toHaveProperty("resolution", "resolved");
      }, 20000);
    });
  });

  describe("summaryResponse", () => {
    describe("Takes a question & answer prompt, category, tone, resolution and thread message", () => {
      it("returns a question & answer response stating thread resolved and 500 errors and 30 second solution", async () => {
        const threadCategorized = {
          category: "question_answer",
          tone: "neutral",
          resolution: "resolved",
        };

        const questionAnswerResponse = await (
          threadAnalyzer as any
        ).summaryResponse(
          LLMClient,
          questionAnswerPrompt,
          threadCategorized,
          questionAnswerContext
        );

        expect(questionAnswerResponse).toHaveProperty("summary");
        expect(questionAnswerResponse).toHaveProperty(
          "summary",
          expect.stringContaining("500 errors")
        );
        // Need to add message to say it has been resolved. As this will variable. Multiple ways to state this.
        // expect(questionAnswerResponse).toHaveProperty("summary", expect.stringMatching(/resolved|resolve|fix|fixed/i));
        expect(questionAnswerResponse).toHaveProperty(
          "summary",
          expect.stringMatching(/database|db/i)
        );
        expect(questionAnswerResponse.summary).toContain("30");
        expect(questionAnswerResponse.summary).toContain("second");
      }, 20000);
    });
  });
});
