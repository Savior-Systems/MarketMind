# MarketMind Deployment Guide

This guide details deployment options for productionizing your self-hosted MarketMind instance.

---

## 1. Local Docker Compose (30 Seconds)

### Prerequisites
*   Docker and Docker Compose installed.
*   Port 3000 (frontend) and Port 8000 (backend) available.

### Setup Instructions
1.  Clone the repository:
    ```bash
    git clone https://github.com/Savior-Systems/MarketMind.git
    cd MarketMind
    ```
2.  Launch the start helper script:
    ```bash
    ./scripts/start.sh
    ```
3.  Access the frontend dashboard at `http://localhost:3000`.

---

## 2. Railway (2 Minutes)

Railway provides seamless Docker Compose and Dockerfile rendering directly from GitHub.

### Setup Instructions
1.  Log in to [Railway](https://railway.app/).
2.  Click **New Project** -> **Deploy from GitHub repo**.
3.  Select `Savior-Systems/MarketMind`.
4.  Railway will automatically detect `railway.toml` and prompt you to input environment variables from `.env.example`.
5.  Click **Deploy**.

---

## 3. Render (3 Minutes)

Render reads the `render.yaml` Blueprint file to orchestrate web services, Postgres, and Redis automatically.

### Setup Instructions
1.  Connect your GitHub account to [Render](https://render.com/).
2.  Click **New** -> **Blueprint**.
3.  Select the `MarketMind` repository.
4.  Render will parse `render.yaml` and configure the database, redis cache, backend API service, and Next.js frontend.
5.  Set your API environment keys and hit **Apply**.

---

## 4. Fly.io (5 Minutes)

Deploy the services to micro-VMs using the Fly CLI.

### Setup Instructions
1.  Install `flyctl` and run `fly auth login`.
2.  Initialize the app from the root directory:
    ```bash
    fly launch --no-deploy
    ```
3.  Deploy backend and frontend services:
    ```bash
    fly deploy
    ```

---

## 5. Manual VPS (10 Minutes - Ubuntu)

Setting up on a raw cloud provider machine (DigitalOcean, Hetzner, AWS EC2).

### Prerequisites
*   A clean Ubuntu 22.04 LTS instance.
*   Root or sudo user access.

### Setup Instructions
1.  Install Docker:
    ```bash
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo systemctl enable --now docker
    ```
2.  Clone and build:
    ```bash
    git clone https://github.com/Savior-Systems/MarketMind.git
    cd MarketMind
    cp .env.example .env
    # Edit API keys in .env
    nano .env
    # Deploy
    sudo docker-compose up -d --build
    ```

---

## See Also

- [📖 README](../README.md) — Project overview
- [📚 Documentation Hub](INDEX.md) — All docs
