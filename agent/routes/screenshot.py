"""
Screenshot service using Playwright.
Renders HTML in headless browser and captures screenshot.
Browser instance is kept alive for performance.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from playwright.async_api import async_playwright, Browser, Page
import asyncio
import logging
import base64

logger = logging.getLogger(__name__)

router = APIRouter()

# Global browser instance (kept alive)
_browser: Browser | None = None
_browser_lock = asyncio.Lock()


async def get_browser() -> Browser:
    """Get or create browser instance."""
    global _browser

    async with _browser_lock:
        if _browser is None or not _browser.is_connected():
            playwright = await async_playwright().start()
            _browser = await playwright.chromium.launch(headless=True)
            logger.info("Playwright browser launched")

    return _browser


class ScreenshotRequest(BaseModel):
    html: str
    width: int = 800
    height: int = 600


class ScreenshotResponse(BaseModel):
    image: str  # base64 data URL


@router.post("/screenshot", response_model=ScreenshotResponse)
async def capture_screenshot(request: ScreenshotRequest):
    """
    Render HTML and capture screenshot.

    Returns base64 JPEG data URL.
    """
    try:
        browser = await get_browser()
        page = await browser.new_page(viewport={"width": request.width, "height": request.height})

        try:
            # Set content and wait for render
            await page.set_content(request.html, wait_until="networkidle")

            # Capture screenshot
            screenshot_bytes = await page.screenshot(type="jpeg", quality=80)

            # Convert to base64 data URL
            b64 = base64.b64encode(screenshot_bytes).decode()
            data_url = f"data:image/jpeg;base64,{b64}"

            return ScreenshotResponse(image=data_url)

        finally:
            await page.close()

    except Exception as e:
        logger.error(f"Screenshot capture failed: {e}")
        raise HTTPException(status_code=500, detail=f"Screenshot failed: {str(e)}")
