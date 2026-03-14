import html2canvas from "html2canvas";

/**
 * Maximum dimensions for the captured screenshot
 */
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

/**
 * JPEG compression quality (0.0 - 1.0)
 */
const JPEG_QUALITY = 0.8;

/**
 * Captures a screenshot of the given HTML element and returns it as a compressed JPEG data URL.
 *
 * This function is designed to capture Sandpack preview containers. It uses html2canvas to
 * render the element to a canvas, then scales it down if needed and compresses it to JPEG.
 *
 * @param element - The HTML element to capture (typically the Sandpack preview container)
 * @returns Promise that resolves to a JPEG data URL (e.g., "data:image/jpeg;base64,...")
 * @throws Error if the element cannot be captured or if html2canvas fails
 *
 * @example
 * ```typescript
 * const previewElement = document.querySelector('.sandpack-preview-container');
 * if (previewElement) {
 *   try {
 *     const dataUrl = await capturePreviewScreenshot(previewElement as HTMLElement);
 *     // Use dataUrl for upload or display
 *   } catch (error) {
 *     console.error('Screenshot failed:', error);
 *   }
 * }
 * ```
 */
export async function capturePreviewScreenshot(
  element: HTMLElement
): Promise<string> {
  if (!element) {
    throw new Error("Element is required for screenshot capture");
  }

  try {
    // Capture the element using html2canvas
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      scale: 1, // Use device pixel ratio for better quality
      logging: false,
    });

    // Get original dimensions
    let width = canvas.width;
    let height = canvas.height;

    // Scale down if larger than max dimensions
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      // Create a new canvas with scaled dimensions
      const scaledCanvas = document.createElement("canvas");
      scaledCanvas.width = width;
      scaledCanvas.height = height;

      const ctx = scaledCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas 2D context");
      }

      // Draw the original canvas scaled down
      ctx.drawImage(canvas, 0, 0, width, height);

      // Convert to JPEG data URL with compression
      return scaledCanvas.toDataURL("image/jpeg", JPEG_QUALITY);
    }

    // No scaling needed, convert directly
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to capture screenshot: ${message}`);
  }
}
