/*
 * Pixel2CPP - Sidebar Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React from "react";
import { clamp, rgbaToHex, parseCssColor } from "../lib/colors.js";

/**
 * Sidebar component containing all tools, settings, and controls
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.sidebarCollapsed - Whether sidebar is collapsed
 * @param {Function} props.setSidebarCollapsed - Function to toggle sidebar collapse
 * @param {string} props.tool - Current active tool
 * @param {Function} props.setTool - Function to set active tool
 * @param {Object} props.primary - Primary color object
 * @param {Function} props.setPrimary - Function to set primary color
 * @param {Object} props.secondary - Secondary color object
 * @param {Function} props.setSecondary - Function to set secondary color
 * @param {Function} props.swapColors - Function to swap primary and secondary colors
 * @param {number} props.w - Canvas width
 * @param {Function} props.setW - Function to set canvas width
 * @param {number} props.h - Canvas height
 * @param {Function} props.setH - Function to set canvas height
 * @param {number} props.zoom - Zoom level
 * @param {Function} props.setZoom - Function to set zoom level
 * @param {string} props.drawMode - Current draw mode
 * @param {Function} props.setDrawMode - Function to set draw mode
 * @param {string} props.outputFormat - Current output format
 * @param {Function} props.setOutputFormat - Function to set output format
 * @param {Function} props.clearCanvas - Function to clear canvas
 * @param {boolean} props.canUndo - Whether undo is available
 * @param {Function} props.undo - Function to undo last action
 * @param {boolean} props.mirrorX - Whether X mirroring is enabled
 * @param {Function} props.setMirrorX - Function to set X mirroring
 * @param {boolean} props.mirrorY - Whether Y mirroring is enabled
 * @param {Function} props.setMirrorY - Function to set Y mirroring
 * @param {string} props.backgroundColor - Current background color setting
 * @param {Function} props.setBackgroundColor - Function to set background color
 */
export default function Sidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  tool,
  setTool,
  primary,
  setPrimary,
  secondary,
  setSecondary,
  swapColors,
  w,
  setW,
  h,
  setH,
  zoom,
  setZoom,
  drawMode,
  setDrawMode,
  outputFormat,
  setOutputFormat,
  clearCanvas,
  canUndo,
  undo,
  mirrorX,
  setMirrorX,
  mirrorY,
  setMirrorY,
  backgroundColor,
  setBackgroundColor
}) {
  return (
    <aside className={`${sidebarCollapsed ? 'w-16' : 'w-80'} min-w-0 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300`}>
      {/* Sidebar Header with Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        {!sidebarCollapsed && (
          <h2 className="font-semibold text-lg">Tools & Settings</h2>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? "→" : "←"}
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!sidebarCollapsed && (
          <>
            {/* Quick Tools */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Quick Tools</h3>
              <div className="grid grid-cols-2 gap-2">
                {(["pen", "erase", "fill", "eyedropper"]).map((k) => (
                  <button 
                    key={k} 
                    onClick={() => setTool(k)} 
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      tool === k 
                        ? "bg-emerald-500 text-black shadow-lg" 
                        : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                    }`}
                    aria-label={`Select ${k} tool`}
                  >
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Colors</h3>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Primary</span>
                  <input 
                    type="color" 
                    value={rgbaToHex(primary)} 
                    onChange={(e) => setPrimary(parseCssColor(e.target.value))} 
                    className="w-12 h-10 bg-neutral-800 rounded-lg border border-neutral-700 cursor-pointer" 
                    aria-label="Primary color picker"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Secondary</span>
                  <input 
                    type="color" 
                    value={rgbaToHex(secondary)} 
                    onChange={(e) => setSecondary(parseCssColor(e.target.value))} 
                    className="w-12 h-10 bg-neutral-800 rounded-lg border border-neutral-700 cursor-pointer" 
                    aria-label="Secondary color picker"
                  />
                </div>
                <button 
                  onClick={swapColors} 
                  className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs transition-colors self-end"
                  aria-label="Swap primary and secondary colors"
                >
                  Swap
                </button>
              </div>
            </div>

            {/* Canvas Settings */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Canvas</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Width</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={256} 
                    value={w} 
                    onChange={(e) => setW(clamp(parseInt(e.target.value) || 1, 1, 256))} 
                    className="w-full bg-neutral-800 rounded px-2 py-1 text-xs border border-neutral-700 focus:border-blue-500 transition-colors" 
                    aria-label="Canvas width in pixels"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-neutral-400">Height</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={256} 
                    value={h} 
                    onChange={(e) => setH(clamp(parseInt(e.target.value) || 1, 1, 256))} 
                    className="w-full bg-neutral-800 rounded px-2 py-1 text-xs border border-neutral-700 focus:border-blue-500 transition-colors" 
                    aria-label="Canvas height in pixels"
                  />
                </label>
              </div>
              
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">Zoom: {zoom}×</span>
                <input 
                  type="range" 
                  min={4} 
                  max={32} 
                  value={zoom} 
                  onChange={(e) => setZoom(parseInt(e.target.value))} 
                  className="w-full" 
                  aria-label="Canvas zoom level"
                />
              </label>
            </div>

            {/* Export Settings */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Export</h3>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">Format</span>
                <select 
                  value={drawMode} 
                  onChange={(e) => setDrawMode(e.target.value)} 
                  className="w-full bg-neutral-800 rounded px-2 py-1 text-xs border border-neutral-700 focus:border-purple-500 transition-colors"
                  aria-label="Select draw mode"
                >
                  <option value="HORIZONTAL_1BIT">1-bit (SSD1306)</option>
                  <option value="VERTICAL_1BIT">1-bit Vertical</option>
                  <option value="HORIZONTAL_RGB565">RGB565 (TFT)</option>
                  <option value="HORIZONTAL_ALPHA">Alpha Map</option>
                  <option value="HORIZONTAL_RGB888_24">RGB24 (24-bit)</option>
                  <option value="HORIZONTAL_RGB888_32">RGBA32 (32-bit)</option>
                  <option value="HORIZONTAL_RGB332">RGB332 (8-bit)</option>
                  <option value="HORIZONTAL_GRAY4">GRAY4 (4-bit)</option>
                </select>
              </label>
              
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-400">Output</span>
                <select 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value)} 
                  className="w-full bg-neutral-800 rounded px-2 py-1 text-xs border border-neutral-700 focus:border-purple-500 transition-colors"
                  aria-label="Select output format"
                >
                  <option value="ARDUINO_CODE">Arduino Code</option>
                  <option value="PLAIN_BYTES">Plain Bytes</option>
                  <option value="ARDUINO_SINGLE_BITMAP">Single Bitmap</option>
                  <option value="GFX_BITMAP_FONT">GFX Font</option>
                </select>
              </label>
            </div>

            {/* Canvas Actions */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={clearCanvas} 
                  className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs transition-colors"
                  aria-label="Clear canvas"
                >
                  Clear
                </button>
                <button 
                  onClick={undo} 
                  disabled={!canUndo} 
                  className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                    canUndo 
                      ? "bg-neutral-800 hover:bg-neutral-700" 
                      : "bg-neutral-900 opacity-50 cursor-not-allowed"
                  }`}
                  aria-label="Undo last action"
                >
                  Undo
                </button>
              </div>
            </div>

            {/* Canvas Options */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Options</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={mirrorX} 
                    onChange={(e) => setMirrorX(e.target.checked)} 
                    className="w-3 h-3 text-blue-500 bg-neutral-800 border-neutral-700 rounded focus:ring-blue-500"
                    aria-label="Mirror drawing horizontally"
                  />
                  <span className="text-xs">Mirror X</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={mirrorY} 
                    onChange={(e) => setMirrorY(e.target.checked)} 
                    className="w-3 h-3 text-blue-500 bg-neutral-800 border-neutral-700 rounded focus:ring-blue-500"
                    aria-label="Mirror drawing vertically"
                  />
                  <span className="text-xs">Mirror Y</span>
                </label>
              </div>
            </div>

            {/* Background */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-neutral-300">Background</h3>
              <div className="grid grid-cols-2 gap-2">
                {["black", "white", "transparent"].map((bg) => (
                  <label key={bg} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="backgroundColor" 
                      value={bg} 
                      checked={backgroundColor === bg} 
                      onChange={(e) => setBackgroundColor(e.target.value)} 
                      className="w-3 h-3 text-blue-500 bg-neutral-800 border-neutral-700 focus:ring-blue-500"
                      aria-label={`${bg} background`}
                    />
                    <span className="text-xs capitalize">{bg}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-neutral-400 bg-neutral-800/50 p-2 rounded">
                <div className="font-medium mb-1">Background color fills transparent areas:</div>
                <div>• Black: Transparent areas become black pixels</div>
                <div>• White: Transparent areas become white pixels</div>
                <div>• Transparent: Keeps transparent areas (alpha = 0)</div>
              </div>
            </div>
          </>
        )}

        {/* Collapsed Sidebar Icons */}
        {sidebarCollapsed && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {(["pen", "erase", "fill", "eyedropper"]).map((k) => (
                <button 
                  key={k} 
                  onClick={() => setTool(k)} 
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    tool === k 
                      ? "bg-emerald-500 text-black shadow-lg" 
                      : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                  }`}
                  title={k.charAt(0).toUpperCase() + k.slice(1)}
                  aria-label={`Select ${k} tool`}
                >
                  {k === "pen" ? "🖊️" : k === "erase" ? "🧽" : k === "fill" ? "🪣" : "👁️"}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col gap-2">
              <input 
                type="color" 
                value={rgbaToHex(primary)} 
                onChange={(e) => setPrimary(parseCssColor(e.target.value))} 
                className="w-8 h-8 bg-neutral-800 rounded-lg border border-neutral-700 cursor-pointer" 
                title="Primary color"
                aria-label="Primary color picker"
              />
              <input 
                type="color" 
                value={rgbaToHex(secondary)} 
                onChange={(e) => setSecondary(parseCssColor(e.target.value))} 
                className="w-8 h-8 bg-neutral-800 rounded-lg border border-neutral-700 cursor-pointer" 
                title="Secondary color"
                aria-label="Secondary color picker"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
