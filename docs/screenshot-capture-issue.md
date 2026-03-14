# Screenshot Capture Issue

## Problem

html2canvas **cannot capture iframe content** due to browser same-origin policy restrictions.

Sandpack renders the preview in a sandboxed iframe, so `html2canvas` only captures the empty container div, not the actual rendered preview.

## Why This Happens

- Sandpack preview renders in `<iframe sandbox="...">`
- Browser security prevents accessing iframe content from different origins
- html2canvas cannot bypass this restriction (it's a browser limitation, not a library issue)

## Solutions

### Option 1: Server-Side Screenshot (Recommended)

Use Playwright or Puppeteer on the backend to render and capture:

```typescript
// Backend endpoint using Playwright
import { chromium } from 'playwright';

async function captureScreenshot(html: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
  await browser.close();
  return screenshot;
}
```

**Pros:** Reliable, captures actual rendered content
**Cons:** Requires backend service, slower, more resources

### Option 2: Capture Code Editor Instead

Capture the code editor view (which is not in an iframe) instead of the preview:

```typescript
// Capture the code editor container instead
const codeEditorRef = useRef<HTMLDivElement>(null);
const dataUrl = await html2canvas(codeEditorRef.current);
```

**Pros:** Works with html2canvas, fast, client-side
**Cons:** Shows code, not the visual preview

### Option 3: External Screenshot Service

Use a third-party service like:
- Microlink (https://microlink.io)
- ScreenshotAPI (https://screenshotapi.net)
- Urlbox (https://urlbox.io)

**Pros:** No backend needed, reliable
**Cons:** Costs money, external dependency, privacy concerns

### Option 4: Use Sandpack's getCodeSandboxURL

Generate a CodeSandbox URL and screenshot that:

```typescript
const { sandpack } = useSandpack();
const client = sandpack.clients[clientId];
const { embedUrl } = await client.getCodeSandboxURL();
// Then screenshot the embedUrl using a service
```

**Pros:** Official CodeSandbox preview
**Cons:** Requires external service to screenshot, slower

## Recommendation

For this project, I recommend **Option 2** (capture code editor) as a quick fix, or **Option 1** (server-side Playwright) for the proper solution.

## Sources

- [html2canvas iframe limitations](https://forums.tumult.com/t/screenshot-an-iframe-content-inside-html2canvas-capture/21125)
- [Sandpack Components Documentation](https://sandpack.codesandbox.io/docs/advanced-usage/components)
- [Build Link Previews with Playwright](https://www.braydoncoyer.dev/blog/build-link-previews-with-playwright-and-the-popover-api)
