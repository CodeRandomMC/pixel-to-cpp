# Pixel2CPP

A browser-based pixel editor that exports Arduino-ready C++ code. Create pixel art and get optimized code for:

- **1-bit packed bytes** for SSD1306 OLED displays (Adafruit_GFX drawBitmap)
- **RGB565 16-bit values** for color TFT displays (ILI9341/ST7735/etc.)

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
2. **Select mode** - 1-bit for OLED, RGB565 for color TFT
3. **Draw your sprite** - Use pen, erase, fill, or eyedropper tools
4. **Export** - Click "Export .h" to download Arduino-ready header file
5. **Test** - Run built-in tests to validate packing logic

## Export Formats

### 1-bit (OLED/SSD1306)
```cpp
const uint8_t sprite_bits[] PROGMEM = { 0xAA, 0x55, ... };
display.drawBitmap(x, y, sprite_bits, width, height, 1);
```

### RGB565 (TFT/ILI9341)
```cpp
const uint16_t sprite_pixels[] PROGMEM = { 0xF800, 0x07E0, ... };
// Use with tft.setAddrWindow() and tft.writePixel()
```

## Development

- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## License

MIT License - feel free to use for your projects!
