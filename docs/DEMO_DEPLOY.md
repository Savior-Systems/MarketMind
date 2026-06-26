# MarketMind Live Demo Deployment Guide 🖥️

This guide provides step-by-step instructions for deploying a public live demo of MarketMind to cloud hosting providers like Railway or Render using their free/starter tiers.

---

## Option 1: Deploying on Railway (Recommended)

Railway automatically detects the `Dockerfile` inside the repository and builds it as a standard container.

### Step-by-Step Instructions

1. **Sign In**: Go to [railway.app](https://railway.app) and sign in using your GitHub account.
2. **Create Project**: Click **New Project** in the upper right.
3. **Select Source**: Choose **Deploy from GitHub repo**.
4. **Choose Repository**: Select your repository (e.g., `Savior-Systems/MarketMind`).
5. **Autodetect Settings**: Railway will automatically discover the project Dockerfiles. For the backend web API, ensure the build source points to `./backend/Dockerfile` and the port is set to `8000`.
6. **Configure Environment Variables**: Add the required parameters by clicking **Variables** on your service card. Copy these values from the project `.env.example`:
   * `DATABASE_URL`: Set up a Railway PostgreSQL provisioned database and link it (e.g., `${{Postgres.DATABASE_URL}}` or raw connection string).
   * `REDIS_URL`: Set up a Railway Redis database and link it (e.g., `${{Redis.REDIS_URL}}`).
   * `SECRET_KEY`: Set a secure random string for JWT hashing.
   * `OPENAI_API_KEY`: Your OpenAI API access credentials.
   * `GITHUB_TOKEN` / `GITHUB_REPO`: Needed for star checking metrics.
   * `DISCORD_TOKEN`: Discord Bot Token.
7. **Deploy**: Click **Deploy**! Once completed, Railway generates a default public domain (e.g., `https://marketmind.up.railway.app`).
8. **Custom Domain (Optional)**: In the project settings panel under **Domains**, add your custom domain (e.g., `demo.marketmind.ai`) and map the CNAME record in your DNS registrar.

---

## Option 2: Deploying on Render (Fallback)

If you prefer Render, follow these steps to run the service as a Web Service.

### Step-by-Step Instructions

1. **Create Account**: Go to [render.com](https://render.com) and log in with GitHub.
2. **New Web Service**: Click **New +** → **Web Service**.
3. **Connect Repository**: Select the connected `Savior-Systems/MarketMind` repository.
4. **Build Configurations**:
   * **Language**: `Docker`
   * **Docker Build Context**: `backend` (if deploying backend API)
   * **Dockerfile Path**: `Dockerfile`
5. **Environment Setup**: Add environment variables from `.env.example` in the Render dashboard:
   * `DATABASE_URL`: Add external database URI.
   * `REDIS_URL`: Add external Redis instance URI.
   * `SECRET_KEY`: Secure secret key.
   * `OPENAI_API_KEY`: API token.
6. **Billing Plan**: Select the **Free** tier (or **Hobby** depending on resource requirements).
7. **Deploy**: Render will queue a build and deploy the container. It will assign a public URL like `https://marketmind-backend.onrender.com`.
8. **Frontend Deploy**: Repeat the same for the Next.js frontend, pointing the build context to `frontend`, or deploy the frontend to Vercel/Netlify for optimal speed and reliability.
