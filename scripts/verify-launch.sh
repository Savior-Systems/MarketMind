#!/bin/bash
echo "============================================"
echo "MarketMind Launch Day Verification"
echo "============================================"

echo ""
echo "[1/8] Checking Git status..."
git status
echo "✅ Done"

echo ""
echo "[2/8] Running backend tests..."
cd backend && python -m pytest tests/ -v
cd ..
echo "✅ Done"

echo ""
echo "[3/8] Building frontend..."
cd frontend && npm run build
cd ..
echo "✅ Done"

echo ""
echo "[4/8] Testing API health endpoint..."
curl -s http://localhost:8000/health || echo "⚠️ Backend not running locally (OK if deploying to cloud)"
echo ""

echo "[5/8] Testing public metrics endpoint..."
curl -s http://localhost:8000/api/v1/public/metrics || echo "⚠️ Public metrics not reachable locally"
echo ""

echo "[6/8] Verifying documentation files exist..."
for file in README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md CHANGELOG.md GOVERNANCE.md SUSTAINABILITY.md; do
  if [ -f "$file" ]; then echo "  ✅ $file"; else echo "  ❌ $file MISSING"; fi
done
echo "✅ Done"

echo ""
echo "[7/8] Verifying launch content ready..."
if [ -f "docs/LAUNCH_CONTENT.md" ]; then echo "  ✅ Launch content file exists"; else echo "  ❌ docs/LAUNCH_CONTENT.md MISSING"; fi
echo "✅ Done"

echo ""
echo "[8/8] Checking .gitignore protects secret files..."
for file in MARKETMIND_STRATEGY.md .mmdos.yaml tools/ agents.json setup-agents.sh .env; do
  if git check-ignore -q "$file" 2>/dev/null; then echo "  ✅ $file is gitignored"; else echo "  ⚠️ $file may NOT be gitignored"; fi
done
echo "✅ Done"

echo ""
echo "============================================"
echo "ALL CHECKS COMPLETE"
echo "============================================"
echo ""
echo "If all checks passed: YOU ARE READY TO LAUNCH 🚀"
echo "If any checks failed: Fix before launch day."
