/* eslint-disable @typescript-eslint/no-require-imports */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("homepage hero uses the dedicated background video layer", () => {
  const pageSource = readSource("app/(main)/page.tsx");

  assert.match(pageSource, /HeroBackgroundMedia/);
  assert.match(pageSource, /Start Membership/);
  assert.match(pageSource, /Board-certified physician-led care/);
  // The hero must NOT render the raw US_STATES count as a licensure claim
  // (pre-July-2026 it said "Licensed across 52 states" — false; Michigan-first).
  assert.doesNotMatch(pageSource, /Licensed across \{STATES\.length\} states/);
  assert.match(pageSource, /Michigan-based, physician-owned/);
});

test("hero background media stays poster-first with desktop-only motion", () => {
  const mediaSource = readSource("components/home/HeroBackgroundMedia.tsx");

  assert.match(mediaSource, /doctor-consult-a\.mp4/);
  assert.match(mediaSource, /doctor-consult-a\.webm/);
  assert.match(mediaSource, /doctor-consult-a-poster\.webp/);
  assert.match(mediaSource, /doctor-consult-a-poster\.jpg/);
  assert.match(mediaSource, /HERO_POSTER_POSITION/);
  assert.match(mediaSource, /HERO_VIDEO_POSITION/);
  assert.match(mediaSource, /autoPlay/);
  assert.match(mediaSource, /muted/);
  assert.match(mediaSource, /loop/);
  assert.match(mediaSource, /playsInline/);
  assert.match(mediaSource, /preload="metadata"/);
  assert.match(mediaSource, /poster=\{HERO_VIDEO\.posterJpg\}/);
  assert.match(mediaSource, /prefers-reduced-motion: reduce/);
  assert.match(mediaSource, /min-width: 768px/);
  assert.match(mediaSource, /document\.readyState === "complete"/);
  assert.match(mediaSource, /requestIdleCallback/);
  assert.match(mediaSource, /md:hidden/);
  assert.match(mediaSource, /setIsEnhancementReady\(true\)/);
  assert.match(mediaSource, /setIsVideoVisible\(false\)/);
});
