import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Network } from "@capacitor/network";
const configuredOrigin = new URL(document.querySelector('meta[name="app-origin"]')?.content ??
    "https://marketplace.example.com");
App.addListener("appUrlOpen", async ({ url }) => {
    const target = new URL(url);
    if (target.protocol === "ffmarketplace:") {
        window.location.assign(`${configuredOrigin.origin}${target.pathname}${target.search}${target.hash}`);
    }
    else if (target.origin === configuredOrigin.origin) {
        window.location.assign(target.href);
    }
    else {
        await Browser.open({ url: target.href });
    }
});
App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack)
        window.history.back();
    else
        App.minimizeApp();
});
Network.addListener("networkStatusChange", ({ connected }) => {
    if (connected && window.location.pathname === "/offline")
        window.location.reload();
});
