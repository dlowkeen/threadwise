# Threadwise

Threadwise is an app you can self-host to serve as your helpful coworker who proactively takes initiative on long slack threads. It helps summarize long threads so you don't have to, pulls out action items, detects unresolved conversations, and gently follows up with folks in the thread when a resolution has not been met.

## Getting Started

1. You need to have a slack bot created with access to read, write messages.
2. Need an OpenAI API Key.
TO-DO: Add more steps

## Overview of Main Objectives

1. Slack Thread Summarizer / Resolution Detector
What it does:
Watches long Slack threads in real-time.
Summarizes the discussion (key points, decisions made, blockers).
Detects whether the thread ended with consensus or unresolved issues.
Optionally, posts a “TL;DR” summary at the end or sends a daily digest of unresolved threads.

Agent angle:
One agent can gather messages, another can generate the summary, a third can classify resolution status.

2. Action Item Extractor
What it does:
Pulls out tasks, owners, and deadlines mentioned in threads.
Creates a mini “to-do list” for each thread.
Could integrate with Jira, Notion, or Google Tasks.

3. Thread Sentiment / Conflict Detector
What it does:
Flags threads where the discussion is getting heated or negative.
Could help managers intervene early.
Also flags threads that ended unresolved, suggesting a follow-up.

4. Auto Follow-Up Reminder Agent
What it does:
Detects threads where questions were asked but not answered.
Sends a gentle Slack reminder to the relevant person.
Tracks which threads still need attention.
