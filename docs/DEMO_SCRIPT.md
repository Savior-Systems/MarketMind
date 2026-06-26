# MarketMind Demo Recording Script & Storyboard

This script provides step-by-step instructions for recording the 720p, 30fps demo video or GIF (`docs/assets/demo.gif`) showcasing the core capabilities of MarketMind.

---

## 🛠️ Recording Setup

*   **Resolution**: 1280x720 (720p) or 1920x1080 (1080p scaled down to 720p).
*   **Frame Rate**: 30fps.
*   **Recording Tools**: [OBS Studio](https://obsproject.com/) (recommended) or [ScreenToGif](https://www.screentogif.com/) (Windows).
*   **Browser Size**: Fixed browser window (maximize or use 1280x720 viewport window).
*   **Environment**: Ensure the FastAPI backend (`http://localhost:8000`) and Next.js frontend (`http://localhost:3000`) are running locally. Set up a mock user or login session so no authentication hiccups occur during recording.

---

## 🎬 Storyboard & Scenes

| Scene | Duration | Action | Visual Target |
| :--- | :--- | :--- | :--- |
| **Scene 1** | **5 seconds** | **Showcase Dashboard Landing**<br>Hover over stats cards (Generated Posts, Scheduled, Channels), and highlight the recent activity table to demonstrate the UI feel. | `http://localhost:3000/` (Dashboard) |
| **Scene 2** | **10 seconds** | **Create Brand Profile**<br>Navigate to Settings. Type a name (e.g., "MarketMind AI") and paste a mock brand voice description. Hit **Save Brand Profile** and show the confirmation toast. | `http://localhost:3000/settings` (Settings) |
| **Scene 3** | **15 seconds** | **Generate Twitter/LinkedIn Swarm Content**<br>Navigate to Generate. Select Twitter/X and LinkedIn. Enter a topic (e.g., "Launching MarketMind Day -10 updates: production docker compose and one-click cloud configs!"). Choose "Professional" tone. Click **Generate Content Swarm**. Wait for the skeleton loader to resolve into cards showing generated variations. | `http://localhost:3000/content/generate` (Generate) |
| **Scene 4** | **10 seconds** | **View Calendar with Scheduled Posts**<br>Navigate to Calendar. Show the monthly calendar view populated with the newly generated posts distributed at optimal conversion times. Hover over a calendar slot to show the post details tooltip. | `http://localhost:3000/calendar` (Calendar) |
| **Scene 5** | **10 seconds** | **Run Analytics Swarm Report**<br>Navigate to Analytics. Select your brand profile, choose "7d" date range, and click **Analyze Performance**. Wait 2 seconds for the report showing post breakdowns, conversion metrics, and recommendations. | `http://localhost:3000/analytics` (Analytics) |
| **Scene 6** | **5 seconds** | **Show Landing Page & Counter**<br>Transition to the public landing page showing the Million Star Challenge progress bar, glowing milestones, and interactive savings calculator. | `docs/index.html` or `http://localhost:8080/` (Landing) |

---

## 💾 Output Formatting

1. Record using OBS Studio as an `.mp4` file.
2. Edit to trim unnecessary load times or delays (compress the total runtime to exactly 30-40 seconds).
3. Convert to GIF format using `ffmpeg` or an online converter:
   ```bash
   ffmpeg -i demo.mp4 -vf "fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" docs/assets/demo.gif
   ```
4. Save the optimized GIF at `docs/assets/demo.gif`.
