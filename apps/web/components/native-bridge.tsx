"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const openExternalLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.origin === window.location.origin || ["mailto:", "tel:", "ffmarketplace:"].includes(target.protocol)) return;
      event.preventDefault();
      void Browser.open({ url: target.href, presentationStyle: "popover" });
    };
    document.addEventListener("click", openExternalLink);

    const listeners = [
      App.addListener("appUrlOpen", ({ url }) => {
        const target = new URL(url);
        if (target.protocol === "ffmarketplace:") {
          window.location.assign(`${window.location.origin}${target.pathname}${target.search}${target.hash}`);
        } else if (target.origin === window.location.origin) {
          window.location.assign(target.href);
        }
      }),
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else App.minimizeApp();
      }),
      Network.addListener("networkStatusChange", ({ connected }) => {
        if (connected && window.location.pathname === "/offline") window.location.reload();
      })
    ];

    return () => {
      document.removeEventListener("click", openExternalLink);
      void Promise.all(listeners.map(async (listener) => (await listener).remove()));
    };
  }, []);

  return null;
}
