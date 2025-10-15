import { WebClient, ErrorCode } from '@slack/web-api';
import { appConfig } from '../utils/config';

interface ThreadMessage {
  ts: string;
  thread_ts?: string;
  reply_count?: number;
  text: string;
  user: string;
}

class SlackClient {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(appConfig.slackBotToken);
  }

  async getThreadRoots(channelId: string): Promise<ThreadMessage[]> {
    try {
      const response = await this.client.conversations.history({
        channel: channelId,
        limit: 100,
      });

      if (!response.ok || !response.messages) {
        throw new Error('Failed to fetch conversation history');
      }

      return response.messages
        .filter((msg): msg is ThreadMessage => {
          return (msg.reply_count ?? 0) > 0;
        });

    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  async getThreadMessages(channelId: string, threadTs: string): Promise<ThreadMessage[]> {
    try {
      const response = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
      });

      if (!response.ok || !response.messages) {
        throw new Error('Failed to fetch thread messages');
      }

      return response.messages as ThreadMessage[];

    } catch (error) {
      console.error('Error fetching thread:', error);
      return [];
    }
  }

  async addCheckmark(channelId: string, ts: string): Promise<void> {
    try {
      await this.client.reactions.add({
        channel: channelId,
        name: 'white_check_mark',
        timestamp: ts,
      });
    } catch (error: any) {
      // Handle specific Slack API errors
      if (error.code === ErrorCode.PlatformError && error.data?.error === 'already_reacted') {
        return; // Ignore if already reacted
      }
      console.error('Error adding reaction:', error);
    }
  }
}

// Export singleton instance
export const slackClient = new SlackClient();
