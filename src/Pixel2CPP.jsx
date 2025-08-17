import React, { useEffect, useMemo, useRef, useState } from "react";

// =============================================================
// Pixel2CPP — Browser pixel editor that exports Arduino-ready C++
// - 1-bit packed bytes for SSD1306 (Adafruit_GFX drawBitmap)
// - RGB565 16-bit values for color TFTs (ILI9341/ST7735/etc.)
//
// Includes a tiny built-in test runner to validate packing logic.
// =============================================================

// ---------- Helpers (plain JS, no TS) ----------
const clamp = (n, min = 0, max = 255) => Math.max(min, Math.min(max, n));
const transparent = () => ({ r: 0, g: 0, b: 0, a: 0 });
const black = () => ({ r: 0, g: 0, b: 0, a: 255 });
const white = () => ({ r: 255, g: 255, b: 255, a: 255 });
const rgbaEq = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
const pixelToCss = (p) => `rgba(${p.r},${p.g},${p.b},${(p.a ?? 255) / 255})`;
const rgbaToHex = (p) => {
  const to2 = (v) => v.toString(16).padStart(2, "0");
  return `#${to2(p.r)}${to2(p.g)}${to2(p.b)}`;
};

function parseCssColor(css) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
  return { r, g, b, a };
}

function rgbTo565(r, g, b) {
  const R = (r >> 3) & 0x1f;
  const G = (g >> 2) & 0x3f;
  const B = (b >> 3) & 0x1f;
  return (R << 11) | (G << 5) | B; // 0..65535
}
function hex565(v) {
  return "0x" + v.toString(16).toUpperCase().padStart(4, "0");
}

function download(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// Copy to clipboard helper
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
}

// ---------- Component ----------
export default function Pixel2CPP() {
  // Core state (make sure w/h are defined before any use)
  const [mode, setMode] = useState("1BIT"); // "1BIT" | "RGB565" | "BMP"
  const [board, setBoard] = useState("ESP8266"); // "ESP8266" | "ESP32" | "Arduino"
  const [w, setW] = useState(64);
  const [h, setH] = useState(64);
  const [zoom, setZoom] = useState(8); // pixel size in CSS px
  const [showGrid, setShowGrid] = useState(true);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [tool, setTool] = useState("pen"); // pen | erase | fill | eyedropper
  const [primary, setPrimary] = useState(black());
  const [secondary, setSecondary] = useState(white());
  const [name, setName] = useState("sprite");

  // UI state
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState(""); // "", "copied", "error"
  const [isGenerating, setIsGenerating] = useState(false);

  // Pixel buffer
  const [data, setData] = useState(() => Array.from({ length: w * h }, () => transparent()));
  const prevSize = useRef({ w, h });

  // History
  const [history, setHistory] = useState([]); // array of pixel arrays (deep copies)
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
  }, [w, h]);

  const idx = (x, y) => y * w + x;

  // Drawing helpers
  const drawAt = (x, y, pix, erase = false) => {
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

  // Pointer
  const canvasRef = useRef(null);
  const isMouseDown = useRef(false);

  const getXY = (e) => {
    const host = (e.target.closest('[data-canvas]'));
    if (!host) return { x: -1, y: -1, inBounds: false };
    const rect = host.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    const inBounds = x >= 0 && y >= 0 && x < w && y < h;
    return { x, y, inBounds };
  };

  const handlePointerAction = (e) => {
    const { x, y, inBounds } = getXY(e);
    if (!inBounds) return;
    const button = (e.buttons & 2) ? "right" : "left";
    const color = button === "left" ? primary : secondary;
    if (tool === "pen") drawAt(x, y, color, false);
    else if (tool === "erase") drawAt(x, y, color, true);
  };

  const handleMouseDown = (e) => {
    isMouseDown.current = true;
    if (tool === "fill") {
      const { x, y, inBounds } = getXY(e);
      if (!inBounds) return;
      pushHistory(data);
      const color = (e.buttons & 2) ? secondary : primary;
      floodFill(x, y, data[idx(x, y)], color);
    } else if (tool === "eyedropper") {
      const { x, y, inBounds } = getXY(e);
      if (!inBounds) return;
      setPrimary(data[idx(x, y)]);
      setTool("pen");
    } else {
      pushHistory(data);
      handlePointerAction(e);
    }
  };

  const handleMouseMove = (e) => {
    if (isMouseDown.current && (tool === "pen" || tool === "erase")) {
      handlePointerAction(e);
    }
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  useEffect(() => {
    const onWinUp = () => (isMouseDown.current = false);
    window.addEventListener("mouseup", onWinUp);
    return () => window.removeEventListener("mouseup", onWinUp);
  }, []);

  // Import image → fit and (optionally) threshold to 1-bit
  const importImage = (file) => {
    const img = new Image();
    img.onload = () => {
      const cnv = document.createElement("canvas");
      cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext("2d");
      const scale = Math.min(w / img.width, h / img.height);
      const dw = Math.max(1, Math.floor(img.width * scale));
      const dh = Math.max(1, Math.floor(img.height * scale));
      const dx = Math.floor((w - dw) / 2);
      const dy = Math.floor((h - dh) / 2);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
      const id = ctx.getImageData(0, 0, w, h).data;
      const out = Array.from({ length: w * h }, (_, i) => ({
        r: id[i * 4],
        g: id[i * 4 + 1],
        b: id[i * 4 + 2],
        a: id[i * 4 + 3],
      }));
      if (mode === "1BIT") {
        for (let i = 0; i < out.length; i++) {
          const p = out[i];
          const luma = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
          out[i] = luma > 127 ? white() : black();
        }
      }
      pushHistory(data);
      setData(out);
    };
    img.src = URL.createObjectURL(file);
  };

  // Export helpers
  const pack1bit = (pixels, width, height) => {
    const bytes = [];
    const I = (x, y) => y * width + x;
    for (let y = 0; y < height; y++) {
      let bit = 7;
      let cur = 0;
      for (let x = 0; x < width; x++) {
        const p = pixels[I(x, y)];
        const on = p.a > 0 && (p.r + p.g + p.b) > (255 * 3) / 2; // lighter pixel → 1 (white = on)
        if (on) cur |= 1 << bit;
        bit--;
        if (bit < 0) {
          bytes.push(cur);
          cur = 0;
          bit = 7;
        }
      }
      if (bit !== 7) bytes.push(cur); // flush partial byte per row
    }
    return bytes;
  };

  const packRGB565 = (pixels, width, height) => {
    const out = [];
    const I = (x, y) => y * width + x;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = pixels[I(x, y)];
        out.push(p.a < 10 ? 0 : rgbTo565(p.r, p.g, p.b));
      }
    }
    return out;
  };

  const packBMP = (pixels, width, height) => {
    const out = [];
    const I = (x, y) => y * width + x;
    // BMP format: bottom-up, BGR color order
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const p = pixels[I(x, y)];
        if (p.a < 10) {
          // Transparent pixel - use black
          out.push(0, 0, 0);
        } else {
          // BMP uses BGR order
          out.push(p.b, p.g, p.r);
        }
      }
      // Add padding to make row length multiple of 4
      const padding = (4 - ((width * 3) % 4)) % 4;
      for (let i = 0; i < padding; i++) {
        out.push(0);
      }
    }
    return out;
  };

  const generateCppCode = () => {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, "_");
    if (mode === "1BIT") {
      const bytes = pack1bit(data, w, h);
      const byteStr = bytes.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
      return `// Generated by Pixel2CPP (1-bit)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint8_t ${safeName}_bits[] PROGMEM = {
  ${byteStr}
};

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup(){
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.drawBitmap(0, 0, ${safeName}_bits, ${safeName}_w, ${safeName}_h, 1);
  display.display();
}

void loop(){}`;
    } else if (mode === "RGB565") {
      const words = packRGB565(data, w, h);
      const wordStr = words.map(hex565).join(", ");
      return `// Generated by Pixel2CPP (RGB565)
#include <Arduino.h>
#include <avr/pgmspace.h>

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint16_t ${safeName}_pixels[] PROGMEM = {
  ${wordStr}
};

/* Example draw (Adafruit_GFX):
  for (uint16_t y=0; y<${safeName}_h; y++) {
    tft.startWrite();
    tft.setAddrWindow(x, y0 + y, ${safeName}_w, 1);
    for (uint16_t x0=0; x0<${safeName}_w; x0++) {
      uint16_t c = pgm_read_word(&${safeName}_pixels[y*${safeName}_w + x0]);
      tft.writePixel(c);
    }
    tft.endWrite();
  }
*/`;
    } else if (mode === "BMP") {
      const bmpData = packBMP(data, w, h);
      const byteStr = bmpData.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
      const dataSize = bmpData.length;
      const fileSize = 54 + dataSize; // 54 bytes header + data
      const headerSize = 40; // BITMAPINFOHEADER size
      const planes = 1;
      const bitsPerPixel = 24;
      const compression = 0; // BI_RGB
      const imageSize = dataSize;
      const xPixelsPerM = 2835; // 72 DPI
      const yPixelsPerM = 2835; // 72 DPI
      const colorsUsed = 0;
      const importantColors = 0;
      
      const boardSpecificCode = board === "ESP8266" ? `// Generated by Pixel2CPP (BMP format for ${board})
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <avr/pgmspace.h>` : 
      board === "ESP32" ? `// Generated by Pixel2CPP (BMP format for ${board})
#include <WiFi.h>
#include <WebServer.h>
#include <avr/pgmspace.h>` :
      `// Generated by Pixel2CPP (BMP format for ${board})
#include <Arduino.h>
#include <avr/pgmspace.h>`;

      return `${boardSpecificCode}

// BMP Header (54 bytes)
const uint8_t ${safeName}_bmp_header[] PROGMEM = {
  // File header (14 bytes)
  0x42, 0x4D, // Signature "BM"
  ${(fileSize & 0xFF)}, ${((fileSize >> 8) & 0xFF)}, ${((fileSize >> 16) & 0xFF)}, ${((fileSize >> 24) & 0xFF)}, // File size
  0x00, 0x00, // Reserved
  0x00, 0x00, // Reserved
  0x36, 0x00, 0x00, 0x00, // Data offset (54 bytes)
  
  // Info header (40 bytes)
  ${(headerSize & 0xFF)}, ${((headerSize >> 8) & 0xFF)}, ${((headerSize >> 16) & 0xFF)}, ${((headerSize >> 24) & 0xFF)}, // Header size
  ${(w & 0xFF)}, ${((w >> 8) & 0xFF)}, ${((w >> 16) & 0xFF)}, ${((w >> 24) & 0xFF)}, // Width
  ${(h & 0xFF)}, ${((h >> 8) & 0xFF)}, ${((h >> 16) & 0xFF)}, ${((h >> 24) & 0xFF)}, // Height
  ${(planes & 0xFF)}, ${((planes >> 8) & 0xFF)}, // Planes
  ${(bitsPerPixel & 0xFF)}, ${((bitsPerPixel >> 8) & 0xFF)}, // Bits per pixel
  ${(compression & 0xFF)}, ${((compression >> 8) & 0xFF)}, ${((compression >> 16) & 0xFF)}, ${((compression >> 24) & 0xFF)}, // Compression
  ${(imageSize & 0xFF)}, ${((imageSize >> 8) & 0xFF)}, ${((imageSize >> 16) & 0xFF)}, ${((imageSize >> 24) & 0xFF)}, // Image size
  ${(xPixelsPerM & 0xFF)}, ${((xPixelsPerM >> 8) & 0xFF)}, ${((xPixelsPerM >> 16) & 0xFF)}, ${((xPixelsPerM >> 24) & 0xFF)}, // X pixels per meter
  ${(yPixelsPerM & 0xFF)}, ${((yPixelsPerM >> 8) & 0xFF)}, ${((yPixelsPerM >> 16) & 0xFF)}, ${((yPixelsPerM >> 24) & 0xFF)}, // Y pixels per meter
  ${(colorsUsed & 0xFF)}, ${((colorsUsed >> 8) & 0xFF)}, ${((colorsUsed >> 16) & 0xFF)}, ${((colorsUsed >> 24) & 0xFF)}, // Colors used
  ${(importantColors & 0xFF)}, ${((importantColors >> 8) & 0xFF)}, ${((importantColors >> 16) & 0xFF)}, ${((importantColors >> 24) & 0xFF)} // Important colors
};

// BMP Image data (${dataSize} bytes)
const uint8_t ${safeName}_bmp_data[] PROGMEM = {
  ${byteStr}
};

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint32_t ${safeName}_data_size = ${dataSize};

/* Example usage for ${board}:
${board === "ESP8266" ? `// ESP8266 Web Server Example
ESP8266WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin("your_ssid", "your_password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
  
  // Setup web server routes
  server.on("/bmp", handleBMP);
  server.begin();
}

void loop() {
  server.handleClient();
}

void handleBMP() {
  server.setHeader("Content-Type", "image/bmp");
  server.setHeader("Content-Disposition", "inline; filename=${safeName}.bmp");
  
  // Send BMP header
  for (int i = 0; i < 54; i++) {
    server.client().write(pgm_read_byte(&${safeName}_bmp_header[i]));
  }
  // Send BMP data
  for (int i = 0; i < ${safeName}_data_size; i++) {
    server.client().write(pgm_read_byte(&${safeName}_bmp_data[i]));
  }
}` : 
board === "ESP32" ? `// ESP32 Web Server Example
WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin("your_ssid", "your_password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
  
  // Setup web server routes
  server.on("/bmp", handleBMP);
  server.begin();
}

void loop() {
  server.handleClient();
}

void handleBMP() {
  server.setHeader("Content-Type", "image/bmp");
  server.setHeader("Content-Disposition", "inline; filename=${safeName}.bmp");
  
  // Send BMP header
  for (int i = 0; i < 54; i++) {
    server.write(pgm_read_byte(&${safeName}_bmp_header[i]));
  }
  // Send BMP data
  for (int i = 0; i < ${safeName}_data_size; i++) {
    server.write(pgm_read_byte(&${safeName}_bmp_data[i]));
  }
}` :
`// Arduino Example - Copy image data to Serial
void setup() {
  Serial.begin(9600);
  
  // Print BMP header
  Serial.println("BMP Header:");
  for (int i = 0; i < 54; i++) {
    Serial.print("0x");
    Serial.print(pgm_read_byte(&${safeName}_bmp_header[i]), HEX);
    Serial.print(", ");
    if ((i + 1) % 16 == 0) Serial.println();
  }
  Serial.println();
  
  // Print BMP data
  Serial.println("BMP Data:");
  for (int i = 0; i < ${safeName}_data_size; i++) {
    Serial.print("0x");
    Serial.print(pgm_read_byte(&${safeName}_bmp_data[i]), HEX);
    Serial.print(", ");
    if ((i + 1) % 16 == 0) Serial.println();
  }
  Serial.println();
  Serial.println("Image dimensions: " + String(${safeName}_w) + "x" + String(${safeName}_h));
}

void loop() {
  // Your main code here
}`}
*/`;
    }
  };

  const exportCpp = () => {
    const code = generateCppCode();
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, "_");
    download(`${safeName}.h`, code);
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setShowCodeModal(true);
    setIsGenerating(false);
  };

  const handleCopyCode = async () => {
    const code = generateCppCode();
    const success = await copyToClipboard(code);
    setCopyStatus(success ? "copied" : "error");
    setTimeout(() => setCopyStatus(""), 2000);
  };

  const clearCanvas = () => {
    pushHistory(data);
    setData(Array.from({ length: w * h }, () => transparent()));
  };

  const swapColors = () => {
    setPrimary((p) => ({ ...secondary }));
    setSecondary((s) => ({ ...primary }));
  };

  // ---------- Built-in tests ----------
  const [testResults, setTestResults] = useState([]);
  const runTests = () => {
    const results = [];

    // Test 1: 1-bit exact 8 pixels 10101010 → 0xAA
    {
      const tw = 8, th = 1;
      const px = [];
      for (let i = 0; i < 8; i++) px.push((i % 2 === 0) ? black() : white()); // 1,0,1,0,... (black=1)
      const bytes = pack1bit(px, tw, th);
      const expect = [0xAA];
      results.push({ name: "1BIT 8px 10101010", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 2: 1-bit width 10, row of all ones → [0xFF, 0xC0]
    {
      const tw = 10, th = 1;
      const px = Array.from({ length: tw * th }, () => black());
      const bytes = pack1bit(px, tw, th);
      const expect = [0xFF, 0xC0];
      results.push({ name: "1BIT 10px row all 1s", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 3: RGB565 primary colors
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

    // Test 4: BMP format - 2x2 image with RGB colors
    {
      const tw = 2, th = 2;
      const px = [
        { r: 255, g: 0, b: 0, a: 255 },     // Red
        { r: 0, g: 255, b: 0, a: 255 },     // Green
        { r: 0, g: 0, b: 255, a: 255 },     // Blue
        { r: 255, g: 255, b: 255, a: 255 }, // White
      ];
      const bmpData = packBMP(px, tw, th);
      // BMP is bottom-up, so rows are reversed
      // Row 1 (bottom): Blue, White (BGR order) + 2 bytes padding
      // Row 2 (top): Red, Green (BGR order) + 2 bytes padding
      const expect = [
        255, 0, 0,    // Blue (B=255, G=0, R=0)
        255, 255, 255, // White (B=255, G=255, R=255)
        0, 0,         // Padding for 4-byte alignment
        0, 0, 255,    // Red (B=0, G=0, R=255)
        0, 255, 0,    // Green (B=0, G=255, R=0)
        0, 0          // Padding for 4-byte alignment
      ];
      results.push({ name: "BMP 2x2 RGB", pass: JSON.stringify(bmpData) === JSON.stringify(expect), got: bmpData, expect });
    }

    setTestResults(results);
  };

  const testsPassed = useMemo(() => testResults.every((t) => t.pass), [testResults]);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Pixel2CPP — Pixel Editor → C++ Export</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <input 
              className="bg-neutral-800 rounded px-3 py-1 outline-none text-sm" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              title="Asset name" 
              placeholder="Asset name"
            />
            <div className="flex gap-2">
              <label className="px-3 py-1.5 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 cursor-pointer text-sm">
                Upload Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importImage(f); }} 
                  className="hidden"
                />
              </label>
              <button 
                onClick={handleGenerateCode} 
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isGenerating ? "Generating..." : "Generate Code"}
              </button>
              <button 
                onClick={exportCpp} 
                className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-medium hover:brightness-110 text-sm"
              >
                Export .h
              </button>
            </div>
          </div>
        </header>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-neutral-900 rounded-2xl p-3 space-y-3">
            <h2 className="font-medium">Canvas</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex items-center gap-2">W
                <input type="number" min={1} max={256} value={w} onChange={(e) => setW(clamp(parseInt(e.target.value) || 1, 1, 256))} className="w-16 bg-neutral-800 rounded px-2 py-1" />
              </label>
              <label className="flex items-center gap-2">H
                <input type="number" min={1} max={256} value={h} onChange={(e) => setH(clamp(parseInt(e.target.value) || 1, 1, 256))} className="w-16 bg-neutral-800 rounded px-2 py-1" />
              </label>
              <label className="flex items-center gap-2">Zoom
                <input type="range" min={4} max={32} value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))} className="w-20" />
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Grid</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={mirrorX} onChange={(e) => setMirrorX(e.target.checked)} />Mirror X</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={mirrorY} onChange={(e) => setMirrorY(e.target.checked)} />Mirror Y</label>
              </div>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="bg-neutral-800 rounded px-2 py-1 text-sm">
                <option value="1BIT">1-bit (OLED/SSD1306)</option>
                <option value="RGB565">RGB565 (TFT)</option>
                <option value="BMP">BMP (ESP8266/ESP32)</option>
              </select>
              {mode === "BMP" && (
                <select value={board} onChange={(e) => setBoard(e.target.value)} className="bg-neutral-800 rounded px-2 py-1 text-sm">
                  <option value="ESP8266">ESP8266</option>
                  <option value="ESP32">ESP32</option>
                  <option value="Arduino">Arduino</option>
                </select>
              )}
              <div className="flex gap-2">
                <button onClick={clearCanvas} className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Clear</button>
                <button onClick={() => { if (canUndo) setRedo((r) => [data.map(p=>({...p})), ...r]); if (canUndo) { const last = history[history.length - 1]; setHistory((h) => h.slice(0, -1)); setData(last.map(p => ({ ...p }))); } }} disabled={!canUndo} className={`px-3 py-1.5 rounded-xl text-sm ${canUndo ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50"}`}>Undo</button>
                <button onClick={() => { if (!canRedo) return; const [next, ...rest] = redo; setHistory((h) => [...h, data.map(p=>({...p}))]); setData(next.map(p => ({ ...p }))); setRedo(rest); }} disabled={!canRedo} className={`px-3 py-1.5 rounded-xl text-sm ${canRedo ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50"}`}>Redo</button>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-2xl p-3 space-y-3">
            <h2 className="font-medium">Tools</h2>
            <div className="flex flex-wrap gap-2">
              {(["pen", "erase", "fill", "eyedropper"]).map((k) => (
                <button key={k} onClick={() => setTool(k)} className={`px-3 py-1.5 rounded-xl text-sm ${tool === k ? "bg-emerald-500 text-black" : "bg-neutral-800 hover:bg-neutral-700"}`}>{k}</button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-xs opacity-70">Primary</div>
                  <input type="color" value={rgbaToHex(primary)} onChange={(e) => setPrimary(parseCssColor(e.target.value))} className="w-10 h-8 bg-neutral-800 rounded" />
                </div>
                <div>
                  <div className="text-xs opacity-70">Secondary (RMB)</div>
                  <input type="color" value={rgbaToHex(secondary)} onChange={(e) => setSecondary(parseCssColor(e.target.value))} className="w-10 h-8 bg-neutral-800 rounded" />
                </div>
                <button onClick={swapColors} className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Swap</button>
              </div>
              <div className="text-sm opacity-80">Mode: <span className="font-mono">{mode}</span></div>
            </div>
            <div className="text-xs opacity-70">Tip: Right‑click draws with Secondary. Eyedropper picks Primary from canvas.</div>
          </div>


        </div>

        {/* Canvas */}
        <div className="bg-neutral-900 rounded-2xl p-4 overflow-auto">
          <div
            data-canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { isMouseDown.current = false; }}
            onContextMenu={(e) => { e.preventDefault(); }}
            className="inline-block"
            style={{
              width: w * zoom,
              height: h * zoom,
              background: "transparent",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
              position: "relative",
              imageRendering: "pixelated",
              cursor: tool === "eyedropper" ? "crosshair" : "pointer",
            }}
          >
            {/* pixels */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${w}, 1fr)` }}>
              {data.map((p, i) => (
                <div
                  key={i}
                  style={{ width: zoom, height: zoom, background: p.a === 0 ? "transparent" : pixelToCss(p) }}
                />
              ))}
            </div>
            {/* grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundSize: `${zoom}px ${zoom}px`,
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`
              }} />
            )}
          </div>
        </div>

        {/* Code Modal */}
        {showCodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-900 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Generated C++ Code</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${
                      copyStatus === "copied" 
                        ? "bg-green-500 text-white" 
                        : copyStatus === "error"
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Error!" : "Copy Code"}
                  </button>
                  <button
                    onClick={() => setShowCodeModal(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <pre className="bg-neutral-950 rounded-xl p-4 overflow-auto text-xs whitespace-pre-wrap">
                  {generateCppCode()}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Snippets */}
        <div className="bg-neutral-900 rounded-2xl p-4 space-y-3">
          <h2 className="font-medium">Arduino usage snippets</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// 1-bit (SSD1306 OLED 128x64)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup(){
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.drawBitmap(0, 0, ${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bits, ${w}, ${h}, 1);
  display.display();
}

void loop(){}`}</pre>

            <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB565 (e.g., ST7735/ILI9341 TFT)
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

Adafruit_ILI9341 tft = Adafruit_ILI9341(10, 9); // example pins

void setup(){
  tft.begin();
  tft.fillScreen(ILI9341_BLACK);
  for (uint16_t y=0; y<${h}; y++) {
    tft.startWrite();
    tft.setAddrWindow(0, y, ${w}, 1);
    for (uint16_t x=0; x<${w}; x++) {
      uint16_t c = pgm_read_word(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[y*${w} + x]);
      tft.writePixel(c);
    }
    tft.endWrite();
  }
}

void loop(){}`}</pre>
          </div>
          
          {mode === "BMP" && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">BMP Format Examples for {board}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {board === "ESP8266" ? (
                  <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// ESP8266 Web Server Example
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

ESP8266WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin("your_ssid", "your_password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
  
  // Setup web server routes
  server.on("/bmp", handleBMP);
  server.begin();
}

void loop() {
  server.handleClient();
}

void handleBMP() {
  server.setHeader("Content-Type", "image/bmp");
  server.setHeader("Content-Disposition", "inline; filename=${name.replace(/[^a-zA-Z0-9_]/g, "_")}.bmp");
  
  // Send BMP header
  for (int i = 0; i < 54; i++) {
    server.client().write(pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bmp_header[i]));
  }
  // Send BMP data
  for (int i = 0; i < ${name.replace(/[^a-zA-Z0-9_]/g, "_")}_data_size; i++) {
    server.client().write(pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bmp_data[i]));
  }
}`}</pre>
                ) : board === "ESP32" ? (
                  <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// ESP32 Web Server Example
#include <WiFi.h>
#include <WebServer.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin("your_ssid", "your_password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
  
  // Setup web server routes
  server.on("/bmp", handleBMP);
  server.begin();
}

void loop() {
  server.handleClient();
}

void handleBMP() {
  server.setHeader("Content-Type", "image/bmp");
  server.setHeader("Content-Disposition", "inline; filename=${name.replace(/[^a-zA-Z0-9_]/g, "_")}.bmp");
  
  // Send BMP header
  for (int i = 0; i < 54; i++) {
    server.write(pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bmp_header[i]));
  }
  // Send BMP data
  for (int i = 0; i < ${name.replace(/[^a-zA-Z0-9_]/g, "_")}_data_size; i++) {
    server.write(pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bmp_data[i]));
  }
}`}</pre>
                ) : (
                  <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// Arduino Example - Copy image data to Serial
#include <Arduino.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

void setup() {
  Serial.begin(9600);
  
  // Print BMP header
  Serial.println("BMP Header:");
  for (int i = 0; i < 54; i++) {
    Serial.print("0x");
    Serial.print(pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bmp_header[i]), HEX);
    Serial.print(", ");
    if ((i + 1) % 16 == 0) Serial.println();
  }
  Serial.println();
  
  // Print BMP data
  Serial.println("BMP Data:");
  for (int i = 0; i < ${name.replace(/[^a-zA-Z0-9_]/g, "_")}_data_size; i++) {
    Serial.print("0x");
    Serial.print(pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_bmp_data[i]), HEX);
    Serial.print(", ");
    if ((i + 1) % 16 == 0) Serial.println();
  }
  Serial.println();
  Serial.println("Image dimensions: " + String(${name.replace(/[^a-zA-Z0-9_]/g, "_")}_w) + "x" + String(${name.replace(/[^a-zA-Z0-9_]/g, "_")}_h));
}

void loop() {
  // Your main code here
}`}</pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tests */}
        <div className="bg-neutral-900 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Built-in Tests</h2>
            <button onClick={runTests} className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Run Tests</button>
          </div>
          {testResults.length > 0 && (
            <div className="space-y-2 text-sm">
              {testResults.map((t, i) => (
                <div key={i} className={`p-2 rounded-xl ${t.pass ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'}`}>
                  <div className="font-medium">{t.pass ? 'PASS' : 'FAIL'} — {t.name}</div>
                  {!t.pass && (
                    <div className="opacity-70 font-mono">
                      got: {JSON.stringify(t.got)}; expected: {JSON.stringify(t.expect)}
                    </div>
                  )}
                </div>
              ))}
              <div className={`p-2 rounded-xl ${testsPassed ? 'bg-emerald-800/30 text-emerald-200' : 'bg-rose-800/30 text-rose-200'}`}>
                Overall: {testsPassed ? '✅ All tests passed' : '❌ Some tests failed'}
              </div>
            </div>
          )}
          {testResults.length === 0 && (
            <div className="text-xs opacity-70">Click "Run Tests" to validate 1‑bit packing and RGB565 conversion.</div>
          )}
        </div>

        <footer className="text-xs opacity-60 text-center">Made for makers. No tracking, all local. ✨</footer>
      </div>
    </div>
  );
}
