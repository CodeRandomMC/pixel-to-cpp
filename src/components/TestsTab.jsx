/*
 * Pixel2CPP - Tests Tab Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React from "react";
import { pack1bit, pack1bitAlpha, packRGB565, packRGB24, packRGB332, packGray4 } from "../lib/packers.js";
import { black, white } from "../lib/colors.js";

/**
 * Tests Tab component containing built-in format conversion tests
 * 
 * @param {Object} props - Component props
 * @param {Array} props.testResults - Array of test results
 * @param {Function} props.runTests - Function to run tests
 * @param {boolean} props.testsPassed - Whether all tests passed
 */
export default function TestsTab({ testResults, runTests, testsPassed }) {
  return (
    <div className="bg-neutral-900 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Built-in Tests</h2>
        <button onClick={runTests} className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Run Tests</button>
      </div>
      {testResults.length > 0 && (
        <div className="space-y-2 text-sm">
          {testResults.map((t, i) => (
            <div key={i} className={`${t.pass ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'} p-2 rounded-xl`}>
              <div className="font-medium">{t.pass ? 'PASS' : 'FAIL'} — {t.name}</div>
              {!t.pass && (
                <div className="opacity-70 font-mono">
                  got: {JSON.stringify(t.got)}; expected: {JSON.stringify(t.expect)}
                </div>
              )}
            </div>
          ))}
          <div className={`${testsPassed ? 'bg-emerald-800/30 text-emerald-200' : 'bg-rose-800/30 text-rose-200'} p-2 rounded-xl`}>
            Overall: {testsPassed ? '✅ All tests passed' : '❌ Some tests failed'}
          </div>
        </div>
      )}
      {testResults.length === 0 && (
        <div className="text-xs opacity-70">Click "Run Tests" to validate 1‑bit, RGB565, RGB24, RGB332, and 4‑bit grayscale format conversions.</div>
      )}
    </div>
  );
}
