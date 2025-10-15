from slack_client import get_thread_roots, get_thread_messages, add_checkmark
from resolver import is_resolved
from config import CHANNEL_ID

def run_resolution_bot():
    print("Checking unresolved threads...")
    threads = get_thread_roots(CHANNEL_ID)
    for thread in threads:
        thread_ts = thread['ts']
        thread_messages = get_thread_messages(CHANNEL_ID, thread_ts)
        if is_resolved(thread_messages):
            print(f"Resolved: {thread_ts}")
            add_checkmark(CHANNEL_ID, thread_ts)
        else:
            print(f"Still open: {thread_ts}")

if __name__ == "__main__":
    run_resolution_bot()
