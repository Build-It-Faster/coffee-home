import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { installSiteAnalytics } from "../assets/analytics.mjs";

function browser(url) {
  const scripts = [];
  const listeners = [];
  const location = new URL(url);
  globalThis.window = {
    location,
    document: {
      title: "private-title",
      referrer: "https://example.test/private-referrer",
      createElement: () => ({}),
      head: { append: (script) => scripts.push(script) },
    },
    addEventListener: (event) => listeners.push(event),
  };
  return { scripts, listeners, window: globalThis.window };
}

const pages = [
  ["/", "/"], ["/index.html", "/"],
  ["/privacy/", "/privacy"], ["/privacy/index.html", "/privacy"],
  ["/terms/", "/terms"], ["/support/", "/support"],
  ["/private-path", "/unknown"],
];

test("all homepage routes discard synthetic private URL and document values", () => {
  for (const [path, category] of pages) {
    const b = browser(`https://start.coffee${path}?utm_campaign=private-query&gclid=private-click#/p2p/private-room/private-secret`);
    installSiteAnalytics();
    const commands = b.window.dataLayer.map((args) => Array.from(args));
    const views = commands.filter((args) => args[0] === "event");
    assert.equal(views.length, 1);
    assert.deepEqual(views[0], ["event", "page_view", {
      page_location: `https://start.coffee${category}`,
      page_path: category, page_title: "Start Coffee", page_referrer: "",
    }]);
    for (const value of ["private-query", "private-click", "private-room", "private-secret", "private-title", "private-referrer", "private-path"])
      assert.ok(!JSON.stringify(commands).includes(value), value);
    assert.ok(!b.listeners.includes("hashchange"), "anchors must not generate page views");
  }
});

test("safe defaults precede config and tag loading; installation is idempotent", () => {
  const b = browser("https://start.coffee/support/?secret=private-secret");
  installSiteAnalytics();
  const commands = b.window.dataLayer.map((args) => Array.from(args));
  assert.equal(Object.prototype.toString.call(b.window.dataLayer[0]), "[object Arguments]");
  assert.equal(commands[1][0], "set");
  assert.deepEqual(commands[2], ["config", "G-GKZJEPZV7S", {
    send_page_view: false, allow_google_signals: false,
    allow_ad_personalization_signals: false, ignore_referrer: true,
  }]);
  assert.deepEqual(commands[1][1], commands[4][2]);
  assert.equal(b.scripts.length, 1);
  assert.equal(b.scripts[0].src, "https://www.googletagmanager.com/gtag/js?id=G-GKZJEPZV7S");
  assert.equal(b.scripts[0].referrerPolicy, "no-referrer");
  const count = commands.length;
  installSiteAnalytics();
  assert.equal(b.window.dataLayer.length, count);
  assert.equal(b.scripts.length, 1);
});

test("local and preview hosts never load Google or queue analytics", () => {
  for (const host of ["localhost:8765", "127.0.0.1:8765", "build-it-faster.github.io", "preview.start.coffee"]) {
    const b = browser(`https://${host}/privacy/`);
    installSiteAnalytics();
    assert.equal(b.scripts.length, 0);
    assert.equal(b.window.dataLayer, undefined);
  }
});

test("all four HTML entry points load the vendor module exactly once with no legacy loader", async () => {
  for (const page of ["index.html", "privacy/index.html", "terms/index.html", "support/index.html"]) {
    const url = new URL(`../${page}`, import.meta.url);
    const html = await readFile(url, "utf8");
    assert.equal((html.match(/installSiteAnalytics\(\)/g) || []).length, 1, page);
    assert.ok(!/googletagmanager|G-ZDNVDPG5RC|gtag\(/.test(html), page);
    const specifier = html.match(/from "([^"\n]+analytics\.mjs[^"\n]*)"/)[1];
    assert.ok(specifier.startsWith("./") || specifier.startsWith("../"), page);
    assert.equal(new URL(specifier, url).pathname, new URL("../assets/analytics.mjs", import.meta.url).pathname);
    assert.equal(new URL(specifier, url).search, "?v=3.3.3");
  }
});
