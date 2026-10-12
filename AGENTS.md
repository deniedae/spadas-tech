# Spadas agent rules

You edit code only. You do not deploy, push, or sign release bundles unless the user message contains the exact word DEPLOY.

Never binary-patch an AAB/APK. SDK, versionCode, and startUrl change in Gradle/manifest source, then a normal rebuild.

One task per session. Do not redesign onboarding, paywall, copy, and billing together.

Run type-check or build once per task. Paste the real error. Do not rerun while waiting.

Do not claim a fix is live or guaranteed without command output in the reply.

Prices, SKUs, and trial length come from the billing config only. Do not invent $ amounts, "0.5s", or percentages.

Free scans and saved comps are server-side, keyed by auth user id. localStorage is a cache, not an entitlement.

First launch is OnboardingCarousel only, then the weekly 3-day trial paywall. Do not add a second welcome modal.

Summaries: under 10 lines. Show the diff summary and the check output.
