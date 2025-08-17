/*
 * Pixel2CPP - Tests Hook
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import { useState, useMemo } from "react";
import { pack1bit, pack1bitAlpha, packRGB565, packRGB24, packRGB332, packGray4 } from "../lib/packers.js";
import { black, white } from "../lib/colors.js";

/**
 * Custom hook to manage built-in test functionality
 * 
 * @returns {Object} Test state and methods
 */
export function useTests() {
  const [testResults, setTestResults] = useState([]);

  const runTests = () => {
    const results = [];

    // Test 1: 1-bit horizontal exact 8 pixels 10101010 → 0xAA
    {
      const tw = 8, th = 1;
      const px = [];
      for (let i = 0; i < 8; i++) px.push((i % 2 === 0) ? white() : black()); // 1,0,1,0,... (white=1)
      const bytes = pack1bit(px, tw, th, 'horizontal');
      const expect = [0xAA];
      results.push({ name: "1BIT Horizontal 8px 10101010", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 2: 1-bit horizontal width 10, row of all ones → [0xFF, 0xC0]
    {
      const tw = 10, th = 1;
      const px = Array.from({ length: tw * th }, () => white());
      const bytes = pack1bit(px, tw, th, 'horizontal');
      const expect = [0xFF, 0xC0];
      results.push({ name: "1BIT Horizontal 10px row all 1s", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 3: 1-bit vertical packing
    {
      const tw = 1, th = 8;
      const px = [];
      for (let i = 0; i < 8; i++) px.push((i % 2 === 0) ? white() : black()); // 1,0,1,0,... (white=1)
      const bytes = pack1bit(px, tw, th, 'vertical');
      const expect = [0xAA]; // Same pattern but vertical
      results.push({ name: "1BIT Vertical 1x8 10101010", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 4: 1-bit alpha map
    {
      const tw = 8, th = 1;
      const px = [];
      for (let i = 0; i < 8; i++) px.push({ r: 255, g: 255, b: 255, a: (i % 2 === 0) ? 255 : 0 }); // alpha pattern
      const bytes = pack1bitAlpha(px, tw, th, 'horizontal');
      const expect = [0xAA];
      results.push({ name: "1BIT Alpha map 8px pattern", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 5: RGB565 primary colors
    {
      const tw = 3, th = 1;
      const px = [
        { r: 255, g: 0, b: 0, a: 255 },
        { r: 0, g: 255, b: 0, a: 255 },
        { r: 0, g: 0, b: 255, a: 255 },
      ];
      const words = packRGB565(px, tw, th);
      const expect = [0xF800, 0x07E0, 0x001F];
      results.push({ name: "RGB565 R,G,B", pass: JSON.stringify(words) === JSON.stringify(expect), got: words, expect });
    }

    // Test 6: RGB24 format - 2x2 image with RGB colors
    {
      const tw = 2, th = 2;
      const px = [
        { r: 255, g: 0, b: 0, a: 255 },     // Red
        { r: 0, g: 255, b: 0, a: 255 },     // Green
        { r: 0, g: 0, b: 255, a: 255 },     // Blue
        { r: 255, g: 255, b: 255, a: 255 }, // White
      ];
      const rgb24Data = packRGB24(px, tw, th);
      const expect = [
        255, 0, 0,    // Red (R=255, G=0, B=0)
        0, 255, 0,    // Green (R=0, G=255, B=0)
        0, 0, 255,    // Blue (R=0, G=0, B=255)
        255, 255, 255 // White (R=255, G=255, B=255)
      ];
      results.push({ name: "RGB24 2x2 colors", pass: JSON.stringify(rgb24Data) === JSON.stringify(expect), got: rgb24Data, expect });
    }

    // Test 7: RGB332 format - primary colors
    {
      const tw = 3, th = 1;
      const px = [
        { r: 255, g: 0, b: 0, a: 255 },     // Red
        { r: 0, g: 255, b: 0, a: 255 },     // Green
        { r: 0, g: 0, b: 255, a: 255 },     // Blue
      ];
      const rgb332Data = packRGB332(px, tw, th);
      const expect = [
        0xE0,  // Red: 111 000 00 (R=7, G=0, B=0)
        0x1C,  // Green: 000 111 00 (R=0, G=7, B=0)
        0x03   // Blue: 000 000 11 (R=0, G=0, B=3)
      ];
      results.push({ name: "RGB332 R,G,B", pass: JSON.stringify(rgb332Data) === JSON.stringify(expect), got: rgb332Data, expect });
    }

    // Test 8: GRAY4 format - grayscale values
    {
      const tw = 4, th = 1;
      const px = [
        { r: 0, g: 0, b: 0, a: 255 },       // Black (0)
        { r: 85, g: 85, b: 85, a: 255 },    // Dark gray (~5)
        { r: 170, g: 170, b: 170, a: 255 }, // Light gray (~10)
        { r: 255, g: 255, b: 255, a: 255 }, // White (15)
      ];
      const gray4Data = packGray4(px, tw, th);
      const expect = [
        0x05,  // First byte: 0000 0101 (black=0, dark gray=5)
        0xAF   // Second byte: 1010 1111 (light gray=10, white=15)
      ];
      results.push({ name: "GRAY4 grayscale", pass: JSON.stringify(gray4Data) === JSON.stringify(expect), got: gray4Data, expect });
    }

    setTestResults(results);
  };

  const testsPassed = useMemo(() => testResults.every((t) => t.pass), [testResults]);

  return {
    testResults,
    runTests,
    testsPassed
  };
}
