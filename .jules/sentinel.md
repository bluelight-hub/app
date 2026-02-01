## 2026-02-01 - Content Security Policy Hardening for API

**Vulnerability:** Global use of 'unsafe-inline' in Content Security Policy (CSP) headers due to Swagger UI requirements.
**Learning:** Standard Helmet.js configurations often include permissive settings to support documentation tools like Swagger UI. Applying these globally weakens the security of the actual API endpoints, making them more susceptible to XSS if they ever serve HTML content (e.g., in error messages or future features).
**Prevention:** Use conditional middleware to apply strict CSP settings to the API and permissive settings only to the documentation routes. Pre-initialize helmet middleware instances to maintain performance.
