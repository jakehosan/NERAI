![NERAI-Banner](https://i.imgur.com/fBy5QWf.png)

## ⚪ Welcome to NERAI AI

<br>

**NERAI** is a fully autonomous AI agent, built from the ground up in TypeScript for its robust type safety and modern developer tooling. Designed to run independently with minimal human input, it can post updates, follow and engage in conversations, respond to mentions, and even handle small-scale Solana transactions.

What sets NERAI apart is its goal: to make automated accounts not just reactive, but genuinely participatory—capable of integrating into real online communities in a meaningful way. While Twitter is the first target platform, the system is designed to scale across multiple social channels in the future.

<br>

<table>
<tr>
  <td align="center" width="200px" style="width:200px;">
    <a href="https://twitter.com/neraixyz" title="Our Twitter">
      <img src="https://img.shields.io/" alt="Twitter" />
    </a><br>
    <small>Our Twitter</small>
  </td>
  <td align="center" width="200px" style="width:200px;">
    <a href="(https://www.nerai.xyz" title="Our Website">
      <img src="https://img.shields.io/badge/Website-Visit%20Us-blue?style=flat-square&logo=internet-explorer" alt="Website" />
    </a><br>
    <small>Our Website</small>
  </td>
  <td align="center" width="200px" style="width:200px;">
    <a href="https://docs.nerai.xyz/" title="Documentation">
      <img src="https://img.shields.io/badge/Docs-Read%20Here-green?style=flat-square&logo=read-the-docs" alt="Docs" />
    </a><br>
    <small>Documentation</small>
  </td>
</tr>
</table>


<br>

> **Star NERAI Repositories** ⭐️
> Get instant notifications for new releases and updates. Your support helps us scale and improve NERAI!

<br>

## Overview

**NERAI** is an autonomous AI system written entirely in **TypeScript**, built to run social accounts without human intervention. It doesn’t just schedule posts — it actively participates in conversations, follows trends, interacts with users, and moves tokens on-chain when the moment calls for it.


At launch, it's wired into Twitter and plugged into Solana, but both the social and blockchain layers are designed to be swappable. Whether it’s replying to a meme thread or tipping someone a few $NERAI tokens, NERAI runs the full loop on its own.


Some things the AI agent can already do:

- Posts original tweets using prompt logic and LLMs (Claude)  
- Monitors mentions, DMs, and trending hashtags 
- Replies to users with contextual awareness  
- Tracks conversations it’s involved in  
- Sends out small crypto tips via its own Solana wallet  
- Keeps keys encrypted and isolated at runtime  
- Logs on-chain actions with traceable history  

The architecture is intentionally modular — supporting multiple models, prompt styles, token standards, and platforms. The goal isn’t just one clever bot; it’s a framework for running persistent, intelligent agents in public.

> NERAI ships alongside the $NERAI token on **Solana**, but is built with multi-chain, multi-platform expansion in mind.


---

<h2>Architecture Diagram</h2>


<div style="width: 100%; display: flex; justify-content: center; align-items: center; flex-direction: column;">
  <img src="https://i.imgur.com/XUI7wyc.png" alt="Architecture Diagram" style="width: 100%;">
  <br><br>
  <p><em>This diagram illustrates the data flow between the API gateway, microservices, and the database layer.</em></p>
</div>


---

## Features

- **Modern TypeScript Backend**  
  Built with async-first patterns, strong typing, and full access to the npm ecosystem. Clean, predictable, and production-ready.

- **LLM-Powered Messaging**  
  Integrates Claude for generating posts, replies, and threads — with support for memory-like context handling and custom prompt logic.

- **Encrypted Key Handling**  
  - Secrets are loaded via environment variables  
  - Private keys are never written to disk or exposed  
  - Lightweight encryption and scoped runtime access  

- **Reactive, Event-Based Flow**  
  - Monitors Twitter activity at regular intervals  
  - Routes events through a decision engine with memory  
  - Handles retries, backoff, and rate limits gracefully  

- **Built-in Safety & Moderation**  
  - Filters for prompt safety and language boundaries  
  - Spam-avoidance logic for reply control  
  - Logs actions for traceability and debugging


---

## Project Structure

```
src/
├── index.ts              # Main application entry point
├── services/            # Core services
│   ├── TwitterApi.ts    # Twitter API integration
│   ├── LLMClient.ts     # Claude API integration
│   └── WalletManager.ts # Ethereum wallet management
└── types/              # TypeScript type definitions
    └── index.ts        # Shared types and interfaces
```

## Setup

### Requirements

- Node.js v16+  
- Twitter Developer credentials  
- Claude API key  
- Ethereum-compatible RPC endpoint  
- Optional: Existing wallet private key

### Configuration

Create a `.env` file with the following:

```
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=

CLAUDE_API_KEY=

WALLET_PRIVATE_KEY=
ETH_RPC_URL=
```

---

## Contribution

We're actively developing this project and open to contributions. If you're interested in helping with platform expansion, better language strategies, or UI tooling, feel free to open an issue or PR. See [CONTRIBUTING.MD](CONTRIBUTING.md) for guidelines.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for more details.
