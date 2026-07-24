# Chat Screen

**Route**: `/chat`  
**File**: `src/frontend/src/pages/ChatPage.tsx`  
**Type**: AI conversation interface

## Purpose

The Chat Screen is the direct conversation interface with the P1 Agent. While the agent appears throughout the platform passively (cards, badges, insights), Chat is where the user can initiate a dialogue — ask questions, request analysis, seek advice, or debrief after a hard day.

## User Flow

```
User navigates to /chat
→ Conversation history loads (empty on first visit)
→ User types message → sends
→ Agent responds (750ms simulated typing indicator)
→ Conversation continues
→ Agent may surface cycle risks, proof patterns, or vision misalignments based on context
```

## Inputs

- User text messages
- Implicit context: current cycle state, trust score, today's task completion (production only)

## Outputs

- Agent text responses (rule-based in v0.1; Claude API in production)
- Potential navigation suggestions (e.g. "Go to Mid-Cycle Review")

## Agent Logic

- v0.1: hardcoded response patterns based on keyword matching
- Production: Claude API with full user context (cycle, goals, proof history, vision, habits)
- Agent persona: honest, direct, never flattering, always serving growth

## Proof Integration

Agent may reference proof history in responses: "I notice your last 3 epic completions didn't require proof — I'll be watching the next one more closely."

## Cycle Integration

Agent has awareness of current cycle week, momentum score, and risks.

## Vision Integration

Agent can surface vision misalignments: "That task doesn't seem connected to any of your declared vision areas. Is this the right priority this week?"

## Notes for Engineers

- Chat state: `useState<Message[]>` where `Message = { role: "user"|"agent", content: string, timestamp: Date }`
- Typing indicator: `useState<boolean>` set true during 750ms agent response delay
- Auto-scroll to bottom on new message: `useEffect` with `scrollIntoView`
- In production: stream Claude API responses token by token using streaming API

## Notes for Designers

- The chat should feel like a premium private conversation, not a support widget
- Agent messages should have the Sparkles icon as an avatar
- User messages should align right, agent messages align left
- No timestamps on every message — only show time on hover or date separators
- Consider "suggested prompts" for new users: "How is my cycle going?", "What should I focus on this week?"
