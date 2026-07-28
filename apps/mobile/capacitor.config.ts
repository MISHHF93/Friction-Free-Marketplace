import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.CAPACITOR_SERVER_URL ?? "https://marketplace.example.com";
const host = new URL(appUrl).hostname;

const config: CapacitorConfig = {
  appId: "com.frictionfreemarketplace.app",
  appName: "Friction-Free Marketplace",
  webDir: "www",
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith("http://"),
    allowNavigation: [host]
  },
  android: {
    allowMixedContent: false,
    captureInput: true
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#047857",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#f8fafc"
    }
  }
};

export default config;
