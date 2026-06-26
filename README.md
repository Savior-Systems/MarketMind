# MarketMind

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Built By One. Owned By Everyone.](https://img.shields.io/badge/Narrative-Built%20By%20One.%20Owned%20By%20Everyone.-blueviolet)](MARKETMIND_STRATEGY.md)

MarketMind is an open-source, self-hostable AI-powered marketing automation platform. It empowers solo developers, small businesses, and content creators to replace expensive, proprietary marketing stacks (like Buffer, Hootsuite, Jasper, and Canva) with a single, free tool.

By utilizing swarms of autonomous AI agents, MarketMind creates, schedules, and analyzes social media campaigns across multiple channels, running either locally (via local LLMs like Ollama) or through API cloud models.

---

## Key Features

1.  **AI Content Swarms**: Automatically crafts platform-optimized copy for Twitter/X, LinkedIn, Instagram, and Facebook using context-aware brand voice profiles.
2.  **Optimal Scheduler Agent**: Evaluates posting historical windows and dynamically coordinates Celery task queues for maximum platform engagement.
3.  **Analytics & Insights**: Generates automated summaries, checks campaign consistency scores, and outputs performance recommendations.
4.  **Cost Transparency & Control**: Includes a live tracker to monitor API expenditures and calculate monthly SaaS cost savings. Includes full support for local LLMs for a $0 operational cost.

---

## Quick Start (60-Second Deploy)

### Prerequisites
*   [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
*   [Node.js](https://nodejs.org/) & npm (optional, for local frontend building)

### 1. Clone and Configure
```bash
git clone https://github.com/Savior-Systems/MarketMind.git
cd MarketMind
cp backend/.env.example backend/.env
```

### 2. Boot Local Services
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Run Backend Migrations & Tests
```bash
make migrate
make test
```

---

## Contributing

We welcome contributions from the community! Check out our guidelines to get started. By contributing, you agree that your work will be licensed under the MIT License.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

*Built By One. Owned By Everyone.*
