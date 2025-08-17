/*
 * Pixel2CPP - Editor Tab Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React from "react";
import PixelCanvas from "./PixelCanvas.jsx";

/**
 * Editor Tab component containing the main canvas editor interface
 * 
 * @param {Object} props - Component props
 * @param {number} props.w - Canvas width
 * @param {number} props.h - Canvas height
 * @param {number} props.zoom - Zoom level
 * @param {Array} props.data - Pixel data array
 * @param {string} props.backgroundColor - Background color setting
 * @param {string} props.tool - Current active tool
 * @param {string} props.drawMode - Current draw mode
 * @param {Function} props.handleMouseDown - Mouse down handler
 * @param {Function} props.handleMouseMove - Mouse move handler
 * @param {Function} props.handleMouseUp - Mouse up handler
 */
export default function EditorTab({
  w,
  h,
  zoom,
  data,
  backgroundColor,
  tool,
  drawMode,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp
}) {
  return (
    <div className="space-y-4">
      {/* Canvas Container */}
      <div className="bg-neutral-900 rounded-2xl p-4 overflow-auto inline-block shadow-xl border border-neutral-700">
        <PixelCanvas
          width={w}
          height={h}
          zoom={zoom}
          pixels={data}
          backgroundColor={backgroundColor}
          cursor={tool === "eyedropper" ? "crosshair" : "pointer"}
          onPointerDown={handleMouseDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handleMouseUp}
        />
      </div>
      
      {/* Canvas Info */}
      <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-neutral-400">Canvas Size</div>
            <div className="font-mono text-white">{w} × {h} px</div>
          </div>
          <div className="text-center">
            <div className="text-neutral-400">Zoom Level</div>
            <div className="font-mono text-white">{zoom}×</div>
          </div>
          <div className="text-center">
            <div className="text-neutral-400">Active Tool</div>
            <div className="font-medium text-emerald-400 capitalize">{tool}</div>
          </div>
          <div className="text-center">
            <div className="text-neutral-400">Draw Mode</div>
            <div className="font-mono text-blue-400 text-xs">{drawMode}</div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-700">
        <h3 className="font-medium text-sm mb-3">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">B:</span>
              <span className="font-mono text-white">Brush</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">E:</span>
              <span className="font-mono text-white">Erase</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">F:</span>
              <span className="font-mono text-white">Fill</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">I:</span>
              <span className="font-mono text-white">Eyedropper</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">C:</span>
              <span className="font-mono text-white">Clear</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">X:</span>
              <span className="font-mono text-white">Swap Colors</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">Ctrl+Z:</span>
              <span className="font-mono text-white">Undo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Ctrl+Y:</span>
              <span className="font-mono text-white">Redo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Ctrl++:</span>
              <span className="font-mono text-white">Zoom In</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">Ctrl+-:</span>
              <span className="font-mono text-white">Zoom Out</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Ctrl+0:</span>
              <span className="font-mono text-white">Reset Zoom</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">RMB:</span>
              <span className="font-mono text-white">Secondary Color</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
