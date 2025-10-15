import re

RESOLVED_KEYWORDS = [
    r'\b(thanks|thank you|resolved|got it|fixed|done|all good|works now|appreciate it)\b',
    r'✅',
]

def is_resolved(thread_messages):
    last_msg = thread_messages[-1]['text'].lower()
    for pattern in RESOLVED_KEYWORDS:
        if re.search(pattern, last_msg):
            return True
    return False
