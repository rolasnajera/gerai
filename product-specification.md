# GERAI

## Overview

A desktop application that simulates a multi‑provider ChatGPT‑like chat interface, integrating multiple AI models (OpenAI, Grok, Gemini, Claude). The product focuses on:

* Clean chat interface
* Multi‑model selection
* Persistent conversation history
* API orchestration layer
* Basic settings panel

## Core Features

### Chat Interface

A simple, elegant interface where the user writes messages and receives responses.
* Input box with multiline support
* Markdown rendering for AI responses
* Loading indicator when the model is thinking

### Model Selector

Drop‑down or side panel to switch among:
* OpenAI (GPT‑4.1 / 5‑series)
* xAI Grok
* Google Gemini
* Anthropic Claude

### Chat History

Local or cloud‑stored chat history:
* Save chats
* Rename chats
* Delete chats
* Restore previous sessions

### API Integration Layer

Backend layer for model routing.
* Normalises input/output across APIs
* Manages API keys securely
* Provides abstraction so UI is model‑agnostic

### Settings Panel
Basic user options:
* API key management
* Model temperature
* Max tokens
* Conversation persistence on/off
* Theme: Light/Dark

## Architecture (Draft)

### Frontend
* Electron
* React
* Tailwind
* Vite

### Backend
* Node.js
* API routing service
* Model unification layer
* Optional: WebSockets for streaming

### Persistence Layer
* SQLite

## API Details Needed
Each provider requires:
* API key
* Base URL
* Model identifiers
* Temperature control
* Optional streaming endpoints

## Finalized Decisions for MVP

1. Architecture will be BYOK (Bring Your Own Key).
2. MVP will integrate only OpenAI API initially.
3. UI: ChatGPT minimalism.
4. Persistence: SQLite for MVP
5. Tech stack: Electron + React + Tailwind + Vite + Node.js
6. Authentication: 100% anonymous mode. No user accounts.
7. Conversations: Each chat includes a configurable system prompt.
8. Data model updated:
    * conversations(id, title, system_prompt, model, created_at)
    * messages(id, conversation_id, role, content, created_at)


    