# LeadHunter AI

A Firebase-first B2B prospect research and outreach platform.

## Current status

The repository contains a public marketing page and an initial authenticated workspace shell. The workspace includes Firebase email/password sign-in, account creation, password reset, and user-scoped prospect/campaign counts once Firebase is configured. **Live lead discovery, website analysis, verified contact sourcing, email sending, billing, and production deployment are not implemented yet.** The UI explicitly says no leads are fabricated and does not send email.

## Planned architecture

- **Frontend:** responsive HTML/CSS, marketing page (index.html) and workspace (app.html).
- **Authentication:** Firebase Authentication (email/password).
- **Database:** Cloud Firestore with security rules.
- **Backend:** Cloud Functions for website analysis, source-based company discovery, AI email drafts, credit accounting, and provider integrations.
- **Hosting:** Firebase Hosting.
- **Email delivery:** compliant email provider connected server-side; provider credentials must never be exposed in browser code.
- **Payments:** payment provider integration and server-side webhook verification before enabling paid credits.

## Firebase project

Target project ID: `leadhunter-ai-8ac33`.

Before deploying, confirm that this project exists in the correct Google account and that Firebase CLI access is configured. The project ID in this repository is a target setting; this repository connection does not prove access to or existence of the Firebase project.

### One-time web app configuration

1. Open the Firebase console and select `leadhunter-ai-8ac33`.
2. Register a Web App in Project settings if one does not already exist.
3. In **Authentication → Sign-in method**, enable **Email/Password**.
4. Copy the Web App configuration from Project settings → Your apps.
5. In `app.js`, replace `REPLACE_WITH_FIREBASE_WEB_API_KEY` and `REPLACE_WITH_FIREBASE_WEB_APP_ID` with the values from that Web App. Keep `projectId` set to `leadhunter-ai-8ac33` and use the actual `authDomain` supplied by Firebase.
6. Create/confirm the Cloud Firestore database and review `firestore.rules` before enabling real user data.

Firebase's web configuration is intended for client-side initialization; **never put service-account JSON, private API keys, email-provider secrets, or payment secrets in browser files or GitHub**.

## Local preview

- Open `index.html` to view the marketing page.
- Serve the repository through a local web server to test the module-based workspace. Open `app.html`.
- Authentication remains unavailable until the Firebase Web App configuration is filled in and Email/Password sign-in is enabled.

## Firebase setup and deployment

1. Install Node.js and the Firebase CLI.
2. Run `firebase login`.
3. From this repository run `firebase use leadhunter-ai-8ac33` after the project is accessible to your Google account.
4. Review `firestore.rules` and `firebase.json`.
5. Deploy Hosting only after the project is selected and the app configuration is complete: `firebase deploy --only hosting`.
6. Deploy Firestore rules separately only after review and tests: `firebase deploy --only firestore:rules`.

## Product and compliance requirements

- Never invent company records or contact details. Track source and confidence for each lead.
- Respect applicable privacy and email marketing rules, suppression lists, unsubscribe requests, bounce handling, and reply-based follow-up stops.
- Enforce credits and send limits server-side, never only in the browser.
- Keep paid checkout disabled until provider configuration, webhook validation, refunds, and subscription handling are tested.
- Free data sources may have limited coverage and may not provide verified decision-maker emails.

## Roadmap

- [x] Initial clean-white marketing page
- [x] Firebase Hosting and Firestore configuration starter
- [x] Initial workspace shell and Firebase email/password auth integration
- [ ] Verify Firebase project and configure the Web App
- [ ] Test authentication and tighten/test Firestore rules
- [ ] Website analysis backend
- [ ] Source-attributed company/contact discovery
- [ ] AI email drafts and campaign review
- [ ] Managed sending, opt-outs, bounce handling and reply stops
- [ ] Server-side credits, billing and payment webhooks
- [ ] End-to-end security and deployment tests
