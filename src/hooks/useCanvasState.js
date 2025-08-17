/*
 * Pixel2CPP - Canvas State Hook
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import { useState, useEffect, useRef } from "react";
import { transparent, rgbaEq } from "../lib/colors.js";

/**
 * Custom hook to manage canvas state and drawing logic
 * 
 * @param {number} initialWidth - Initial canvas width
 * @param {number} initialHeight - Initial canvas height
 * @param {string} backgroundColor - Background color setting
 * @param {Function} setBackgroundColor - Function to set background color
 * @returns {Object} Canvas state and methods
 */
export function useCanvasState(initialWidth, initialHeight, backgroundColor, setBackgroundColor) {
  // Core state
  const [w, setW] = useState(initialWidth);
  const [h, setH] = useState(initialHeight);
  const [data, setData] = useState(() => Array.from({ length: initialWidth * initialHeight }, () => transparent()));
  const prevSize = useRef({ w: initialWidth, h: initialHeight });

  // History
  const [history, setHistory] = useState([]);
  const [redo, setRedo] = useState([]);
  const canUndo = history.length > 0;
  const canRedo = redo.length > 0;

  const pushHistory = (d) => {
    setHistory((h) => [...h, d.map((p) => ({ ...p }))]);
    setRedo([]);
  };

  // Ensure data buffer matches size and preserves overlapping pixels on resize
  useEffect(() => {
    const { w: ow, h: oh } = prevSize.current;
    if (ow === w && oh === h) return;
    setData((prev) => {
      const out = Array.from({ length: w * h }, () => transparent());
      const cw = Math.min(ow, w);
      const ch = Math.min(oh, h);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          out[y * w + x] = prev[y * ow + x];
        }
      }
      return out;
    });
    prevSize.current = { w, h };
    setHistory([]);
    setRedo([]);
    // Set background to transparent when canvas dimensions change
    // This allows users to then choose white or black if needed
    if (typeof setBackgroundColor === 'function') {
      setBackgroundColor("transparent");
    }
  }, [w, h]);

  // Update background color when it changes
  useEffect(() => {
    setData((prev) => {
      const newData = [...prev];
      for (let i = 0; i < newData.length; i++) {
        if (newData[i].a === 0) { // Transparent pixels
          if (backgroundColor === "white") {
            newData[i] = { r: 255, g: 255, b: 255, a: 255 };
          } else if (backgroundColor === "black") {
            newData[i] = { r: 0, g: 0, b: 0, a: 255 };
          } else {
            // transparent - keep as transparent
            newData[i] = transparent();
          }
        }
      }
      return newData;
    });
  }, [backgroundColor]);

  const idx = (x, y) => y * w + x;

  // Drawing helpers
  const drawAt = (x, y, pix, erase = false, mirrorX = false, mirrorY = false) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    setData((d) => {
      const nd = d.slice();
      const setPixel = (px, py) => {
        if (px < 0 || py < 0 || px >= w || py >= h) return;
        nd[idx(px, py)] = erase ? transparent() : pix;
      };
      setPixel(x, y);
      if (mirrorX) setPixel(w - 1 - x, y);
      if (mirrorY) setPixel(x, h - 1 - y);
      if (mirrorX && mirrorY) setPixel(w - 1 - x, h - 1 - y);
      return nd;
    });
  };

  const floodFill = (sx, sy, target, replacement) => {
    if (rgbaEq(target, replacement)) return;
    const stack = [[sx, sy]];
    const d = data.slice();
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = idx(x, y);
      if (!rgbaEq(d[i], target)) continue;
      d[i] = replacement;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    setData(d);
  };

  const clearCanvas = () => {
    pushHistory(data);
    setData(Array.from({ length: w * h }, () => transparent()));
    // Set background to transparent when clearing canvas
    // This allows users to then choose white or black if needed
    if (typeof setBackgroundColor === 'function') {
      setBackgroundColor("transparent");
    }
  };

  const undo = () => {
    if (canUndo) {
      setRedo((r) => [data.map(p=>({...p})), ...r]); 
      const last = history[history.length - 1]; 
      setHistory((h) => h.slice(0, -1)); 
      setData(last.map(p => ({ ...p }))); 
    }
  };

  const redoAction = () => {
    if (canRedo) {
      const [next, ...rest] = redo; 
      setHistory((h) => [...h, data.map(p=>({...p}))]); 
      setData(next.map(p => ({ ...p }))); 
      setRedo(rest); 
    }
  };

  return {
    w,
    setW,
    h,
    setH,
    data,
    setData,
    canUndo,
    canRedo,
    pushHistory,
    drawAt,
    floodFill,
    clearCanvas,
    undo,
    redoAction,
    idx
  };
}
