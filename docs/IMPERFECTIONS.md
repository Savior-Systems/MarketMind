# MarketMind Initial Imperfections 🛠️

This document outlines the first 10 known rough edges of MarketMind. These issues are tracked on the [Imperfection Board](/imperfections) and labeled as `imperfection` in GitHub.

## 1. Dashboard loading animation could be smoother (UI)
- **Description**: The dashboard metrics cards currently load abruptly. Adding a sleek skeleton placeholder state with a pulsing transition would enhance the visual experience.
- **Severity**: Low
- **Category**: UI

## 2. Calendar view doesn't support week view yet (Feature Gap)
- **Description**: The content calendar only supports a monthly view. Standard content managers require a week-by-week layout to schedule detailed social media campaigns.
- **Severity**: Medium
- **Category**: Feature Gap

## 3. Settings form validation needs better error messages (DX)
- **Description**: Form validation in brand profile settings returns generic inputs validation errors. Users need specific prompts when fields like keywords or audience contain formatting mistakes.
- **Severity**: Low
- **Category**: DX

## 4. Content generation should show streaming response (Performance)
- **Description**: Generating copy takes a few seconds. Implementing server-sent events (SSE) for token streaming would decrease perceived latency and improve usability.
- **Severity**: High
- **Category**: Performance

## 5. Mobile sidebar touch targets need improvement (UI)
- **Description**: On screen widths less than 768px, sidebar navigation list items have small padding targets, making touch selection difficult.
- **Severity**: Medium
- **Category**: UI

## 6. No onboarding tour for new users (DX)
- **Description**: First-time dashboard visits do not show an onboarding walk-through tour explaining content creation pipelines, scheduler, or settings.
- **Severity**: Medium
- **Category**: DX

## 7. Analytics agent needs richer visualizations (Feature Gap)
- **Description**: The AnalyticsAgent outputs textual summaries but lacks visual chart render coordinates/data structures to feed charts on the frontend.
- **Severity**: High
- **Category**: Feature Gap

## 8. Docker setup could have better error messages (DX)
- **Description**: When containers fail due to port conflicts (e.g., port 8000 or 5432 is already bound), the setup script outputs generic bash errors instead of port check suggestions.
- **Severity**: Low
- **Category**: DX

## 9. README could have more code examples (Documentation)
- **Description**: The main `README.md` details project architecture but does not show quick API fetch examples or custom Celery task worker integrations.
- **Severity**: Low
- **Category**: Documentation

## 10. Dark mode has minor contrast issues in some card components (UI)
- **Description**: Secondary text colors against dark card backgrounds (#0a0a0a) fall slightly below WCAG AA contrast ratio compliance.
- **Severity**: Low
- **Category**: UI
