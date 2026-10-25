# LeadHunter AI

A Firebase-first B2B prospect research and outreach platform.

## Current status

This repository currently contains a public marketing-page starter and Firebase configuration starter. It is **not yet a functioning lead database, AI research engine, email sender, payment system, or deployed site**. The landing page labels sample prospect data as illustrative.

## Planned architecture

- **Frontend:** responsive HTML/CSS starter; evolve into an authenticated dashboard.
- **Authentication:** Firebase Authentication.
- **Database:** Cloud Firestore with default-deny security rules.
- **Backend:** Cloud Functions for website analysis, source-based company discovery, AI email drafts, credit accounting, and provider integrations.
- **Hosting:** Firebase Hosting.
- **Email delivery:** compliant email provider connected server-side; provider credentials must never be exposed in browser code.
- **Payments:** payment provider integration and server-side webhook verification before enabling paid credits.

## Firebase project

Target project ID: `leadhunter-ai-8ac33`

Before deploying, confirm that this project exists in the correct Google account and that Firebase CLI access is configured. Do not commit service-account keys, API secrets, private credentials, or production environment files.

## Local preview

Open `index.html` in a browser.

## Firebase setup

1. Install Node.js and the Firebase CLI.
2. Run `firebase login`.
3. From this repository run `firebase use leadhunter-ai-8ac33` after the project is accessible to your Google account.
4. Review `firestore.rules` and `firebase.json`.
5. Deploy Hosting only after the Firebase project is selected and the rules reviewed: `firebase deploy --only hosting`.
6. Deploy Firestore rules separately when ready: `firebase deploy --only firestore:rules`.

## Product and compliance requirements

- Never invent company records or contact details. Track source and confidence for each lead.
- Respect applicable privacy and email marketing rules, suppression lists, unsubscribe requests, bounce handling, and reply-based follow-up stops.
- Enforce credits and send limits server-side, never only in the browser.
- Keep paid checkout disabled until provider configuration, webhook validation, refunds, and subscription handling are tested.
- Free data sources may have limited coverage and may not provide verified decision-maker emails.

## Roadmap

- [x] Initial clean-white marketing page
- [x] Firebase Hosting and Firestore configuration starter
- [ ] Firebase Authentication and user onboarding
- [ ] Secure Firestore data model and tests
- [ ] Website analysis backend
- [ ] Source-attributed company/contact discovery
- [ ] AI email drafts and campaign review
- [ ] Managed sending, opt-outs, bounce handling and reply stops
- [ ] Server-side credits, billing and payment webhooks
- [ ] End-to-end security and deployment tests
