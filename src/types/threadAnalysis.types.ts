export interface ThreadInfo {
  text: string;
  user: string;
  reply_count?: number;
  reply_users_count?: number;
  reply_users?: string[];
  reactions?: string;
  is_locked?: boolean;
}

export interface MessageInfo {
  user: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface EnhancedThreadContext {
  thread: ThreadInfo;
  messages: MessageInfo[];
}
export interface CategoryResponse {
  summary: string;
  status: "completed" | "in_progress" | "blocked";
  confidence: number;
}

// Approach 1
export interface FilterPrompt {
  category:
    | "technical_issue"
    | "decision_discussion"
    | "question_answer"
    | "status_update"
    | "casual_chat";
  tone: "serious" | "neutral" | "playful" | "sarcastic";
  resolution: "resolved" | "unresolved" | "not_applicable";
}

//   Approach 2
// export interface FilterPrompt {
//   category: "casual"
//   | "quick_resolution"
//   | "information_sharing"
//   | "substantive"
//   confidence: number;
//   reasoning?: string;
// };
