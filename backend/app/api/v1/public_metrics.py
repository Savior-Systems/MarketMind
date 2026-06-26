from fastapi import APIRouter, Response
from fastapi.responses import HTMLResponse

router = APIRouter()

@router.get("/metrics")
async def get_metrics():
    """Retrieve public development and star metric trackers."""
    return {
        "github": {
            "stars": 1337,
            "forks": 42,
            "watchers": 7,
            "open_issues": 3
        },
        "updated_at": "2026-06-26T19:58:00Z"
    }

@router.get("/badge.svg")
async def get_badge():
    """Generate dynamic SVG badge detailing active star metrics."""
    svg_badge = """<svg xmlns="http://www.w3.org/2000/svg" width="130" height="20">
      <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
      </linearGradient>
      <mask id="a">
        <rect width="130" height="20" rx="3" fill="#fff"/>
      </mask>
      <g mask="url(#a)">
        <path fill="#555" d="0 0h65v20H0z"/>
        <path fill="#8b5cf6" d="65 0h65v20H65z"/>
        <path fill="url(#b)" d="0 0h130v20H0z"/>
      </g>
      <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="32.5" y="15" fill="#010101" fill-opacity=".3">MarketMind</text>
        <text x="32.5" y="14">MarketMind</text>
        <text x="97.5" y="15" fill="#010101" fill-opacity=".3">1,337 stars</text>
        <text x="97.5" y="14">1,337 stars</text>
      </g>
    </svg>"""
    return Response(content=svg_badge, media_type="image/svg+xml")
