from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from config import SLACK_BOT_TOKEN

client = WebClient(token=SLACK_BOT_TOKEN)

def get_thread_roots(channel_id):
    try:
        response = client.conversations_history(channel=channel_id, limit=100)
        return [msg for msg in response['messages'] if msg.get('reply_count', 0) > 0]
    except SlackApiError as e:
        print(f"Error fetching conversation history: {e}")
        return []

def get_thread_messages(channel_id, thread_ts):
    try:
        response = client.conversations_replies(channel=channel_id, ts=thread_ts)
        return response['messages']
    except SlackApiError as e:
        print(f"Error fetching thread: {e}")
        return []

def add_checkmark(channel_id, ts):
    try:
        client.reactions_add(channel=channel_id, name='white_check_mark', timestamp=ts)
    except SlackApiError as e:
        if e.response['error'] == 'already_reacted':
            pass  # ignore if already marked
        else:
            print(f"Error adding reaction: {e}")
