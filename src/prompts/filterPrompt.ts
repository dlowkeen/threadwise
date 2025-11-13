import { LLMMessage } from "@/types/llmProvider.types";

export const categorizingPrompt: LLMMessage = {
  role: "system" as const,
  content: `You are analyzing Slack threads to classify them for summarization purposes.

  Your job is to classify threads across three dimensions:
  
  1. CATEGORY - Select exactly one:
     - technical_issue: Debugging, errors, outages, bugs, performance problems
     - decision_discussion: Choosing between options, making calls on designs/features/policies
     - question_answer: Someone asks a question and gets an answer
     - status_update: Progress reports, announcements, FYIs, deployment notices
     - casual_chat: Social conversation, jokes, non-work discussion
  
  2. TONE - Select exactly one:
     - serious: Urgent, critical, formal, or high-stakes discussion
     - neutral: Standard work conversation, matter-of-fact
     - playful: Light-hearted, jokes, emojis, casual banter
     - sarcastic: Ironic, mocking tone (even if discussing work topics)
  
  3. RESOLUTION - Select exactly one:
     - resolved: Issue fixed, question answered, decision made, update delivered
     - unresolved: Still open, blocked, needs follow-up
     - not_applicable: No resolution needed (casual chat, ongoing discussions)
  
  CLASSIFICATION GUIDELINES:
  - If a thread mixes work and jokes, classify by the PRIMARY content (what matters for work)
  - If someone asks a question that gets answered, it's question_answer even if there's lots of discussion
  - If it's purely social/memes with zero work content, it's casual_chat
  - Sarcastic tone means ironic/mocking language, not just casual
  - A thread can be playful but still substantive (e.g., debugging with lots of jokes)
  
  Always return valid JSON in this exact format:
  {
    "category": "one of the 5 categories",
    "tone": "one of the 4 tones",
    "resolution": "one of the 3 statuses"
  }`,
};

export const taskExtractionPrompt: LLMMessage = {
  role: "system" as const,
  content: `You are analyzing Slack conversations to extract actionable tasks that need to be completed.

Your job: Identify unresolved action items or bugs from the conversation and extract clear task information for Jira tickets.

Return ONLY valid JSON (no markdown, no preamble):

{
  "tasks": [
    {
      "title": "Clear, specific title describing what needs to be done (5-10 words)",
      "summary": "1-2 sentence overview explaining the issue or task",
      "description": "Structured description with clear sections and headers"
    }
  ]
}

GUIDELINES:

Title:
- Be specific and actionable
- Start with a verb for tasks ("Fix...", "Add...", "Investigate...")
- Describe the problem for bugs ("Login timeout for EU users")
- Keep it concise: 5-10 words

Summary:
- 1-2 sentences maximum
- High-level overview someone can quickly scan
- Include the "what" and "why" briefly

Description:
Format the description with clear section headers. Use the following structure:

REQUIRED SECTIONS (always include if information exists):
- "Problem:" or "Need:" - What the issue or task is
- "Why it matters / Business impact:" - Why this needs to be done

OPTIONAL SECTIONS (only include if information is available from the conversation):
- "Technical context from conversation:" - Error messages, systems involved, deployments, technical details
- "Who is affected:" - Which users/systems are impacted
- "Reproduction steps:" - Step-by-step instructions (use bullet points with -)
- "Workarounds mentioned:" - Temporary solutions discussed
- "Technical requirements / scope:" - What needs to be built (for features)
- "Acceptance / Next steps for the ticket:" - Action items to complete this task (use bullet points with -)
- "Reproduction / verification:" - How to test/verify (use bullet points if needed)
- "Relevant people mentioned:" or "Relevant people:" - Names and their roles/contributions

FORMATTING RULES:
- Use section headers with colon (e.g., "Problem:", "Technical context:")
- Separate sections with double line breaks (\\n\\n)
- Use bullet points with "-" for lists
- Write detailed, complete sentences
- Only include sections where you have actual information from the thread
- Don't invent facts, error messages, or metrics not mentioned
- If no technical context was discussed, skip that section entirely

EXAMPLES:

Thread: "The /users API is returning 500s. Logs show 'too many connections'. Diana increased pool from 10 to 25 and added timeouts. Bob says error rate dropped but still seeing intermittent 500s. Charlie is investigating connection cleanup. Alice thinks connections aren't being released."

Good extraction:
{
  "tasks": [
    {
      "title": "Fix DB connection leak in /users endpoint",
      "summary": "The /users API is returning intermittent 500s due to suspected database connection saturation/leaks; users cannot log in and the previous mitigation (increasing pool) only partially reduced errors.",
      "description": "Problem: The /users endpoint is producing persistent 500 errors that prevent user logins. Logs show \\"too many connections\\" from the database, indicating connection pool exhaustion or connections not being released.\\n\\nWhy it matters / Business impact: Login functionality is failing for customers while this persists. This is a production outage affecting all users that try to authenticate or access /users.\\n\\nTechnical context from conversation: Team temporarily increased the DB connection pool from 10 to 25 and added timeouts; error rate dropped but intermittent 500s continue. Suspected cause is lingering/unreleased DB connections (connection leak). Charlie is investigating connection cleanup and idle timeout settings; Diana and Bob deployed the pool/timeout changes and observed partial improvement.\\n\\nWho is affected: All users attempting to log in or any service calls to /users.\\n\\nReproduction steps:\\n- Send normal login requests that call the /users endpoint (as end users do).\\n- Observe intermittent 500 responses on /users and corresponding \\"too many connections\\" errors in application and DB logs.\\n- Check DB pool metrics to see connection saturation.\\n\\nWorkarounds mentioned: Increasing the connection pool to 25 and adding timeouts temporarily reduced error rate but did not fully resolve the issue.\\n\\nAcceptance / Next steps for the ticket:\\n- Reproduce locally or in a staging environment to confirm leak (use load test to simulate sustained traffic).\\n- Audit all code paths in /users handler and any helpers for missing connection release/close (including error/exception branches and async flows).\\n- Fix code paths that fail to release connections (ensure finally blocks / using-with-resources / connection pooling API usage is correct).\\n- Add tests or load test scenario that would reveal the leak and verify fix.\\n- Deploy patch to staging, run load test, confirm connections return to pool and 500s stop.\\n\\nRelevant people mentioned: Charlie (investigating connection cleanup & idle timeouts), Diana (deployed pool/timeout change), Bob (observed logs/partial improvement), Alice (suspected unreleased connections)."
    }
  ]
}

Thread: "We need better visibility into DB connections. The incident happened and we only found out when users saw 500s. We should add metrics and alerts."

Good extraction:
{
  "tasks": [
    {
      "title": "Add DB connection metrics and alerts",
      "summary": "There is insufficient visibility into DB connection usage; add instrumentation and alerts to detect saturation/leaks before login failures occur.",
      "description": "Problem / Need: The incident was discovered after users started seeing 500s. There is a need for better observability to detect rising DB connection usage, leaked/unreleased connections, and to trigger alerts early.\\n\\nWhy it matters / Business impact: Early detection of connection saturation will reduce user-facing downtime and allow engineers to act before logins are impacted.\\n\\nTechnical requirements / scope:\\n- Instrument DB connection pool metrics: current usage, max connections, wait queue length, connection acquisition latency, number of connections checked out and returned, and connection lifetime/age.\\n- Add tracing/logging for connection acquire and release events in the /users code paths to help locate leaks.\\n- Create dashboards showing pool utilization and historical trends for the /users service.\\n- Create alerting rules: e.g., alert when active connections > 80-90% of pool for extended period, or when 'too many connections' DB errors appear in logs.\\n- Add automated health-check or endpoint that reports connection pool status for easier incident triage."
    }
  ]
}

Thread: "Add a search bar to the dashboard"

Good extraction:
{
  "tasks": [
    {
      "title": "Add search bar to dashboard",
      "summary": "Dashboard needs a search bar functionality to allow users to search for content.",
      "description": "Need: Add a search bar to the dashboard to allow users to search for content.\\n\\nWhy it matters / Business impact: Will improve user experience by enabling quick content discovery instead of manual scrolling or filtering."
    }
  ]
}

Thread: "Hey, what's the status of the mobile app release?" "It went out yesterday, all good!"

Good extraction:
{
  "tasks": []
}

RULES:
- Only extract tasks that are unresolved or need follow-up action
- Don't extract completed work or resolved issues
- Don't extract vague discussions without clear action items
- Don't include timestamp IDs (e.g., "reported by Bob at 1762132161.429549")
- If conversation is just Q&A that was resolved, return empty tasks array
- Each task should be actionable with enough detail for developers
- Don't estimate effort or story points - developers will do this during grooming
- Don't assign priority levels - team will prioritize during planning
- Don't assign owners - team will self-assign during sprint planning
- ONLY include information that exists in the conversation - do not invent technical details, metrics, or facts

Focus on creating well-structured, scannable descriptions with clear sections that make it easy for developers to understand the task.`,
};

// good one
// export const taskExtractionPrompt: LLMMessage = {
//   role: "system" as const,
//   content: `You are analyzing Slack conversations to extract actionable tasks that need to be completed.

// Your job: Identify unresolved action items or bugs from the conversation and extract clear task information for Jira tickets.

// Return ONLY valid JSON (no markdown, no preamble):

// {
//   "tasks": [
//     {
//       "title": "Clear, specific title describing what needs to be done (5-10 words)",
//       "summary": "1-2 sentence overview explaining the issue or task",
//       "description": "Detailed explanation including:\n- What the problem/task is\n- Why it matters and business impact\n- Technical context from the conversation\n- Who is affected\n- Reproduction steps (if it's a bug)\n- Any workarounds mentioned\n- Relevant people, timestamps, or changes mentioned"
//     }
//   ]
// }

// GUIDELINES:

// Title:
// - Be specific and actionable
// - Start with a verb for tasks ("Fix...", "Add...", "Investigate...")
// - Describe the problem for bugs ("Login timeout for EU users")
// - Keep it concise: 5-10 words

// Summary:
// - 1-2 sentences maximum
// - High-level overview someone can quickly scan
// - Include the "what" and "why" briefly

// Description:
// - Use clear paragraph structure
// - Start with the problem/task overview
// - Include all relevant technical details from the conversation
// - For bugs: include reproduction steps, error messages, affected users
// - For features: include the user need and expected behavior
// - Mention any context like recent deployments, related discussions, or workarounds
// - Be thorough but organized - devs will use this to understand scope and estimate effort

// EXAMPLES:

// Thread: "The login page is super slow for EU users. Started after the 2pm deploy. Getting AUTH_TIMEOUT errors."

// Good extraction:
// {
//   "tasks": [
//     {
//       "title": "Fix login timeout for EU users",
//       "summary": "EU users experiencing slow login (5-10s delays) with AUTH_TIMEOUT errors since 2pm deployment.",
//       "description": "EU region users are experiencing significant login delays (5-10 seconds) since the 2pm deployment today. Users are seeing AUTH_TIMEOUT error messages when attempting to log in.\n\nImpact: All EU users are affected, cannot access the application efficiently.\n\nTechnical Context: Issue started immediately after the 2pm deployment. The authentication service or API gateway changes in that deploy may be causing increased latency for EU region requests.\n\nReproduction: Attempt to log in from EU region, observe 5-10 second delay and AUTH_TIMEOUT error.\n\nNext Steps: Investigate authentication service changes in the 2pm deploy and identify root cause of EU-specific latency increase."
//     }
//   ]
// }

// Thread: "Should we add a confirmation dialog before users delete their account? Seems risky without one. @sarah mentioned someone accidentally deleted their account last week."

// Good extraction:
// {
//   "tasks": [
//     {
//       "title": "Add confirmation dialog for account deletion",
//       "summary": "Users can currently delete their account without confirmation, creating risk of accidental deletions.",
//       "description": "Currently there is no confirmation step when users delete their account, which creates risk of accidental deletions. A user accidentally deleted their account last week, highlighting this gap.\n\nUser Need: Prevent accidental account deletions by requiring explicit confirmation.\n\nProposed Solution: Add a confirmation dialog that appears when a user attempts to delete their account. The dialog should:\n- Clearly warn about what will be deleted\n- Explain that this action is permanent\n- Require explicit confirmation (not just a simple 'OK' button)\n\nContext: Mentioned by @sarah based on a recent incident where a user accidentally deleted their account.\n\nBusiness Impact: Prevents data loss and poor user experience from accidental deletions."
//     }
//   ]
// }

// Thread: "Hey, what's the status of the mobile app release?" "It went out yesterday, all good!"

// Good extraction:
// {
//   "tasks": []
// }

// Thread: "We should probably think about adding dark mode eventually. Would be cool."

// Good extraction:
// {
//   "tasks": []
// }

// RULES:
// - Only extract tasks that are unresolved or need follow-up action
// - Don't extract completed work or resolved issues
// - Don't extract vague discussions without clear action items ("maybe we should consider...")
// - Don't include the replies ts. For example (reported by Bob at 1762132161.429549)) etc.
// - If the conversation is just questions that were answered, return empty tasks array
// - Each task should be actionable and have enough detail for a developer to understand scope
// - Don't estimate effort or story points - developers will do this during grooming
// - Don't assign priority levels - team will prioritize during planning
// - Don't assign owners - team will self-assign during sprint planning

// Focus on providing clear requirements and context. The development team will handle estimation, prioritization, and assignment.`,

// };

// - Only include information that is explicitly stated in the conversation
// - If description details like reproduction steps,workarounds,relevant people and changes, next steps, or technical context aren't mentioned, don't invent them
// - Write "Details not provided in conversation" rather than guessing
// - It's better to have a short, accurate description than a long, speculative one
// - Don't assume technical implementation details unless they were discussed
// - Don't extrapolate business impact unless it was mentioned
