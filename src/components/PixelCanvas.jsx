/*
 * Pixel2CPP - Pixel Canvas Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React, { useEffect, useRef } from "react";

// Efficient canvas renderer for pixel grid
export default function PixelCanvas({
  width,
  height,
  zoom,
  pixels,
  backgroundColor = "black",
  customBackgroundColor = "#000000",
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

    // Set background color based on the selected option
    let bgColor = '#000000'; // Default black
    if (backgroundColor === "white") {
      bgColor = '#ffffff';
    } else if (backgroundColor === "transparent") {
      bgColor = 'transparent';
    } else if (backgroundColor === "custom") {
      bgColor = customBackgroundColor;
    }
    // For "black" or any other case, use default black

    // Fill background if not transparent
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw pixel buffer directly at 1:1
    // Ensure we have valid pixel data
    if (!pixels || pixels.length !== width * height) {
      // During resize operations, there might be a temporary mismatch
      // Just return early since we already set the background
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

    // Draw a simple border around the canvas
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, width, height);
  }, [pixels, width, height, zoom, backgroundColor, customBackgroundColor]);

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

  // Determine fallback background color for CSS
  let fallbackBgColor = '#000000'; // Default black
  if (backgroundColor === "white") {
    fallbackBgColor = '#ffffff';
  } else if (backgroundColor === "transparent") {
    fallbackBgColor = 'transparent';
  } else if (backgroundColor === "custom") {
    fallbackBgColor = customBackgroundColor;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: width * zoom,
        height: height * zoom,
        imageRendering: "pixelated",
        cursor: cursor,
        display: "block",
        backgroundColor: fallbackBgColor, // Fallback background color to prevent white flash
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


