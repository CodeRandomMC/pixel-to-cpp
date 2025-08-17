import React, { useEffect, useRef } from "react";

// Efficient canvas renderer for pixel grid
export default function PixelCanvas({
  width,
  height,
  zoom,
  pixels,
  showGrid,
  cursor,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  const canvasRef = useRef(null);

  // Draw pixels to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Only update canvas dimensions if they actually changed to avoid unnecessary clears
    const needsResize = canvas.width !== width || canvas.height !== height;
    if (needsResize) {
      canvas.width = width;
      canvas.height = height;
    }
    
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw pixel buffer directly at 1:1
    // Ensure we have valid pixel data
    if (!pixels || pixels.length !== width * height) {
      // During resize operations, there might be a temporary mismatch
      // Just fill with a default background color instead of showing white
      ctx.fillStyle = '#1f2937'; // neutral-800 background
      ctx.fillRect(0, 0, width, height);
      return;
    }
    
    const imageData = ctx.createImageData(width, height);
    const buf = imageData.data;
    for (let y = 0; y < height; y++) {
      const offset = y * width;
      for (let x = 0; x < width; x++) {
        const p = pixels[offset + x];
        if (!p) continue; // Skip if pixel is undefined
        const i = (y * width + x) * 4;
        buf[i] = p.a === 0 ? 0 : p.r;
        buf[i + 1] = p.a === 0 ? 0 : p.g;
        buf[i + 2] = p.a === 0 ? 0 : p.b;
        buf[i + 3] = p.a;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Draw grid in logical pixels (will scale with CSS)
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let x = 1; x < width; x++) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 1; y < height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    } else {
      const prev = ctx.strokeStyle;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
      ctx.strokeStyle = prev;
    }
  }, [pixels, width, height, zoom, showGrid]);

  // Also ensure the canvas style updates are applied correctly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Force a repaint after style changes to prevent white flashes
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // This is a small optimization to reduce white flashes during resize
      ctx.imageSmoothingEnabled = false;
    }
  }, [zoom]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: width * zoom,
        height: height * zoom,
        imageRendering: "pixelated",
        cursor: cursor,
        display: "block",
        backgroundColor: '#1f2937', // Fallback background color to prevent white flash
      }}
      onMouseDown={onPointerDown}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      data-canvas
    />
  );
}


