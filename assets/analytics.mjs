// Dependency-free browser module. The homepage can copy this file unchanged.
// Property/stream audit and integration contract: docs/analytics-approach.md.
export function analyticsConfiguration(
  hostname,
  measurementId,
  verified = false
) {
  if (hostname === "app.start.coffee") {
    return { measurementId: "G-VTEY6QR7YR", verified: true, site: "app" };
  }
  if (hostname === "start.coffee") {
    return { measurementId: "G-GKZJEPZV7S", verified: true, site: "home" };
  }
  return { measurementId, verified, site: "app" };
}

export function analyticsPage(hash, origin, pathname = "/", site = "app") {
  let pagePath;
  if (site === "home") {
    const path =
      pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "") || "/";
    pagePath = ["/", "/privacy", "/terms", "/support"].includes(path)
      ? path
      : "/unknown";
  } else {
    const route = hash.slice(1).split("?")[0];
    pagePath = /^\/p2p(?:\/|$)/.test(route)
      ? "/p2p"
      : /^\/meet\/sidepanel\/?$/.test(route)
        ? "/meet/sidepanel"
        : "/unknown";
  }
  return {
    page_location: `${origin}${pagePath}`,
    page_path: pagePath,
    page_title: site === "home" ? "Start Coffee" : "Coffee Meet",
    page_referrer: "",
  };
}

export function installGoogleAnalytics(
  measurementId,
  manualCollectionVerified = false,
  site = "app"
) {
  const browserWindow = globalThis.window;
  // gtag cannot disable Enhanced Measurement from code. Canonical host entries
  // above were checked against GA; other deployments retain an explicit gate.
  if (!manualCollectionVerified || !measurementId || !browserWindow?.document)
    return;
  const trimmedId = measurementId.trim();
  if (!trimmedId || browserWindow.gtag) return;

  browserWindow.dataLayer = browserWindow.dataLayer || [];
  browserWindow.gtag = function gtag() {
    // Google requires Arguments objects, rather than arrays.
    browserWindow.dataLayer?.push(arguments);
  };
  const page = () =>
    analyticsPage(
      browserWindow.location.hash,
      browserWindow.location.origin,
      browserWindow.location.pathname,
      site
    );
  browserWindow.gtag("js", new Date());
  browserWindow.gtag("set", page());
  browserWindow.gtag("config", trimmedId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ignore_referrer: true,
  });
  const trackPageView = () => {
    const fields = page();
    browserWindow.gtag?.("set", fields);
    browserWindow.gtag?.("event", "page_view", fields);
  };
  trackPageView();
  // Home uses document navigation; fragment anchors do not count as new pages.
  if (site === "app")
    browserWindow.addEventListener("hashchange", trackPageView);

  const script = browserWindow.document.createElement("script");
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(trimmedId)}`;
  browserWindow.document.head.append(script);
}

export function installSiteAnalytics(measurementId, verified = false) {
  const browserWindow = globalThis.window;
  if (!browserWindow?.document) return;
  const config = analyticsConfiguration(
    browserWindow.location.hostname,
    measurementId,
    verified
  );
  installGoogleAnalytics(config.measurementId, config.verified, config.site);
}
