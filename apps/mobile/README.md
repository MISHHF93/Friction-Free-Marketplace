# Mobile applications

The Capacitor shell loads the production Next.js origin over HTTPS. Server secrets never enter the native bundle.

```bash
CAPACITOR_SERVER_URL=https://marketplace.example.com npm run mobile:sync
npm run mobile:android
npm run mobile:ios
```

Android builds require Android Studio/JDK 21. iOS builds require macOS, Xcode, an Apple team, and signing profiles. Replace the placeholder origin before release.

Release scripts reject missing, non-HTTPS, example, or non-origin server URLs so a store package cannot accidentally target the placeholder host.
