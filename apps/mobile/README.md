# Android and iOS applications

This directory is part of the root npm workspace and the same GitHub repository as `apps/web`. Do not split Android or iOS into separate repositories. The hosted Next.js application owns UI, marketplace APIs, authentication, commerce, and AI; these Capacitor projects package that same product for Google Play and the Apple App Store.

The Capacitor shell loads the production Next.js origin over HTTPS. Server secrets never enter the native bundle.

```bash
CAPACITOR_SERVER_URL=https://marketplace.example.com npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

Android builds require Android Studio/JDK 21. iOS builds require macOS, Xcode, an Apple team, and signing profiles. Replace the placeholder origin before release.

Release scripts reject missing, non-HTTPS, example, or non-origin server URLs so a store package cannot accidentally target the placeholder host.

From the repository root:

```bash
npm run platform:verify
npm run platform:sync
```

Canonical application identity:

- Android application ID: `com.frictionfreemarketplace.app`
- iOS bundle ID: `com.frictionfreemarketplace.app`
- Display name: `Friction-Free Marketplace`
