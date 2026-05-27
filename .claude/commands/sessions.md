Read all session files from ~/.claude/projects/-workspaces-yarden-damri/*.jsonl (ignore the current session file). For each session, extract the date and the first user message. Display them as a numbered list like this:

1. [date] — [first message summary, max 10 words]
2. [date] — [first message summary, max 10 words]
...

Then ask: "Which one do you want to continue? (type the number)"

When the user replies with a number, read that full session file, summarize what was done, and continue the conversation from where it left off.
