CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workspaces (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,
  slack_team_id   TEXT NOT NULL UNIQUE,
  slack_team_name TEXT NOT NULL,
  slack_bot_token VARCHAR NOT NULL,
  thread_threshold INTEGER NOT NULL DEFAULT 2,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_channel_id  TEXT NOT NULL,
  slack_channel_name TEXT NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slack_channel_id)
);

CREATE TABLE IF NOT EXISTS jira (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  base_url     TEXT NOT NULL,
  email        TEXT NOT NULL,
  api_token    TEXT NOT NULL,
  project_key  TEXT NOT NULL,
  board_id     INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspaces indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_slack_team_id ON workspaces(slack_team_id);

-- Channels indexes
CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_slack_channel_id ON channels(slack_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_active ON channels(is_active);

-- Jira indexes
CREATE INDEX IF NOT EXISTS idx_jira_workspace_id ON jira(workspace_id);


COMMENT ON TABLE workspaces IS 'Stores Slack workspace information and configuration';
COMMENT ON TABLE channels IS 'Stores Slack channels associated with workspaces';
COMMENT ON TABLE jira IS 'Stores Jira configuration for each workspace (one-to-one relationship)';

COMMENT ON COLUMN workspaces.slug IS 'Human-readable identifier for the workspace (used in URLs/APIs)';
COMMENT ON COLUMN workspaces.slack_team_id IS 'Slack workspace team ID (unique identifier from Slack)';
COMMENT ON COLUMN workspaces.slack_bot_token IS 'Encrypted bot token for the workspace';
COMMENT ON COLUMN workspaces.thread_threshold IS 'Minimum number of replies required to process a thread';

COMMENT ON COLUMN channels.workspace_id IS 'Foreign key to workspaces table';
COMMENT ON COLUMN channels.slack_channel_id IS 'Slack channel ID (unique per workspace)';
COMMENT ON COLUMN channels.is_active IS 'Whether the channel is actively being monitored';

COMMENT ON COLUMN jira.workspace_id IS 'Foreign key to workspaces table (unique for one-to-one relationship)';
COMMENT ON COLUMN jira.api_token IS 'Jira API token (should be encrypted)';
