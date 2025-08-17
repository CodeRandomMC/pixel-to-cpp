/*
 * Pixel2CPP - Main Application Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React, { useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import EditorTab from "./components/EditorTab.jsx";
import SnippetsTab from "./components/SnippetsTab.jsx";
import TestsTab from "./components/TestsTab.jsx";
import CodeModal from "./components/CodeModal.jsx";
import { useCanvasState } from "./hooks/useCanvasState.js";
import { useCodeGeneration } from "./hooks/useCodeGeneration.js";
import { useTests } from "./hooks/useTests.js";
import { black, white, parseCssColor } from "./lib/colors.js";

/**
 * Main Pixel2CPP application component
 * 
 * This component orchestrates the entire pixel art editor application,
 * managing state and coordinating between different UI components.
 */
export default function Pixel2CPP() {
  // Core state
  const [drawMode, setDrawMode] = useState("HORIZONTAL_1BIT");
  const [outputFormat, setOutputFormat] = useState("ARDUINO_CODE");
  const [displayType, setDisplayType] = useState("SSD1306");
  const [zoom, setZoom] = useState(8);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [tool, setTool] = useState("pen");
  const [primary, setPrimary] = useState(black());
  const [secondary, setSecondary] = useState(white());
  const [name, setName] = useState("sprite");
  const [backgroundColor, setBackgroundColor] = useState("transparent");
  const [activeTab, setActiveTab] = useState("Editor");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Custom hooks
  const canvasState = useCanvasState(64, 64, backgroundColor, setBackgroundColor);
  const codeGeneration = useCodeGeneration();
  const tests = useTests();

  // Pointer handling
  const isMouseDown = useRef(false);

  /**
   * Get mouse coordinates relative to canvas
   * @param {MouseEvent} e - Mouse event
   * @returns {Object} Coordinates and bounds check
   */
  const getXY = (e) => {
    const host = (e.target.closest('[data-canvas]'));
    if (!host) return { x: -1, y: -1, inBounds: false };
    const rect = host.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    const inBounds = x >= 0 && y >= 0 && x < canvasState.w && y < canvasState.h;
    return { x, y, inBounds };
  };

  /**
   * Handle pointer actions (drawing, erasing)
   * @param {MouseEvent} e - Mouse event
   */
  const handlePointerAction = (e) => {
    const { x, y, inBounds } = getXY(e);
    if (!inBounds) return;
    const button = (e.buttons & 2) ? "right" : "left";
    const color = button === "left" ? primary : secondary;
    if (tool === "pen") canvasState.drawAt(x, y, color, false, mirrorX, mirrorY);
    else if (tool === "erase") canvasState.drawAt(x, y, color, true, mirrorX, mirrorY);
  };

  /**
   * Handle mouse down events
   * @param {MouseEvent} e - Mouse event
   */
  const handleMouseDown = (e) => {
    isMouseDown.current = true;
    if (tool === "fill") {
      const { x, y, inBounds } = getXY(e);
      if (!inBounds) return;
      canvasState.pushHistory(canvasState.data);
      const color = (e.buttons & 2) ? secondary : primary;
      canvasState.floodFill(x, y, canvasState.data[canvasState.idx(x, y)], color);
    } else if (tool === "eyedropper") {
      const { x, y, inBounds } = getXY(e);
      if (!inBounds) return;
      setPrimary(canvasState.data[canvasState.idx(x, y)]);
      setTool("pen");
    } else {
      canvasState.pushHistory(canvasState.data);
      handlePointerAction(e);
    }
  };

  /**
   * Handle mouse move events
   * @param {MouseEvent} e - Mouse event
   */
  const handleMouseMove = (e) => {
    if (isMouseDown.current && (tool === "pen" || tool === "erase")) {
      handlePointerAction(e);
    }
  };

  /**
   * Handle mouse up events
   */
  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  // Global mouse up handler
  useEffect(() => {
    const onWinUp = () => (isMouseDown.current = false);
    window.addEventListener("mouseup", onWinUp);
    return () => window.removeEventListener("mouseup", onWinUp);
  }, []);

  /**
   * Import image and fit to canvas
   * @param {File} file - Image file to import
   */
  const importImage = (file) => {
    const img = new Image();
    img.onload = () => {
      const cnv = document.createElement("canvas");
      cnv.width = canvasState.w; 
      cnv.height = canvasState.h;
      const ctx = cnv.getContext("2d");
      const scale = Math.min(canvasState.w / img.width, canvasState.h / img.height);
      const dw = Math.max(1, Math.floor(img.width * scale));
      const dh = Math.max(1, Math.floor(img.height * scale));
      const dx = Math.floor((canvasState.w - dw) / 2);
      const dy = Math.floor((canvasState.h - dh) / 2);
      ctx.clearRect(0, 0, canvasState.w, canvasState.h);
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
      const id = ctx.getImageData(0, 0, canvasState.w, canvasState.h).data;
      const out = Array.from({ length: canvasState.w * canvasState.h }, (_, i) => ({
        r: id[i * 4],
        g: id[i * 4 + 1],
        b: id[i * 4 + 2],
        a: id[i * 4 + 3],
      }));
      if (drawMode.includes("1BIT") || drawMode.includes("ALPHA")) {
        for (let i = 0; i < out.length; i++) {
          const p = out[i];
          const luma = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
          out[i] = luma > 127 ? white() : black();
        }
      }
      canvasState.pushHistory(canvasState.data);
      canvasState.setData(out);
    };
    img.src = URL.createObjectURL(file);
  };

  /**
   * Swap primary and secondary colors
   */
  const swapColors = () => {
    setPrimary((p) => ({ ...secondary }));
    setSecondary((s) => ({ ...primary }));
  };

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasState.undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        canvasState.redoAction();
      }

      // Tool shortcuts
      if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b': // Brush/Pen tool
            e.preventDefault();
            setTool("pen");
            break;
          case 'e': // Erase tool
            e.preventDefault();
            setTool("erase");
            break;
          case 'f': // Fill tool
            e.preventDefault();
            setTool("fill");
            break;
          case 'i': // Eyedropper tool
            e.preventDefault();
            setTool("eyedropper");
            break;
          case 'c': // Clear canvas
            e.preventDefault();
            canvasState.clearCanvas();
            break;
          case 'x': // Swap colors
            e.preventDefault();
            swapColors();
            break;
        }
      }

      // Zoom shortcuts
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            setZoom(prev => Math.min(32, prev + 1));
            break;
          case '-':
            e.preventDefault();
            setZoom(prev => Math.max(4, prev - 1));
            break;
          case '0':
            e.preventDefault();
            setZoom(8);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState, tool, primary, secondary]);

  // Wrapper functions for code generation
  const handleGenerateCode = () => {
    codeGeneration.handleGenerateCode();
  };

  const handleCopyCode = () => {
    codeGeneration.handleCopyCode(drawMode, outputFormat, canvasState.w, canvasState.h, canvasState.data, name);
  };

  const exportCpp = () => {
    codeGeneration.exportCpp(drawMode, outputFormat, canvasState.w, canvasState.h, canvasState.data, name);
  };

  const generateCppCode = () => {
    return codeGeneration.generateCppCode(drawMode, outputFormat, canvasState.w, canvasState.h, canvasState.data, name);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <Header 
          name={name}
          setName={setName}
          importImage={importImage}
          handleGenerateCode={handleGenerateCode}
          exportCpp={exportCpp}
          isGenerating={codeGeneration.isGenerating}
        />

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <Sidebar
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            tool={tool}
            setTool={setTool}
            primary={primary}
            setPrimary={setPrimary}
            secondary={secondary}
            setSecondary={setSecondary}
            swapColors={swapColors}
            w={canvasState.w}
            setW={canvasState.setW}
            h={canvasState.h}
            setH={canvasState.setH}
            zoom={zoom}
            setZoom={setZoom}
            drawMode={drawMode}
            setDrawMode={setDrawMode}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            clearCanvas={canvasState.clearCanvas}
            canUndo={canvasState.canUndo}
            undo={canvasState.undo}
            mirrorX={mirrorX}
            setMirrorX={setMirrorX}
            mirrorY={mirrorY}
            setMirrorY={setMirrorY}
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
          />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Tab Navigation */}
            <nav className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3 bg-neutral-900/50">
              {(["Editor", "Snippets", "Tests"]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                  aria-label={`Switch to ${tab} tab`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            <div className="flex-1 min-h-0 p-4 overflow-auto">
              {activeTab === 'Editor' && (
                <EditorTab
                  w={canvasState.w}
                  h={canvasState.h}
                  zoom={zoom}
                  data={canvasState.data}
                  backgroundColor={backgroundColor}
                  tool={tool}
                  drawMode={drawMode}
                  handleMouseDown={handleMouseDown}
                  handleMouseMove={handleMouseMove}
                  handleMouseUp={handleMouseUp}
                />
              )}

              {activeTab === 'Snippets' && (
                <SnippetsTab
                  name={name}
                  w={canvasState.w}
                  h={canvasState.h}
                />
              )}

              {activeTab === 'Tests' && (
                <TestsTab
                  testResults={tests.testResults}
                  runTests={tests.runTests}
                  testsPassed={tests.testsPassed}
                />
              )}
            </div>

            {/* Footer */}
            <footer className="text-xs opacity-60 text-center py-3 border-t border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center justify-center gap-4">
                <span>Made for makers. No tracking, all local. ✨</span>
                <span>•</span>
                <a href="https://coderandom.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Made by CodeRandom
                </a>
              </div>
            </footer>
          </main>
        </div>

        {/* Code Modal */}
        <CodeModal
          showCodeModal={codeGeneration.showCodeModal}
          setShowCodeModal={codeGeneration.setShowCodeModal}
          handleCopyCode={handleCopyCode}
          copyStatus={codeGeneration.copyStatus}
          generateCppCode={generateCppCode}
        />
      </div>
    </div>
  );
}
