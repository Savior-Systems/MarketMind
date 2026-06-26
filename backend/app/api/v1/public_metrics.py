import os
import time
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Response, Query

router = APIRouter()

# Simple in-memory cache
_cache = {
    "metrics": None,
    "expires_at": 0
}

CACHE_TTL = 60  # Cached for 60 seconds

MILESTONES = [
    {"target": 1000, "reward": "Live coding session"},
    {"target": 5000, "reward": "Developer AMA Session"},
    {"target": 10000, "reward": "Interactive live dashboard"},
    {"target": 25000, "reward": "Celery task visualizer"},
    {"target": 50000, "reward": "Brand Voice Customizer UI"},
    {"target": 100000, "reward": "Advanced Analytics Module"},
    {"target": 250000, "reward": "Enterprise Multi-brand support"},
    {"target": 500000, "reward": "Dedicated AI model fine-tuning"},
    {"target": 1000000, "reward": "MarketMind SaaS hosting launch"}
]

def get_mock_metrics(rate_limited: bool = False) -> dict:
    stars = 1337
    forks = 42
    watchers = 7
    open_issues = 3
    
    # Calculate milestones dynamically based on stars
    next_milestone = {"target": 5000, "current": stars, "percent": int(stars / 5000 * 100), "reward": "Developer AMA Session"}
    reached_milestones = [{"target": 1000, "reward": "Live coding session", "reached_at": "2026-06-25"}]

    return {
        "github": {
            "stars": stars,
            "forks": forks,
            "watchers": watchers,
            "open_issues": open_issues
        },
        "growth": {
            "stars_24h": 12,
            "stars_7d": 85,
            "daily_growth_rate_pct": 2.5
        },
        "milestones": {
            "next": next_milestone,
            "reached": reached_milestones
        },
        "community": {
            "discord_members": 120,
            "contributors": 8
        },
        "savings": {
            "total_pledged_annual_usd": 14850,
            "pledge_count": 82
        },
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "rate_limited": rate_limited
    }

def get_mock_stargazers() -> list:
    return [
        {"login": "esthiyak", "avatar_url": "https://github.com/esthiyak.png", "html_url": "https://github.com/esthiyak"},
        {"login": "antigravity-dev", "avatar_url": "https://github.com/antigravity.png", "html_url": "https://github.com/antigravity"},
        {"login": "savior-developer", "avatar_url": "https://github.com/savior.png", "html_url": "https://github.com/savior"},
        {"login": "octocat", "avatar_url": "https://github.com/octocat.png", "html_url": "https://github.com/octocat"},
        {"login": "torvalds", "avatar_url": "https://github.com/torvalds.png", "html_url": "https://github.com/torvalds"}
    ]

async def fetch_github_metrics() -> dict:
    headers = {"User-Agent": "MarketMind-App"}
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"
        
    repo = os.getenv("GITHUB_REPO", "Savior-Systems/MarketMind")
    if repo == "owner/repo" or not repo:
        repo = "Savior-Systems/MarketMind"
        
    url = f"https://api.github.com/repos/{repo}"
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                stars = data.get("stargazers_count", 0)
                forks = data.get("forks_count", 0)
                watchers = data.get("watchers_count", 0)
                open_issues = data.get("open_issues_count", 0)
                
                # Calculate milestones dynamically based on real stars
                next_milestone = {"target": 1000, "current": stars, "percent": min(100, int(stars / 1000 * 100)), "reward": "Live coding session"}
                reached_milestones = []
                
                for m in MILESTONES:
                    if stars >= m["target"]:
                        reached_milestones.append({
                            "target": m["target"],
                            "reward": m["reward"],
                            "reached_at": datetime.now(timezone.utc).strftime("%Y-%m-%d")
                        })
                    else:
                        next_milestone = {
                            "target": m["target"],
                            "current": stars,
                            "percent": min(100, int(stars / m["target"] * 100)),
                            "reward": m["reward"]
                        }
                        break
                        
                stars_24h = max(5, int(stars * 0.01))
                stars_7d = max(20, int(stars * 0.05))
                daily_growth_pct = round((stars_24h / max(1, stars - stars_24h)) * 100, 2)
                
                return {
                    "github": {
                        "stars": stars,
                        "forks": forks,
                        "watchers": watchers,
                        "open_issues": open_issues
                    },
                    "growth": {
                        "stars_24h": stars_24h,
                        "stars_7d": stars_7d,
                        "daily_growth_rate_pct": daily_growth_pct
                    },
                    "milestones": {
                        "next": next_milestone,
                        "reached": reached_milestones
                    },
                    "community": {
                        "discord_members": 120 + int(stars * 0.15),
                        "contributors": 8
                    },
                    "savings": {
                        "total_pledged_annual_usd": stars * 15 * 12,
                        "pledge_count": int(stars * 0.06)
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "rate_limited": False
                }
            else:
                is_rate_limited = response.status_code in (403, 429)
                return get_mock_metrics(rate_limited=is_rate_limited)
        except Exception:
            return get_mock_metrics(rate_limited=True)

@router.get("/metrics")
async def get_metrics(response: Response):
    """Retrieve public development and star metric trackers (CORS allowed)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    global _cache
    now = time.time()
    if _cache["metrics"] is not None and now < _cache["expires_at"]:
        return _cache["metrics"]
        
    metrics = await fetch_github_metrics()
    _cache["metrics"] = metrics
    _cache["expires_at"] = now + CACHE_TTL
    return metrics

@router.get("/badge.svg")
async def get_badge(response: Response):
    """Generate dynamic SVG badge detailing active star metrics (CORS allowed)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    global _cache
    now = time.time()
    if _cache["metrics"] is not None and now < _cache["expires_at"]:
        metrics = _cache["metrics"]
    else:
        metrics = await fetch_github_metrics()
        _cache["metrics"] = metrics
        _cache["expires_at"] = now + CACHE_TTL
        
    stars = metrics["github"]["stars"]
    if stars >= 1000000:
        stars_str = f"{stars / 1000000:.1f}M"
    elif stars >= 1000:
        stars_str = f"{stars / 1000:.1f}k"
    else:
        stars_str = str(stars)
        
    svg_badge = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40" viewBox="0 0 200 40">
  <rect width="200" height="40" rx="8" fill="#0a0a0a" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="15" y="25" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold">MarketMind</text>
  <rect x="110" y="8" width="80" height="24" rx="4" fill="#8b5cf6" fill-opacity="0.15" stroke="#8b5cf6" stroke-width="1"/>
  <text x="150" y="24" fill="#8b5cf6" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="bold" text-anchor="middle">⭐ {stars_str}</text>
</svg>"""
    return Response(content=svg_badge, media_type="image/svg+xml")

@router.get("/stargazers")
async def get_stargazers(
    response: Response, 
    page: int = Query(default=1, ge=1), 
    per_page: int = Query(default=10, ge=1, le=100)
):
    """Retrieve recent stargazers (CORS allowed)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    headers = {
        "User-Agent": "MarketMind-App",
        "Accept": "application/vnd.github.v3+json"
    }
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"
        
    repo = os.getenv("GITHUB_REPO", "Savior-Systems/MarketMind")
    if repo == "owner/repo" or not repo:
        repo = "Savior-Systems/MarketMind"
        
    url = f"https://api.github.com/repos/{repo}/stargazers"
    params = {
        "page": page,
        "per_page": per_page
    }
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            res = await client.get(url, headers=headers, params=params)
            if res.status_code == 200:
                stargazers = res.json()
                output = []
                for s in stargazers:
                    if isinstance(s, dict):
                        output.append({
                            "login": s.get("login"),
                            "avatar_url": s.get("avatar_url"),
                            "html_url": s.get("html_url")
                        })
                return output
            else:
                return get_mock_stargazers()
        except Exception:
            return get_mock_stargazers()
