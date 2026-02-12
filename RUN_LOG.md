# Stabilization Run Log

## Cycle 1

### Baseline Commands
- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### Failures Encountered (verbatim snippets)

#### `npm run lint` (failed)
```
✖ 665 problems (586 errors, 79 warnings)
  2 errors and 4 warnings potentially fixable with the `--fix` option.
```

Key representative errors:
```
/Users/jonathanrouwhorst/presenthealthdpc/app/(lp)/lp/[slug]/page.tsx
   26:30  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
```

```
/Users/jonathanrouwhorst/presenthealthdpc/scripts/test-meta-ads.js
  1:16  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
```

```
/Users/jonathanrouwhorst/presenthealthdpc/tests/markdown-render.test.js
  1:14  error  A `require()` style import is forbidden  @typescript-eslint/no-require-imports
```

### Passing Baseline Commands
- `npm test` passed (12/12)
- `npx tsc --noEmit` passed
- `npm run build` passed

### Notes
- Lint is currently failing repo-wide with a large pre-existing backlog not scoped to a single module.
- Next cycle will add high-value tests to currently untested risk areas and then introduce failing repro tests for concrete bugs.

## Cycle 2

### High-Risk, Low-Test Modules Selected
1. `lib/chatbot-shared.ts` (path normalization, gating logic, PHI/medical detection, text clipping)
2. `lib/schema.ts` (JSON-LD generation + breadcrumb normalization + validation)
3. `lib/us-states.ts` + `lib/pricing.ts` (input normalization for state lookup and pricing invariants)

### Tests Added
- `tests/helpers/register-ts.js` — test-only TS loader + `@/` alias resolver for Node test runtime.
- `tests/lib-chatbot-shared.test.js` — behavior + edge-path tests + failing repros.
- `tests/lib-schema.test.js` — schema generation/validation tests + failing repros.
- `tests/lib-us-states.test.js` — state parsing tests + failing repros.
- `tests/lib-pricing.test.js` — pricing invariants and normalization.

### New Test Count
- Added 41 new high-value tests.

### Failing Repro Snippets (before fixes)
From `npm test`:

```
not ok 14 - normalizePathname collapses slash-only paths to root
Expected values to be strictly equal:
'//' !== '/'
```

```
not ok 15 - normalizePathname removes repeated trailing slashes
Expected values to be strictly equal:
+ actual - expected
+ '/join/'
- '/join'
```

```
not ok 27 - clipText respects very small max values
Expected values to be strictly equal:
+ actual - expected
+ 'hell...'
- 'he'
```

```
not ok 28 - clipText handles zero max cleanly
Expected values to be strictly equal:
'he...' !== ''
```

```
not ok 37 - buildBreadcrumbSchema strips query and fragment from pathname
Expected values to be strictly equal:
+ 'Hsa Guide?ref=ad#faq'
- 'HSA Guide'
```

```
not ok 41 - validateSchemaBlockBasics flags @type arrays that only contain blanks
assert.ok(issues.some((x) => x.includes('missing @type')))
```

```
not ok 48 - stateFromNameOrCode accepts punctuation around 2-letter code
Expected values to be strictly equal:
+ undefined
- 'Texas'
```

```
not ok 49 - stateFromNameOrCode accepts underscore-separated state names
Expected values to be strictly equal:
+ undefined
- 'NC'
```

### Root Cause + Minimal Fix Summary
1. `lib/chatbot-shared.ts` `normalizePathname`
- Root cause: only removed a single trailing slash; did not collapse repeated slashes.
- Fix: collapse repeated slashes and strip all trailing slashes while preserving root.

2. `lib/chatbot-shared.ts` `clipText`
- Root cause: always appended ellipsis when truncating, even for tiny/zero limits.
- Fix: clamp/max-truncate limit; return exact slice for `<=3`; return empty for `0`.

3. `lib/schema.ts` `buildBreadcrumbSchema`
- Root cause: query string and hash were not removed before path segmentation.
- Fix: strip `?`/`#`, collapse repeated slashes, trim trailing slashes.

4. `lib/schema.ts` `validateSchemaBlockBasics`
- Root cause: `@type` arrays with only blank strings passed validation.
- Fix: require at least one non-empty trimmed string in `@type` array.

5. `lib/us-states.ts` `stateFromNameOrCode`
- Root cause: no normalization for punctuated 2-letter codes (`TX.`) or underscore names (`North_Carolina`).
- Fix: derive `codeCandidate` by removing non-letters; normalize underscores to spaces before name/slug matching.

### Verification After Fixes
- `npm test` => pass (54/54)

### 5x Consecutive Green Runs
```
=== TEST RUN 1 ===
# tests 54
# pass 54
# fail 0

=== TEST RUN 2 ===
# tests 54
# pass 54
# fail 0

=== TEST RUN 3 ===
# tests 54
# pass 54
# fail 0

=== TEST RUN 4 ===
# tests 54
# pass 54
# fail 0

=== TEST RUN 5 ===
# tests 54
# pass 54
# fail 0
```

### Clean Environment Validation
Performed:
1. `npm ci`
2. `npm test`
3. `npx tsc --noEmit`
4. `npm run build`

Results:
- `npm ci` succeeded.
- `npm test` succeeded (54/54).
- `npx tsc --noEmit` succeeded.
- `npm run build` succeeded.

### Outstanding Baseline Issue (Pre-existing)
- `npm run lint` remains failing repo-wide from pre-existing violations unrelated to this cycle's bug fixes/tests.
