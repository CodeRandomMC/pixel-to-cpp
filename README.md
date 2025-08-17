# Pixel2CPP

A browser-based pixel editor that exports Arduino-ready C++ code. Create pixel art and get optimized code for:

- **1-bit packed bytes** for SSD1306 OLED displays (Adafruit_GFX drawBitmap)
- **RGB565 16-bit values** for color TFT displays (ST7735/ILI9341/etc.)
- **RGB24 24-bit values** for ESP32/high-memory color displays
- **RGB332 8-bit values** for low-memory color displays (SSD1331)
- **4-bit grayscale** for e-ink/EPD displays with 16 gray levels

## Features

- 🎨 Real-time pixel editor with drawing tools
- 🔄 Undo/redo functionality
- 🖼️ Image import with automatic scaling
- 📐 Grid overlay and zoom controls
- 🪞 Mirror drawing modes
- 🧪 Built-in test suite for validation
- 📱 Responsive design with Tailwind CSS

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the local development URL (usually `http://localhost:5173`)

## Usage

1. **Set canvas size** - Choose dimensions suitable for your display
2. **Select format** - Choose from 1-bit OLED, RGB565 TFT, RGB24, RGB332, or 4-bit grayscale
3. **Draw your sprite** - Use pen, erase, fill, or eyedropper tools
4. **Generate code** - Click "Generate Code" to see complete Arduino setup
5. **Export** - Click "Export .h" to download Arduino-ready header file
6. **Test** - Run built-in tests to validate all format conversions

## Export Formats

### 1-bit (SSD1306 OLED)
```cpp
const uint8_t sprite_bits[] PROGMEM = { 0xAA, 0x55, ... };
display.drawBitmap(x, y, sprite_bits, width, height, 1);
```

### RGB565 (ST7735/ILI9341 TFT)
```cpp
const uint16_t sprite_pixels[] PROGMEM = { 0xF800, 0x07E0, ... };
// Complete setup with tft.setAddrWindow() and fast pixel writing
```

### RGB24 (ESP32/High Memory)
```cpp
const uint8_t sprite_pixels[] PROGMEM = { 0xFF, 0x00, 0x00, ... };
// Full 24-bit color for high-quality displays
```

### RGB332 (SSD1331/Low Memory)
```cpp
const uint8_t sprite_pixels[] PROGMEM = { 0xE0, 0x1C, 0x03, ... };
// 8-bit color (3-3-2 bits for R-G-B)
```

### 4-bit Grayscale (E-ink/EPD)
```cpp
const uint8_t sprite_pixels[] PROGMEM = { 0x0F, 0xA5, ... };
// 16 grayscale levels, 2 pixels per byte
```

## Development

- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## License

MIT License - feel free to use for your projects!
