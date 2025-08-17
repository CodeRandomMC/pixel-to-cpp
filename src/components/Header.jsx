/*
 * Pixel2CPP - Header Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React from "react";

/**
 * Header component containing branding and main action buttons
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - Current asset name
 * @param {Function} props.setName - Function to update asset name
 * @param {Function} props.importImage - Function to handle image import
 * @param {Function} props.handleGenerateCode - Function to generate C++ code
 * @param {Function} props.exportCpp - Function to export as header file
 * @param {boolean} props.isGenerating - Whether code generation is in progress
 */
export default function Header({ 
  name, 
  setName, 
  importImage, 
  handleGenerateCode, 
  exportCpp, 
  isGenerating 
}) {
  return (
    <header className="bg-gradient-to-r from-neutral-900 to-neutral-800 border-b border-neutral-700">
      <div className="flex items-center justify-between gap-4 px-3 sm:px-4 py-4">
        {/* Logo and Title Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P2C</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Pixel2CPP
              </h1>
              <p className="text-xs text-neutral-400 -mt-1">
                Made by <a href="https://coderandom.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">CodeRandom</a>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <input 
            className="bg-neutral-800 rounded px-3 py-1 outline-none text-sm border border-neutral-700 focus:border-blue-500 transition-colors" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            title="Asset name" 
            placeholder="Asset name"
            aria-label="Asset name for exported code"
          />
          <label className="px-3 py-1.5 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 cursor-pointer text-sm transition-colors">
            Upload Image
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importImage(f); }} 
              className="hidden"
              aria-label="Upload image file"
            />
          </label>
          <button 
            onClick={handleGenerateCode} 
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            aria-label="Generate C++ code"
          >
            {isGenerating ? "Generating..." : "Generate Code"}
          </button>
          <button 
            onClick={exportCpp} 
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-medium hover:brightness-110 text-sm transition-colors"
            aria-label="Export as header file"
          >
            Export .h
          </button>
        </div>
      </div>
    </header>
  );
}
