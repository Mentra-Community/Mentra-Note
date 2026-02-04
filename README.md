# SEGA - Smart Executive Glasses Assistant

[![GitHub](https://img.shields.io/badge/GitHub-isaiahb%2Fsega-blue?logo=github)](https://github.com/isaiahb/sega)

An AI-powered personal assistant for MentraOS smart glasses. SEGA adapts to any professional - from investors to doctors to sales reps - by listening to conversations, taking contextual notes, performing deep research, and sending email summaries.

## Features

- 🎯 **Adaptive to Your Role** - Customizes behavior based on your profession and priorities
- 🔍 **Deep Research** - Uses Firecrawl to research people, companies, and topics in real-time
- 📝 **Smart Notes** - Takes organized notes based on your preferences
- 📧 **Email Reports** - Sends summaries and research reports via Resend
- 🎤 **Voice-First** - Designed for hands-free operation through smart glasses
- 💻 **Web Dashboard** - Full chat interface and onboarding flow

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment file
cp env.example .env

# Add your API keys to .env:
# - PACKAGE_NAME and MENTRAOS_API_KEY from console.mentra.glass
# - GEMINI_API_KEY or ANTHROPIC_API_KEY for AI
# - FIRECRAWL_API_KEY for web research
# - RESEND_API_KEY for email reports

# Start development server
bun run dev
```

## Project Structure

```
src/
├── index.ts                      # Entry point
├── backend/
│   ├── index.ts                  # SegaApp class
│   ├── api/
│   │   ├── router.ts             # API routes
│   │   └── sse.ts                # Real-time updates
│   └── services/
│       └── agent/
│           ├── ChatAgent.ts      # AI agent with tools
│           ├── index.ts
│           └── llm/              # LLM provider abstraction
└── webview/
    ├── App.tsx                   # Onboarding + Chat UI
    ├── hooks/useSSE.ts
    └── ...
```

## How It Works

### 1. Onboarding (`/onboarding`)

Users set up their profile:
- Name, role, company
- Areas of interest (AI/ML, SaaS, Fintech, etc.)
- What to listen for (team background, metrics, competition)

### 2. Voice Interaction

When wearing glasses:
- SEGA listens to conversations via MentraOS transcription
- Processes speech through the ChatAgent
- Displays short responses on glasses
- Sends detailed responses to webview

### 3. AI Tools

The ChatAgent has access to:

| Tool | Description |
|------|-------------|
| `search_web` | Search the web using Firecrawl |
| `scrape_url` | Get detailed content from a URL |
| `save_note` | Save a note with topic and tags |
| `get_notes` | Retrieve saved notes |
| `send_email` | Send email via Resend |
| `get_user_profile` | Get user's preferences |

## Example Use Cases

### Investor in a Pitch Meeting
```
User: "I'm meeting with the founders of Acme AI"
SEGA: *researches founders on LinkedIn, company website, Crunchbase*

User: "They mentioned 500K ARR and 30% MoM growth"
SEGA: *saves note with metrics tagged*

User: "Email me a summary"
SEGA: *sends deal memo with notes and research*
```

### Sales Rep Before a Client Call
```
User: "Research the VP of Engineering at TechCorp"
SEGA: *pulls LinkedIn, recent news, company info*
      *displays key talking points on glasses*

User: "Note: They're interested in our enterprise plan"
SEGA: *saves note for CRM follow-up*
```

### Doctor Between Appointments
```
User: "What are the latest treatment guidelines for Type 2 diabetes?"
SEGA: *searches medical literature*
      *displays summary on glasses*
```

### Journalist on Assignment  
```
User: "Background on the mayor's new housing policy"
SEGA: *researches policy details, past coverage, key stakeholders*

User: "Note: Council vote scheduled for March 15"
SEGA: *saves with deadline tag*
```

### Lawyer Preparing for Court
```
User: "Find precedents for breach of contract in California"
SEGA: *searches legal databases*
      *displays relevant cases*
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PACKAGE_NAME` | Yes | Your app's package name |
| `MENTRAOS_API_KEY` | Yes | API key from console.mentra.glass |
| `GEMINI_API_KEY` | Yes* | Google Gemini API key |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic Claude API key |
| `FIRECRAWL_API_KEY` | Recommended | For web research |
| `RESEND_API_KEY` | Recommended | For email reports |
| `RESEND_FROM_EMAIL` | Optional | Sender email (default: sega@example.com) |
| `MONGODB_URI` | Optional | For persistent storage |
| `PORT` | Optional | Server port (default: 3000) |

*At least one AI provider key is required

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/me` | GET | Current authenticated user |
| `/api/profile` | GET | Get user profile |
| `/api/profile` | POST | Update user profile |
| `/api/agent/query` | POST | Submit query to ChatAgent |
| `/api/agent/clear` | POST | Clear conversation history |
| `/api/agent/history` | GET | Get conversation history |
| `/api/events` | GET | SSE stream for real-time updates |

## Customization

### Modify the System Prompt

Edit `src/backend/services/agent/ChatAgent.ts`:

```typescript
const SYSTEM_PROMPT = `You are SEGA...
// Customize personality, guidelines, etc.
`;
```

### Add New Tools

1. Add tool definition to `TOOLS` array
2. Implement in `executeTool()` method
3. Update system prompt if needed

### Change Default Profile

Modify `DEFAULT_PROFILE` in ChatAgent.ts. The profile adapts SEGA's behavior:
- A sales rep might want prospect research and follow-up reminders
- A doctor might want medical research and patient context  
- A lawyer might want case law and precedent lookup
- A journalist might want fact-checking and source verification

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **AI**: Gemini / Claude via LLM abstraction
- **Research**: Firecrawl
- **Email**: Resend
- **Frontend**: React 19, Tailwind CSS, Framer Motion
- **Auth**: MentraOS SDK

## Development

```bash
# Start with hot reload
bun run dev

# Expose via ngrok (update URL in package.json first)
bun run ngrok
```

## Deployment

1. Deploy to Railway, Vercel, or your preferred platform
2. Set environment variables
3. Update Server URL and Webview URL in console.mentra.glass

## Resources

- [GitHub Repository](https://github.com/isaiahb/sega)
- [MentraOS Docs](https://docs.mentraglass.com)
- [Firecrawl Docs](https://docs.firecrawl.dev)
- [Resend Docs](https://resend.com/docs)
- [Google AI Studio](https://aistudio.google.com)
- [Anthropic Console](https://console.anthropic.com)

## License

MIT - Built for hackathons 🚀