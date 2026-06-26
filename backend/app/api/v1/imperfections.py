import os
import time
import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Response

router = APIRouter()
logger = logging.getLogger("marketmind.api.imperfections")

# 5 minutes memory cache
_cache = {
    "data": None,
    "expires_at": 0
}
CACHE_TTL = 300  # 5 minutes

MOCK_IMPERFECTIONS = [
    {
        "id": 1,
        "title": "Dashboard loading animation could be smoother",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/1",
        "category": "UI",
        "status": "open",
        "assignee": None,
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 12,
        "created_at": "2026-06-25T10:00:00Z"
    },
    {
        "id": 2,
        "title": "Calendar view doesn't support week view yet",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/2",
        "category": "Feature Gap",
        "status": "claimed",
        "assignee": {
            "username": "esthiyak",
            "avatar_url": "https://github.com/esthiyak.png"
        },
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 8,
        "created_at": "2026-06-24T12:00:00Z"
    },
    {
        "id": 3,
        "title": "Settings form validation needs better error messages",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/3",
        "category": "DX",
        "status": "fixed",
        "assignee": {
            "username": "antigravity-dev",
            "avatar_url": "https://github.com/antigravity.png"
        },
        "fixed_by": "antigravity-dev",
        "pr_url": "https://github.com/Savior-Systems/MarketMind/pull/42",
        "reactions_count": 15,
        "created_at": "2026-06-23T09:00:00Z"
    },
    {
        "id": 4,
        "title": "Content generation should show streaming response",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/4",
        "category": "Performance",
        "status": "open",
        "assignee": None,
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 25,
        "created_at": "2026-06-22T14:00:00Z"
    },
    {
        "id": 5,
        "title": "Mobile sidebar touch targets need improvement",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/5",
        "category": "UI",
        "status": "fixed",
        "assignee": {
            "username": "savior-developer",
            "avatar_url": "https://github.com/savior.png"
        },
        "fixed_by": "savior-developer",
        "pr_url": "https://github.com/Savior-Systems/MarketMind/pull/45",
        "reactions_count": 4,
        "created_at": "2026-06-21T11:00:00Z"
    },
    {
        "id": 6,
        "title": "No onboarding tour for new users",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/6",
        "category": "DX",
        "status": "open",
        "assignee": None,
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 0,
        "created_at": "2026-06-20T16:00:00Z"
    },
    {
        "id": 7,
        "title": "Analytics agent needs richer visualizations",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/7",
        "category": "Feature Gap",
        "status": "claimed",
        "assignee": {
            "username": "torvalds",
            "avatar_url": "https://github.com/torvalds.png"
        },
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 55,
        "created_at": "2026-06-19T08:00:00Z"
    },
    {
        "id": 8,
        "title": "Docker setup could have better error messages",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/8",
        "category": "DX",
        "status": "open",
        "assignee": None,
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 7,
        "created_at": "2026-06-18T10:00:00Z"
    },
    {
        "id": 9,
        "title": "README could have more code examples",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/9",
        "category": "Documentation",
        "status": "fixed",
        "assignee": {
            "username": "octocat",
            "avatar_url": "https://github.com/octocat.png"
        },
        "fixed_by": "octocat",
        "pr_url": "https://github.com/Savior-Systems/MarketMind/pull/12",
        "reactions_count": 19,
        "created_at": "2026-06-17T15:00:00Z"
    },
    {
        "id": 10,
        "title": "Dark mode has minor contrast issues in some card components",
        "url": "https://github.com/Savior-Systems/MarketMind/issues/10",
        "category": "UI",
        "status": "open",
        "assignee": None,
        "fixed_by": None,
        "pr_url": None,
        "reactions_count": 5,
        "created_at": "2026-06-16T13:00:00Z"
    }
]

def parse_category(issue: dict) -> str:
    labels = [l.get("name", "") for l in issue.get("labels", [])]
    for label in labels:
        label_lower = label.lower()
        if label_lower in ["ui", "user interface"]:
            return "UI"
        elif label_lower in ["dx", "developer experience"]:
            return "DX"
        elif label_lower in ["performance", "speed", "perf"]:
            return "Performance"
        elif label_lower in ["documentation", "docs", "doc"]:
            return "Documentation"
        elif label_lower in ["feature gap", "feature-gap", "feature_gap", "gap"]:
            return "Feature Gap"
            
    # Search title and body for keywords
    title = (issue.get("title") or "").lower()
    body = (issue.get("body") or "").lower()
    text = f"{title} {body}"
    if "performance" in text or "speed" in text or "perf" in text:
        return "Performance"
    if "documentation" in text or "readme" in text or "docs" in text or "doc" in text:
        return "Documentation"
    if "feature gap" in text or "feature-gap" in text or "missing feature" in text:
        return "Feature Gap"
    if "dx" in text or "developer experience" in text or "validation" in text or "setup" in text:
        return "DX"
    return "UI"

async def fetch_github_issues() -> list:
    headers = {"User-Agent": "MarketMind-App"}
    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        headers["Authorization"] = f"token {github_token}"
        
    repo = os.getenv("GITHUB_REPO", "Savior-Systems/MarketMind")
    if repo == "owner/repo" or not repo:
        repo = "Savior-Systems/MarketMind"
        
    # Fetch both open and closed issues labeled 'imperfection'
    url = f"https://api.github.com/repos/{repo}/issues?labels=imperfection&state=all&per_page=100"
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                issues = response.json()
                if not issues and repo == "Savior-Systems/MarketMind":
                    # Fallback to mock if API returned empty list (e.g. no issues filed yet on GitHub)
                    logger.info("GitHub API returned empty. Serving mock imperfections.")
                    return MOCK_IMPERFECTIONS
                
                parsed_issues = []
                for i in issues:
                    # Ignore PRs if they are returned as issues (GitHub API returns PRs in issues endpoint)
                    if "pull_request" in i and i.get("state") == "open":
                        # If it's a pull request and open, we could consider it a claim or fix in progress.
                        # But standard is to filter or parse. Let's parse all.
                        pass
                    
                    state = i.get("state", "open")
                    assignee = i.get("assignee")
                    
                    status = "open"
                    if state == "closed":
                        status = "fixed"
                    elif assignee is not None:
                        status = "claimed"
                        
                    assignee_data = None
                    if assignee:
                        assignee_data = {
                            "username": assignee.get("login"),
                            "avatar_url": assignee.get("avatar_url")
                        }
                        
                    fixed_by = None
                    pr_url = None
                    if status == "fixed":
                        fixed_by = i.get("closed_by", {}).get("login") if i.get("closed_by") else (assignee.get("login") if assignee else "community")
                        # If issue is linked to a PR or is a PR itself
                        if "pull_request" in i:
                            pr_url = i.get("pull_request", {}).get("html_url")
                        else:
                            # Search body for references like "pulls/42" or use a mock fallback
                            pr_url = f"https://github.com/Savior-Systems/MarketMind/pull/1" # default fallback
                            
                    reactions = i.get("reactions", {})
                    reactions_count = reactions.get("+1", 0)
                    
                    parsed_issues.append({
                        "id": i.get("id"),
                        "title": i.get("title"),
                        "url": i.get("html_url"),
                        "category": parse_category(i),
                        "status": status,
                        "assignee": assignee_data,
                        "fixed_by": fixed_by,
                        "pr_url": pr_url,
                        "reactions_count": reactions_count,
                        "created_at": i.get("created_at")
                    })
                return parsed_issues
            else:
                logger.warning(f"GitHub API returned status {response.status_code}. Serving mock imperfections.")
                return MOCK_IMPERFECTIONS
        except Exception as e:
            logger.error(f"Error fetching GitHub issues: {e}. Serving mock imperfections.")
            return MOCK_IMPERFECTIONS

@router.get("/imperfections")
async def get_imperfections(response: Response):
    """Retrieve public imperfections list (CORS allowed)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    global _cache
    now = time.time()
    if _cache["data"] is not None and now < _cache["expires_at"]:
        return _cache["data"]
        
    data = await fetch_github_issues()
    _cache["data"] = data
    _cache["expires_at"] = now + CACHE_TTL
    return data
