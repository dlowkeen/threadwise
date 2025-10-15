import dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export interface Config {
  slackBotToken: string;
  channelId: string;
}

if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error('SLACK_BOT_TOKEN environment variable is required');
}

if (!process.env.SLACK_CHANNEL_ID) {
  throw new Error('SLACK_CHANNEL_ID environment variable is required');
}

export const appConfig: Config = {
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  channelId: process.env.SLACK_CHANNEL_ID,
};
