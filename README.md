# 🤖 AgentForge — Multi-Agent Code Assurance Platform

**Team:** Z-Vibers | **College:** BVRIT | **Hackathon:** InnovateZ 2026

[![Demo](https://img.shields.io/badge/Demo-Live-green)](https://8999ed55-a035-4b2f-a7b1-f6fff8f658f3-00-2mxdnlfutfpkh.sisko.replit.dev/)
[![Video](https://img.shields.io/badge/Video-YouTube-red)](https://youtube.com/watch?v=YOUR_VIDEO_ID)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

> *"Copilot writes code. AgentForge guarantees it's production-ready."*

---

## 🎯 The Problem

AI coding assistants (Copilot, Cursor) generate code that **passes tests but fails in production**:

- 🔴 Security vulnerabilities (hardcoded secrets, SQL injection)
- 🔴 Performance bottlenecks (O(n²) loops, inefficient queries)
- 🔴 Architectural debt (no tests, missing docs)

**No tool reviews AI-generated code BEFORE commit.**

---

## 💡 The Solution

**AgentForge** deploys **6 specialized AI agents** that collaborate and compete to review code like a senior engineering team:

| Agent | Role | Personality | Weight |
|-------|------|-------------|--------|
| 🏗️ **Architect** | Designs API contracts | "The Visionary" | 0.8x |
| 👨💻 **Coder** | Writes implementation | "The Builder" | 0.5x |
| 🛡️ **Security** | Hunts vulnerabilities | "The Paranoid" | **1.5x (VETO)** |
| ⚡ **Performance** | Benchmarks & optimizes | "The Speed Demon" | 1.2x |
| 🔍 **Reviewer** | Checks style & tests | "The Perfectionist" | 1.0x |
| 😈 **Devil's Advocate** | Challenges everything | "The Skeptic" | 1.0x |

**Consensus Engine:** Weighted voting with Security veto power. Threshold: 70/100.

---

## 🚀 Quick Start

### Option A: Cloud (API Keys Required)
```bash
git clone https://github.com/jahwanthpulugujju-create/agentforge.git
cd agentforge
cp .env.example .env
# Add ANTHROPIC_API_KEY or GEMINI_API_KEY
docker-compose up --build
```

### Option B: Local — Zero API Cost 🔥
```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull models (~5 min)
ollama pull llama3:8b
ollama pull codellama:7b

# 3. Run locally
echo "USE_LOCAL_MODELS=true" >> .env
docker-compose up --build
```

**War Room UI:** http://localhost:5173

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, CrewAI, Socket.IO |
| **AI Models** | Anthropic Claude, Google Gemini, Ollama (local) |
| **Frontend** | React 18, Tailwind CSS, Framer Motion |
| **Sandbox** | Docker (isolated execution) |
| **Database** | SQLite |
| **Deployment** | Docker Compose |

---

## 🎬 Demo

### Live Demo
🔗 [Click here to try AgentForge](https://8999ed55-a035-4b2f-a7b1-f6fff8f658f3-00-2mxdnlfutfpkh.sisko.replit.dev/)

### Video Walkthrough
📹 [Watch 3-minute demo on YouTube](https://youtube.com/watch?v=YOUR_VIDEO_ID)

---

## 📸 Screenshots

### War Room Dashboard
![War Room](screenshots/war-room.png)

### Agent Consensus Voting
![Consensus](screenshots/consensus.png)

### Live Log Terminal
![Logs](screenshots/logs.png)

---

## 🏗️ Architecture

```
[User Request] → [Orchestrator Router] → [Redis State]
                      ↓
    ┌────────┬────────┬────────┬────────┬────────┬────────┐
    │Architect│ Coder │Security│Performance│Reviewer│Devil's │
    └────┬───┴───┬────┴───┬────┴────┬─────┴───┬────┴────┬───┘
         └───────┴────────┴─────────┴─────────┴─────────┘
                              ↓
                    [Consensus Engine]
                              ↓
                    [Docker Sandbox]
                              ↓
                    [GitHub PR + React UI]
```

---

## 📊 Competitive Analysis

| Tool | What It Does | Gap | AgentForge Wins |
|------|-------------|-----|-----------------|
| **GitHub Copilot** | Inline suggestions | No review, no security | 6-agent adversarial review |
| **Cursor** | Chat in IDE | Single assistant | Multi-perspective debate |
| **SonarQube** | Static analysis | Post-commit only | Pre-commit assurance |
| **CodeWhisperer** | AWS security scans | No debate, no architecture | Full team simulation |

---

## 👥 Team

| Name | Role | GitHub |
|------|------|--------|
| Jahwanth Pulugujju | Full-Stack Developer | [@jahwanthpulugujju-create](https://github.com/jahwanthpulugujju-create) |
| [Teammate 1] | AI/ML Engineer | [@teammate1](https://github.com/) |
| [Teammate 2] | Frontend Developer | [@teammate2](https://github.com/) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with 💻, ☕, and 6 very opinionated AI agents.**
