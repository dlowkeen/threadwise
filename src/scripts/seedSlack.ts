/**
 * Seed a Slack channel with realistic test threads for Threadwise.
 *
 * Each fake person is a separate Slack app (its own bot user ID), so the
 * analyzer sees distinct speakers with real names, the same as in production.
 *
 * Setup (.env):
 *   SEED_TOKEN_ALEX=xoxb-...      bot token of the "Alex" app  (scopes: chat:write, chat:write.public)
 *   SEED_TOKEN_LINDA=xoxb-...     bot token of the "Linda" app
 *   SEED_CHANNEL_ID=C...          optional; defaults to SLACK_CHANNEL_ID
 *
 * Usage:
 *   npm run seed                       # post every thread
 *   npm run seed -- outage pool        # post only threads whose key contains "outage" or "pool"
 *   npm run seed -- --list             # list threads without posting
 *
 * Not part of the app: the Dockerfiles copy only src/shared, src/api and src/cron.
 */
import { config as dotenvConfig } from "dotenv";
import { WebClient } from "@slack/web-api";

dotenvConfig({ override: true });

type Speaker = "alex" | "linda";

interface SeedThread {
  key: string;
  /** What the analyzer should decide; printed so you can compare with its output. */
  expect: string;
  messages: Array<[Speaker, string]>; // first message is the thread root
}

// The analyzer only processes threads with MORE than thread_threshold (default 2) replies,
// so every thread except the "short" one has at least 3 replies.
const THREADS: SeedThread[] = [
  {
    key: "outage-db-pool-resolved",
    expect: "technical_issue, resolved → ✅ summary + checkmark",
    messages: [
      [
        "alex",
        "Login is returning 500s in prod since the 2pm deploy. Anyone else seeing this?",
      ],
      [
        "linda",
        "Yep, seeing it too. Logs are full of `remaining connection slots are reserved` from Postgres.",
      ],
      [
        "alex",
        "The deploy scaled the API from 2 to 6 replicas, and pool max is still 20 per pod. That's 120 connections against a limit of 100.",
      ],
      ["linda", "That's it. I'll drop pool max to 12 per pod and redeploy."],
      ["linda", "Redeployed. Error rate is back to 0 and login works again."],
      [
        "alex",
        "Confirmed on my side. Thanks! I'll add a check for this in the deploy pipeline.",
      ],
    ],
  },
  {
    key: "flaky-ci-unresolved",
    expect: "technical_issue, unresolved → ⚠️ 'Issue Still Unresolved' reply",
    messages: [
      [
        "linda",
        "The checkout e2e test has failed on main 4 times today with a timeout on the payment iframe. Has anyone looked into it?",
      ],
      [
        "alex",
        "I re-ran it twice and it passed once. Feels like a race with the Stripe mock spinning up.",
      ],
      [
        "linda",
        "Could be. I tried increasing the wait to 10s and it still flaked.",
      ],
      [
        "alex",
        "I'm out tomorrow so I can't dig in. Can someone pick this up? It's blocking merges.",
      ],
    ],
  },
  {
    key: "question-rotate-secret",
    expect: "question_answer, resolved",
    messages: [
      [
        "alex",
        "Quick question: how do we rotate the Stripe webhook signing secret without dropping events?",
      ],
      [
        "linda",
        "Create the new endpoint secret in the Stripe dashboard first. Stripe signs with both for 24h.",
      ],
      [
        "linda",
        "Then update STRIPE_WEBHOOK_SECRET in the secret store and roll the API pods. The runbook is in Confluence under Payments → Rotations.",
      ],
      ["alex", "Perfect, that's what I needed. Thanks!"],
    ],
  },
  {
    key: "decision-queue-choice",
    expect: "decision_discussion, resolved (decision made)",
    messages: [
      [
        "linda",
        "We need a queue for the email notification service. Options: SQS or self-hosted RabbitMQ. Thoughts?",
      ],
      [
        "alex",
        "SQS means no ops burden and it's cheap at our volume. The downside is vendor lock-in and no priority queues.",
      ],
      [
        "linda",
        "We don't need priorities yet, and nobody wants to be on call for RabbitMQ.",
      ],
      [
        "alex",
        "Agreed. Let's go with SQS plus a DLQ, and revisit if we need ordering guarantees.",
      ],
      ["linda", "Decision made: SQS. I'll write the ADR today."],
    ],
  },
  {
    key: "status-release",
    expect: "status_update",
    messages: [
      [
        "alex",
        "Heads up: deploying v2.4.0 (search filters + rate limiter) to prod at 3pm.",
      ],
      ["linda", "Staging smoke tests are all green 👍"],
      ["alex", "Deploy started. Canary is at 10%."],
      ["alex", "Canary looks healthy, rolled out to 100%. v2.4.0 is live."],
    ],
  },
  {
    key: "casual-lunch",
    expect: "casual_chat → should be SKIPPED (no reply, no Jira ticket)",
    messages: [
      ["linda", "Anyone up for tacos at 12:30?"],
      ["alex", "Always 🌮"],
      ["linda", "The new place on 5th or the usual?"],
      ["alex", "New place. I heard their al pastor is great"],
    ],
  },
  {
    key: "short-below-threshold",
    expect: "only 2 replies → should be SKIPPED by thread_threshold",
    messages: [
      ["alex", "Is the staging DB down? My migrations are hanging."],
      ["linda", "It was restarting, should be back now."],
      ["alex", "Yep, works. Thanks"],
    ],
  },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    THREADS.forEach((t) =>
      console.log(
        `${t.key.padEnd(26)} ${t.messages.length - 1} replies  expect: ${
          t.expect
        }`
      )
    );
    return;
  }

  const channel = process.env.SEED_CHANNEL_ID || process.env.SLACK_CHANNEL_ID;
  const tokens: Record<Speaker, string | undefined> = {
    alex: process.env.SEED_TOKEN_ALEX,
    linda: process.env.SEED_TOKEN_LINDA,
  };
  const missing = Object.entries(tokens)
    .filter(([, v]) => !v)
    .map(([k]) => `SEED_TOKEN_${k.toUpperCase()}`);
  if (!channel) missing.push("SEED_CHANNEL_ID or SLACK_CHANNEL_ID");
  if (missing.length) {
    console.error(`Missing in .env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const clients: Record<Speaker, WebClient> = {
    alex: new WebClient(tokens.alex),
    linda: new WebClient(tokens.linda),
  };

  const selected = args.length
    ? THREADS.filter((t) => args.some((a) => t.key.includes(a)))
    : THREADS;
  if (!selected.length) {
    console.error(
      `No thread matches ${args.join(", ")}. Use --list to see keys.`
    );
    process.exit(1);
  }

  console.log(`Posting ${selected.length} thread(s) to ${channel}...\n`);

  for (const thread of selected) {
    const [[rootSpeaker, rootText], ...replies] = thread.messages;
    const root = await clients[rootSpeaker].chat.postMessage({
      channel: channel!,
      text: rootText,
    });
    const threadTs = root.ts!;
    // chat.postMessage allows ~1 message/second per channel
    await sleep(1100);

    for (const [speaker, text] of replies) {
      await clients[speaker].chat.postMessage({
        channel: channel!,
        text,
        thread_ts: threadTs,
      });
      await sleep(1100);
    }
    console.log(
      `✓ ${thread.key} (${replies.length} replies), expect: ${thread.expect}`
    );
  }

  console.log(
    "\nDone. Now run:  curl -X POST localhost:3000/api/workspaces/<workspaceId>/analyze"
  );
}

main().catch((err) => {
  console.error("Seeding failed:", err?.data?.error || err.message);
  process.exit(1);
});
