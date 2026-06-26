# Contributing to MarketMind

Welcome! We are thrilled that you are interested in contributing to MarketMind. This project is built under the philosophy of **"Built By One. Owned By Everyone."** Your support helps push open-source self-hosting to the mainstream.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the Discord moderators.

## How to Set Up the Development Environment

1.  **Fork and Clone the Repo**:
    ```bash
    git clone https://github.com/<your-username>/MarketMind.git
    cd MarketMind
    ```
2.  **Spin Up Infrastructure**:
    Start the local PostgreSQL and Redis servers using Docker:
    ```bash
    make dev
    ```
3.  **Set Up Backend**:
    Create a Python virtual environment and install dependencies:
    ```bash
    cd backend
    python -m venv venv
    venv\Scripts\activate  # On Windows
    source venv/bin/activate  # On Unix
    pip install -r requirements.txt
    ```
4.  **Set Up Frontend**:
    Install dependencies and launch the dev server:
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```

## Finding Issues

We maintain lists of issues using GitHub Labels. Look out for `good first issue` labels or check our live **Imperfection Board** in GitHub Projects.

## Pull Request Process

1.  Create a branch from `main` (e.g., `feat/analytics-improvements` or `fix/jwt-auth`).
2.  Write your features or fixes, making sure to include tests.
3.  Format and lint the backend code:
    ```bash
    cd backend
    ruff check . --fix
    mypy .
    ```
4.  Verify the frontend compiles:
    ```bash
    cd frontend
    npm run build
    ```
5.  Submit your Pull Request with a clear description of changes.

## Code Style Guide

*   **Python**: Follow PEP 8 guidelines. We enforce style check with `ruff` and typing check with `mypy`.
*   **TypeScript**: Follow Next.js standards. We use ESLint and Prettier.

## Bug Reports & Feature Suggestions

Please open an issue on the GitHub repository using the appropriate template. Describe the behavior clearly and provide trace logs if possible.

## Contributors

Every contributor who gets a PR merged will be automatically added to our [CONTRIBUTORS.md](CONTRIBUTORS.md) list!

---

## See Also

- [📖 README](README.md) — Project overview
- [🤝 Contributing](CONTRIBUTING.md) — How to contribute
- [📜 Code of Conduct](CODE_OF_CONDUCT.md) — Community standards
- [🔒 Security](SECURITY.md) — Report vulnerabilities
- [📋 Changelog](CHANGELOG.md) — Version history
- [🏛️ Governance](GOVERNANCE.md) — Decision making
- [🙏 Contributors](CONTRIBUTORS.md) — Hall of fame
- [📚 Documentation Hub](docs/INDEX.md) — All docs

*Built by one. Owned by everyone.*
