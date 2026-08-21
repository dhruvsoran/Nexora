# ProjectFlow — Project Management SaaS

A production-ready team collaboration platform (Jira + Trello + Slack lite) built on the MERN stack.

## Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite, Zustand, TanStack Query, dnd-kit, Socket.IO client
- **Backend:** Node.js, Express, TypeScript, Mongoose, Socket.IO, ioredis, Zod
- **Database:** MongoDB (Atlas)
- **Cache / presence / tokens:** Redis (cloud, e.g. Upstash / Redis Cloud)
- **Storage:** Cloudinary (image/file attachments)
- **AI:** Google Gemini API (task summaries, story-point estimates, label suggestions)
- **Voice AI:** Agora Conversational AI Engine (real-time voice assistant: ASR + LLM + TTS in managed mode)
- **Auth:** JWT access token + rotating refresh tokens (httpOnly cookie), bcrypt hashing

## Repo layout

```
projectflow/
├── server/   # Express + Socket.IO API
└── client/   # React SPA
```

## Features

- Auth: register / login / refresh / logout (refresh-token rotation, redis blacklist)
- Workspaces, projects (boards), invitations (role-based: owner/admin/member)
- Kanban boards with drag & drop (columns, ordering, labels, priorities, due dates, assignees)
- Task detail drawer with comments, attachments (Cloudinary), activity
- Real-time chat: workspace channels + direct messages, typing indicators, online presence
- Dashboard: burndown, workload, task stats, activity feed
- AI (Gemini): summarize board/task, estimate story points, suggest labels
- Voice AI (Agora): one-click "Talk to Nexora AI" voice assistant from any workspace — Agora manages the ASR/LLM/TTS pipeline
- Notifications (in-app), global search, rate limiting, helmet security headers


> **Agora voice AI:** the Conversational AI Engine must be enabled for your Agora project
> (it's on by default for new projects). The app uses **managed mode** for ASR (Deepgram),
> LLM (OpenAI), and TTS (MiniMax), so no extra provider API keys are needed. The voice
> agent config lives in `server/src/services/agora.ts`.

## Scripts

- `server`: `npm run dev`, `npm run build`, `npm run start`, `npm run typecheck`
- `client`: `npm run dev`, `npm run build`, `npm run preview`, `npm run typecheck`
