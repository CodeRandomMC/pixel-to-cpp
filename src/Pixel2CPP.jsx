import React, { useEffect, useMemo, useRef, useState } from "react";
import PixelCanvas from "./components/PixelCanvas.jsx";
import { clamp, transparent, black, white, rgbaEq, rgbaToHex, parseCssColor } from "./lib/colors.js";
import { pack1bit, pack1bitAlpha, packRGB565, packRGB24, packRGB332, packGray4, rgbTo332, hex565 } from "./lib/packers.js";
import { download, copyToClipboard } from "./lib/io.js";

// ---------- Component ----------
export default function Pixel2CPP() {
  // Core state (make sure w/h are defined before any use)
  const [drawMode, setDrawMode] = useState("HORIZONTAL_1BIT"); // Draw mode from dropdown
  const [outputFormat, setOutputFormat] = useState("ARDUINO_CODE"); // Output format from dropdown
  const [displayType, setDisplayType] = useState("SSD1306"); // Display-specific options
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
  const [activeTab, setActiveTab] = useState("Editor"); // Editor | Snippets | Tests

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
      if (drawMode.includes("1BIT") || drawMode.includes("ALPHA")) {
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

  // Export helpers moved to lib/packers.js

  const generateCppCode = () => {
    const safeName = name.replace(/[^a-zA-Z0-9_]/g, "_");
    
    // Determine data and format based on draw mode
    let bytes, byteStr, dataType, dataFormat;
    
    if (drawMode === "HORIZONTAL_1BIT") {
      bytes = pack1bit(data, w, h, 'horizontal');
      dataType = "uint8_t";
      dataFormat = "bits";
    } else if (drawMode === "VERTICAL_1BIT") {
      bytes = pack1bit(data, w, h, 'vertical');
      dataType = "uint8_t";
      dataFormat = "bits";
    } else if (drawMode === "HORIZONTAL_ALPHA") {
      bytes = pack1bitAlpha(data, w, h, 'horizontal');
      dataType = "uint8_t";
      dataFormat = "alpha";
    } else if (drawMode === "HORIZONTAL_RGB565") {
      bytes = packRGB565(data, w, h);
      dataType = "uint16_t";
      dataFormat = "pixels";
    } else if (drawMode === "HORIZONTAL_RGB888_24") {
      bytes = packRGB24(data, w, h);
      dataType = "uint8_t";
      dataFormat = "pixels";
    } else if (drawMode === "HORIZONTAL_RGB888_32") {
      // 32-bit RGBA format
      bytes = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = data[y * w + x];
          bytes.push(p.r, p.g, p.b, p.a);
        }
      }
      dataType = "uint8_t";
      dataFormat = "pixels";
    }
    
    // Generate byte string based on output format
    if (outputFormat === "PLAIN_BYTES") {
      return generatePlainBytes(bytes, safeName, w, h, dataType);
    } else if (outputFormat === "ARDUINO_CODE") {
      return generateArduinoCode(bytes, safeName, w, h, dataType, dataFormat, drawMode);
    } else if (outputFormat === "ARDUINO_SINGLE_BITMAP") {
      return generateArduinoSingleBitmap(bytes, safeName, w, h, dataType, dataFormat);
    } else if (outputFormat === "GFX_BITMAP_FONT") {
      return generateGFXBitmapFont(bytes, safeName, w, h);
    }
    
    // Legacy fallback for old mode system
    if (drawMode === "HORIZONTAL_1BIT") {
      byteStr = bytes.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
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
    } else if (drawMode === "HORIZONTAL_RGB565") {
      const words = packRGB565(data, w, h);
      const wordStr = words.map(hex565).join(", ");
      return `// Generated by Pixel2CPP (RGB565 for TFT displays)
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>  // Use ST7789, ILI9341, etc. for your display

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint16_t ${safeName}_pixels[] PROGMEM = {
  ${wordStr}
};

// Define pins for your display (adjust for your setup)
#define TFT_CS   10
#define TFT_RST  9
#define TFT_DC   8

Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

void setup() {
  Serial.begin(9600);
  
  // Initialize display
  tft.initR(INITR_BLACKTAB);  // Use INITR_GREENTAB, INITR_REDTAB for other variants
  tft.setRotation(0);         // Adjust rotation as needed (0-3)
  tft.fillScreen(ST77XX_BLACK);
  
  // Display the image at position (0, 0)
  drawImage(0, 0);
}

void loop() {
  // Your main code here
}

void drawImage(int16_t x0, int16_t y0) {
  // Fast method: set address window and write pixels directly
  tft.startWrite();
  tft.setAddrWindow(x0, y0, ${safeName}_w, ${safeName}_h);
  
  for (uint16_t i = 0; i < ${safeName}_w * ${safeName}_h; i++) {
    uint16_t color = pgm_read_word(&${safeName}_pixels[i]);
    tft.writePixel(color);
  }
  
  tft.endWrite();
}

/* Alternative method (slower but more flexible):
void drawImagePixelByPixel(int16_t x0, int16_t y0) {
  for (uint16_t y = 0; y < ${safeName}_h; y++) {
    for (uint16_t x = 0; x < ${safeName}_w; x++) {
      uint16_t color = pgm_read_word(&${safeName}_pixels[y * ${safeName}_w + x]);
      tft.drawPixel(x0 + x, y0 + y, color);
    }
  }
}
*/`;
    } else if (mode === "RGB24") {
      const bytes = packRGB24(data, w, h);
      const byteStr = bytes.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
      return `// Generated by Pixel2CPP (RGB24 for ESP32/high-memory displays)
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>  // Use appropriate display library

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint8_t ${safeName}_pixels[] PROGMEM = {
  ${byteStr}
};

// Define pins for your display
#define TFT_CS   10
#define TFT_RST  9
#define TFT_DC   8

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

void setup() {
  Serial.begin(9600);
  
  // Initialize display
  tft.begin();
  tft.setRotation(0);
  tft.fillScreen(ILI9341_BLACK);
  
  // Display the image
  drawImage(0, 0);
}

void loop() {
  // Your main code here
}

void drawImage(int16_t x0, int16_t y0) {
  // Convert RGB24 to RGB565 on the fly for display
  for (uint16_t y = 0; y < ${safeName}_h; y++) {
    for (uint16_t x = 0; x < ${safeName}_w; x++) {
      uint16_t index = (y * ${safeName}_w + x) * 3;
      uint8_t r = pgm_read_byte(&${safeName}_pixels[index]);
      uint8_t g = pgm_read_byte(&${safeName}_pixels[index + 1]);
      uint8_t b = pgm_read_byte(&${safeName}_pixels[index + 2]);
      
      // Convert to RGB565
      uint16_t color = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
      tft.drawPixel(x0 + x, y0 + y, color);
    }
  }
}`;
    } else if (mode === "RGB332") {
      const bytes = packRGB332(data, w, h);
      const byteStr = bytes.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
      return `// Generated by Pixel2CPP (RGB332 for low-memory/retro displays)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1331.h>  // Or other 8-bit color displays

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint8_t ${safeName}_pixels[] PROGMEM = {
  ${byteStr}
};

// Define pins for your display
#define OLED_CS   10
#define OLED_RST  9
#define OLED_DC   8

Adafruit_SSD1331 display = Adafruit_SSD1331(OLED_CS, OLED_DC, OLED_RST);

void setup() {
  Serial.begin(9600);
  
  // Initialize display
  display.begin();
  display.fillScreen(0x00);
  
  // Display the image
  drawImage(0, 0);
}

void loop() {
  // Your main code here
}

void drawImage(int16_t x0, int16_t y0) {
  for (uint16_t y = 0; y < ${safeName}_h; y++) {
    for (uint16_t x = 0; x < ${safeName}_w; x++) {
      uint8_t color332 = pgm_read_byte(&${safeName}_pixels[y * ${safeName}_w + x]);
      display.drawPixel(x0 + x, y0 + y, color332);
    }
  }
}

/* Color conversion reference:
   RGB332: RRRGGGBB (8-bit)
   - Red: 3 bits (0-7) 
   - Green: 3 bits (0-7)
   - Blue: 2 bits (0-3)
*/`;
    } else if (mode === "GRAY4") {
      const bytes = packGray4(data, w, h);
      const byteStr = bytes.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
      return `// Generated by Pixel2CPP (4-bit Grayscale for E-ink/EPD)
#include <Adafruit_GFX.h>
#include <Adafruit_EPD.h>  // Use appropriate e-ink library

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const uint8_t ${safeName}_pixels[] PROGMEM = {
  ${byteStr}
};

// Define pins for your e-ink display
#define EPD_CS     10
#define EPD_DC     8
#define EPD_RESET  9
#define EPD_BUSY   7

// Adafruit_IL0373 display(152, 152, EPD_DC, EPD_RESET, EPD_CS, SRAM_CS, EPD_BUSY);

void setup() {
  Serial.begin(9600);
  
  // Initialize e-ink display
  // display.begin();
  // display.clearBuffer();
  
  // Display the image
  drawGrayImage(0, 0);
}

void loop() {
  // E-ink displays typically don't need continuous refresh
}

void drawGrayImage(int16_t x0, int16_t y0) {
  // Extract 4-bit grayscale values and display
  for (uint16_t y = 0; y < ${safeName}_h; y++) {
    for (uint16_t x = 0; x < ${safeName}_w; x++) {
      uint16_t byteIndex = (y * ${safeName}_w + x) / 2;
      uint8_t packedByte = pgm_read_byte(&${safeName}_pixels[byteIndex]);
      
      uint8_t grayValue;
      if (x % 2 == 0) {
        grayValue = (packedByte >> 4) & 0x0F; // High nibble
      } else {
        grayValue = packedByte & 0x0F; // Low nibble
      }
      
      // Convert 4-bit (0-15) to 8-bit (0-255) for display
      uint8_t gray8 = grayValue * 17; // 15 * 17 = 255
      
      // Use appropriate display function for your e-ink library
      // display.drawPixel(x0 + x, y0 + y, gray8);
    }
  }
  
  // display.display(); // Refresh e-ink display
}

/* 4-bit Grayscale format:
   Each byte contains 2 pixels: AAAABBBB
   - High nibble (AAAA): First pixel grayscale (0-15)
   - Low nibble (BBBB): Second pixel grayscale (0-15)
   - 0 = Black, 15 = White
*/`;
    }
  };

  // Output format generators
  const generatePlainBytes = (bytes, safeName, w, h, dataType) => {
    const formatByte = (b) => dataType === "uint16_t" 
      ? "0x" + b.toString(16).toUpperCase().padStart(4, "0")
      : "0x" + b.toString(16).toUpperCase().padStart(2, "0");
    
    const byteStr = bytes.map(formatByte).join(", ");
    
    return `// Generated by Pixel2CPP - Plain bytes format
// ${w}x${h} pixels, ${bytes.length} bytes total
// Data type: ${dataType}

${byteStr}`;
  };

  const generateArduinoCode = (bytes, safeName, w, h, dataType, dataFormat, drawMode) => {
    const formatByte = (b) => dataType === "uint16_t" 
      ? "0x" + b.toString(16).toUpperCase().padStart(4, "0")
      : "0x" + b.toString(16).toUpperCase().padStart(2, "0");
    
    const byteStr = bytes.map(formatByte).join(", ");
    
    if (drawMode.includes("1BIT")) {
      return `// Generated by Pixel2CPP (${drawMode})
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const ${dataType} ${safeName}_${dataFormat}[] PROGMEM = {
  ${byteStr}
};

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.drawBitmap(0, 0, ${safeName}_${dataFormat}, ${safeName}_w, ${safeName}_h, 1);
  display.display();
}

void loop() {}`;
    } else if (drawMode.includes("RGB565")) {
      return `// Generated by Pixel2CPP (RGB565)
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const ${dataType} ${safeName}_${dataFormat}[] PROGMEM = {
  ${byteStr}
};

#define TFT_CS   10
#define TFT_RST  9
#define TFT_DC   8

Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

void setup() {
  tft.initR(INITR_BLACKTAB);
  tft.fillScreen(ST77XX_BLACK);
  drawImage(0, 0);
}

void drawImage(int16_t x0, int16_t y0) {
  tft.startWrite();
  tft.setAddrWindow(x0, y0, ${safeName}_w, ${safeName}_h);
  for (uint16_t i = 0; i < ${safeName}_w * ${safeName}_h; i++) {
    uint16_t color = pgm_read_word(&${safeName}_${dataFormat}[i]);
    tft.writePixel(color);
  }
  tft.endWrite();
}

void loop() {}`;
    } else {
      return `// Generated by Pixel2CPP (${drawMode})
#include <Adafruit_GFX.h>

const uint16_t ${safeName}_w = ${w};
const uint16_t ${safeName}_h = ${h};
const ${dataType} ${safeName}_${dataFormat}[] PROGMEM = {
  ${byteStr}
};

// Add your display setup and drawing code here`;
    }
  };

  const generateArduinoSingleBitmap = (bytes, safeName, w, h, dataType, dataFormat) => {
    const formatByte = (b) => dataType === "uint16_t" 
      ? "0x" + b.toString(16).toUpperCase().padStart(4, "0")
      : "0x" + b.toString(16).toUpperCase().padStart(2, "0");
    
    const byteStr = bytes.map(formatByte).join(", ");
    
    return `// Single bitmap array - ${safeName}
// ${w}x${h} pixels, ${bytes.length} bytes
const ${dataType} ${safeName}[] PROGMEM = { ${byteStr} };`;
  };

  const generateGFXBitmapFont = (bytes, safeName, w, h) => {
    const byteStr = bytes.map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0")).join(", ");
    
    return `// GFX Bitmap Font format - ${safeName}
#include <Adafruit_GFX.h>

const uint8_t ${safeName}Bitmaps[] PROGMEM = {
  ${byteStr}
};

const GFXglyph ${safeName}Glyphs[] PROGMEM = {
  { 0, ${w}, ${h}, ${w}, 0, 0 } // Single glyph covering entire bitmap
};

const GFXfont ${safeName} PROGMEM = {
  (uint8_t *)${safeName}Bitmaps,
  (GFXglyph *)${safeName}Glyphs,
  0, 0, ${h}
};`;
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

    // Test 1: 1-bit horizontal exact 8 pixels 10101010 → 0xAA
    {
      const tw = 8, th = 1;
      const px = [];
      for (let i = 0; i < 8; i++) px.push((i % 2 === 0) ? black() : white()); // 1,0,1,0,... (black=1)
      const bytes = pack1bit(px, tw, th, 'horizontal');
      const expect = [0xAA];
      results.push({ name: "1BIT Horizontal 8px 10101010", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 2: 1-bit horizontal width 10, row of all ones → [0xFF, 0xC0]
    {
      const tw = 10, th = 1;
      const px = Array.from({ length: tw * th }, () => black());
      const bytes = pack1bit(px, tw, th, 'horizontal');
      const expect = [0xFF, 0xC0];
      results.push({ name: "1BIT Horizontal 10px row all 1s", pass: JSON.stringify(bytes) === JSON.stringify(expect), got: bytes, expect });
    }

    // Test 3: 1-bit vertical packing
    {
      const tw = 1, th = 8;
      const px = [];
      for (let i = 0; i < 8; i++) px.push((i % 2 === 0) ? black() : white()); // 1,0,1,0,... (black=1)
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

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between gap-4 px-3 sm:px-4 py-3 border-b border-neutral-800">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Pixel2CPP — Pixel Editor → C++ Export</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <input 
              className="bg-neutral-800 rounded px-3 py-1 outline-none text-sm" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              title="Asset name" 
              placeholder="Asset name"
            />
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
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <aside className="w-80 min-w-[16rem] max-w-[22rem] bg-neutral-900 border-r border-neutral-800 p-3 space-y-3 overflow-y-auto">
            <div className="space-y-3">
              <h2 className="font-medium">Canvas</h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-2">W
                  <input type="number" min={1} max={256} value={w} onChange={(e) => setW(clamp(parseInt(e.target.value) || 1, 1, 256))} className="w-16 bg-neutral-800 rounded px-2 py-1" />
                </label>
                <label className="flex items-center gap-2">H
                  <input type="number" min={1} max={256} value={h} onChange={(e) => setH(clamp(parseInt(e.target.value) || 1, 1, 256))} className="w-16 bg-neutral-800 rounded px-2 py-1" />
                </label>
                <label className="flex items-center gap-2">Zoom
                  <input type="range" min={4} max={32} value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))} className="w-24" />
                </label>
                <div className="flex flex-wrap gap-2 w-full">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />Grid</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={mirrorX} onChange={(e) => setMirrorX(e.target.checked)} />Mirror X</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={mirrorY} onChange={(e) => setMirrorY(e.target.checked)} />Mirror Y</label>
                </div>
                <div className="space-y-2 w-full">
                  <label className="block text-sm font-medium">Draw mode:</label>
                  <select value={drawMode} onChange={(e) => setDrawMode(e.target.value)} className="w-full bg-neutral-800 rounded px-2 py-1 text-sm">
                    <option value="HORIZONTAL_1BIT">Horizontal - 1 bit per pixel</option>
                    <option value="VERTICAL_1BIT">Vertical - 1 bit per pixel</option>
                    <option value="HORIZONTAL_RGB565">Horizontal - 2 bytes per pixel (565)</option>
                    <option value="HORIZONTAL_ALPHA">Horizontal - 1 bit per pixel alpha map</option>
                    <option value="HORIZONTAL_RGB888_24">Horizontal - 3 bytes per pixel (rgb888)</option>
                    <option value="HORIZONTAL_RGB888_32">Horizontal - 4 bytes per pixel (rgba888)</option>
                  </select>
                  
                  <label className="block text-sm font-medium mt-2">Code output format:</label>
                  <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className="w-full bg-neutral-800 rounded px-2 py-1 text-sm">
                    <option value="ARDUINO_CODE">Arduino code</option>
                    <option value="PLAIN_BYTES">Plain bytes</option>
                    <option value="ARDUINO_SINGLE_BITMAP">Arduino code, single bitmap</option>
                    <option value="GFX_BITMAP_FONT">Adafruit GFXbitmapFont</option>
                  </select>
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={clearCanvas} className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Clear</button>
                  <button onClick={() => { if (canUndo) setRedo((r) => [data.map(p=>({...p})), ...r]); if (canUndo) { const last = history[history.length - 1]; setHistory((h) => h.slice(0, -1)); setData(last.map(p => ({ ...p }))); } }} disabled={!canUndo} className={`px-3 py-1.5 rounded-xl text-sm ${canUndo ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50"}`}>Undo</button>
                  <button onClick={() => { if (!canRedo) return; const [next, ...rest] = redo; setHistory((h) => [...h, data.map(p=>({...p}))]); setData(next.map(p => ({ ...p }))); setRedo(rest); }} disabled={!canRedo} className={`px-3 py-1.5 rounded-xl text-sm ${canRedo ? "bg-neutral-800 hover:bg-neutral-700" : "bg-neutral-900 opacity-50"}`}>Redo</button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-medium">Tools</h2>
              <div className="flex flex-wrap gap-2">
                {(["pen", "erase", "fill", "eyedropper"]).map((k) => (
                  <button key={k} onClick={() => setTool(k)} className={`px-3 py-1.5 rounded-xl text-sm ${tool === k ? "bg-emerald-500 text-black" : "bg-neutral-800 hover:bg-neutral-700"}`}>{k}</button>
                ))}
              </div>
              <div className="flex items-center gap-3">
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
              <div className="text-sm opacity-80">Draw mode: <span className="font-mono text-xs">{drawMode}</span></div>
              <div className="text-sm opacity-80">Output: <span className="font-mono text-xs">{outputFormat}</span></div>
              <div className="text-xs opacity-70">Tip: Right‑click draws with Secondary. Eyedropper picks Primary from canvas.</div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 flex flex-col">
            <nav className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
              {(["Editor", "Snippets", "Tests"]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-sm ${activeTab === tab ? 'bg-neutral-800' : 'hover:bg-neutral-900'}`}
                >{tab}</button>
              ))}
            </nav>
            <div className="flex-1 min-h-0 p-3 overflow-auto">
              {activeTab === 'Editor' && (
                <div className="bg-neutral-900 rounded-2xl p-4 overflow-auto inline-block">
                  <PixelCanvas
                    width={w}
                    height={h}
                    zoom={zoom}
                    pixels={data}
                    showGrid={showGrid}
                    cursor={tool === "eyedropper" ? "crosshair" : "pointer"}
                    onPointerDown={handleMouseDown}
                    onPointerMove={handleMouseMove}
                    onPointerUp={handleMouseUp}
                  />
                </div>
              )}

              {activeTab === 'Snippets' && (
                <div className="space-y-3">
                  <div className="bg-neutral-900 rounded-2xl p-4 space-y-3">
                    <h2 className="font-medium">Arduino usage snippets</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// 1-bit (SSD1306 OLED)
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

                      <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB565 (ST7735/ILI9341 TFT)
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

#define TFT_CS   10
#define TFT_RST  9  
#define TFT_DC   8

Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

void setup(){
  tft.initR(INITR_BLACKTAB);
  tft.fillScreen(ST77XX_BLACK);
  drawImage(0, 0);
}

void drawImage(int16_t x0, int16_t y0) {
  tft.startWrite();
  tft.setAddrWindow(x0, y0, ${w}, ${h});
  for (uint16_t i = 0; i < ${w} * ${h}; i++) {
    uint16_t color = pgm_read_word(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[i]);
    tft.writePixel(color);
  }
  tft.endWrite();
}

void loop(){}`}</pre>

                      <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB24 (ESP32/High Memory)
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

Adafruit_ILI9341 tft = Adafruit_ILI9341(10, 8, 9);

void setup(){
  tft.begin();
  tft.fillScreen(ILI9341_BLACK);
  drawImage(0, 0);
}

void drawImage(int16_t x0, int16_t y0) {
  for (uint16_t y = 0; y < ${h}; y++) {
    for (uint16_t x = 0; x < ${w}; x++) {
      uint16_t index = (y * ${w} + x) * 3;
      uint8_t r = pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[index]);
      uint8_t g = pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[index + 1]);
      uint8_t b = pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[index + 2]);
      uint16_t color = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
      tft.drawPixel(x0 + x, y0 + y, color);
    }
  }
}

void loop(){}`}</pre>

                      <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB332 (SSD1331/Low Memory)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1331.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

Adafruit_SSD1331 display = Adafruit_SSD1331(10, 8, 9);

void setup(){
  display.begin();
  display.fillScreen(0x00);
  drawImage(0, 0);
}

void drawImage(int16_t x0, int16_t y0) {
  for (uint16_t y = 0; y < ${h}; y++) {
    for (uint16_t x = 0; x < ${w}; x++) {
      uint8_t color332 = pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[y * ${w} + x]);
      display.drawPixel(x0 + x, y0 + y, color332);
    }
  }
}

// RGB332: RRRGGGBB (8-bit color)
void loop(){}`}</pre>

                      <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// 4-bit Grayscale (E-ink/EPD)
#include <Adafruit_GFX.h>
#include <Adafruit_EPD.h>
#include "${name.replace(/[^a-zA-Z0-9_]/g, "_")}.h"

// Adafruit_IL0373 display(152, 152, 8, 9, 10, 11, 7);

void setup(){
  // display.begin();
  // display.clearBuffer();
  drawGrayImage(0, 0);
  // display.display();
}

void drawGrayImage(int16_t x0, int16_t y0) {
  for (uint16_t y = 0; y < ${h}; y++) {
    for (uint16_t x = 0; x < ${w}; x++) {
      uint16_t byteIndex = (y * ${w} + x) / 2;
      uint8_t packedByte = pgm_read_byte(&${name.replace(/[^a-zA-Z0-9_]/g, "_")}_pixels[byteIndex]);
      uint8_t grayValue = (x % 2 == 0) ? (packedByte >> 4) : (packedByte & 0x0F);
      uint8_t gray8 = grayValue * 17;
      // display.drawPixel(x0 + x, y0 + y, gray8);
    }
  }
}

// 4-bit grayscale: 2 pixels per byte
void loop(){}`}</pre>
                    </div>
                  </div>


                </div>
              )}

              {activeTab === 'Tests' && (
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
              )}
            </div>
            <footer className="text-xs opacity-60 text-center py-2 border-t border-neutral-800">Made for makers. No tracking, all local. ✨</footer>
          </main>
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
      </div>
    </div>
  );
}
