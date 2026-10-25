# LeadHunter AI

A Firebase-first B2B prospect research and outreach platform.

## Current status

The repository contains a public marketing page and an initial authenticated workspace shell. The workspace includes Firebase email/password sign-in, account creation, password reset, and user-scoped prospect/campaign counts. **Live lead discovery, website analysis, verified contact sourcing, email sending, billing, and production deployment are not implemented yet.** The UI explicitly says no leads are fabricated and does not send email.

## Architecture

- **Frontend:** responsive HTML/CSS, marketing page (`index.html`) and workspace (`app.html`).
- **Authentication:** Firebase Authentication (email/password).
- **Database:** Cloud Firestore with security rules in `firestore.rules`.
- **Hosting:** Firebase Hosting; GitHub Actions workflow is in `.github/workflows/firebase-hosting.yml`.
- **Future backend:** Cloud Functions for website analysis, source-based company discovery, AI email drafts, credit accounting, and provider integrations.
- **Email delivery/payments:** must be integrated server-side; provider credentials must never be exposed in browser code.

## Firebase project

Project ID: `leadhunter-ai-8ac33`.

The web app configuration is already present in `app.js`. Firebase web configuration is designed for client-side initialization. Never put service-account JSON, email-provider secrets, payment secrets, or other server-side credentials in browser files or commit them to the repository.

## Deploy to Firebase Hosting using GitHub Actions

This repository is set up to deploy the root directory to Firebase Hosting when a commit is pushed to `main`, after the GitHub secret below is configured. Render is not required for this deployment.

1. In Google Cloud Console for project `leadhunter-ai-8ac33`, create a dedicated service account for GitHub Actions.
2. Grant that service account the permissions required to deploy Firebase Hosting (Firebase Hosting Admin is the primary hosting role; follow Google/Firebase's current guidance if additional project permissions are requested).
3. Create a JSON key for that service account and download it. Treat it as a secret.
4. Open the GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**.
5. Set the secret name exactly to `FIREBASE_SERVICE_ACCOUNT_LEADHUNTER_AI_8AC33`.
6. Paste the entire downloaded service-account JSON into the secret's value and save. Do **not** paste the JSON into chat, a source file, or a GitHub commit.
7. Open the repository's **Actions** tab and run **Deploy LeadHunter AI to Firebase Hosting**, or make a small commit to `main` to trigger it.
8. When the workflow succeeds, the site should be available at `https://leadhunter-ai-8ac33.web.app` and `https://leadhunter-ai-8ac33.firebaseapp.com`, provided Firebase Hosting is enabled for the project.

If you cannot create a service-account key or grant permissions, do not weaken project security; tell the project owner/administrator what permission is missing.

## Authentication and database setup

1. In Firebase Authentication, enable Email/Password.
2. Create/confirm the Firestore database.
3. Review the rules in `firestore.rules`. Rules saved in GitHub do not become active in Firebase until deployed or published in the Firebase console.
4. Add the hosted website domain to Authentication's authorized domains if it is not already listed.
5. Test registration, login, password reset, and user-profile creation before using real data.

## Local preview

- Open `index.html` to view the marketing page.
- Serve the repository through a local web server to test the module-based workspace, then open `app.html`.

## Product and compliance requirements

- Never invent company records or contact details. Track source and confidence for each lead.
- Respect applicable privacy and email marketing rules, suppression lists, unsubscribe requests, bounce handling, and reply-based follow-up stops.
- Enforce credits and send limits server-side, never only in the browser.
- Keep paid checkout disabled until provider configuration, webhook validation, refunds, and subscription handling are tested.
- Free data sources may have limited coverage and may not provide verified decision-maker emails.

## Roadmap

- [x] Initial clean-white marketing page
- [x] Firebase Hosting configuration
- [x] Initial workspace shell and Firebase email/password auth integration
- [x] GitHub Actions workflow for Firebase Hosting (requires service-account repository secret)
- [ ] Configure deployment secret and verify successful hosting deploy
- [ ] Test authentication and Firestore rules end-to-end
- [ ] Website analysis backend
- [ ] Source-attributed company/contact discovery
- [ ] AI email drafts and campaign review
- [ ] Managed sending, opt-outs, bounce handling and reply stops
- [ ] Server-side credits, billing and payment webhooks
- [ ] End-to-end security and deployment tests
