# Pixel2CPP

**Create pixel art and export Arduino-ready C++ code instantly**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made by CodeRandom](https://img.shields.io/badge/Made%20by-CodeRandom-blue)](https://github.com/coderandom)

Pixel2CPP is a browser-based pixel art editor designed for Arduino and embedded display development. Draw your sprites, icons, and graphics, then export them as optimized C++ arrays ready to use with popular display libraries like Adafruit_GFX.

🎮 **[Try it live](https://coderandom.com/pixel-to-cpp)** | 📖 **[Documentation](#usage-guide)** | 🐛 **[Report Issues](https://github.com/CodeRandomMC/pixel-to-cpp/issues)**

![Pixel2CPP Screenshot](https://raw.githubusercontent.com/CodeRandomMC/pixel-to-cpp/main/screenshot.png)

## ✨ Key Features

- 🎨 **Intuitive Pixel Editor** - Draw with pen, erase, fill, and eyedropper tools
- 🔄 **Smart Export Formats** - Supports 6 different display formats with optimized data structures
- 🖼️ **Image Import** - Load existing images and convert them to pixel art
- 📐 **Professional Tools** - Grid overlay, zoom, mirror drawing, undo/redo
- 🧪 **Built-in Testing** - Validate your exports with comprehensive format tests
- 📱 **Works Everywhere** - Browser-based, no installation required
- ⚡ **Instant Code** - Generate complete Arduino sketches, not just data arrays

## 🚀 Quick Start

### Using the Online Version (Recommended)
1. Open [Pixel2CPP](https://coderandom.com/pixel-to-cpp) in your browser
2. Set your canvas size to match your display
3. Choose your export format (see [Supported Formats](#supported-formats))
4. Start drawing your pixel art
5. Click "Generate Code" to see the Arduino code
6. Copy the code or download as `.h` file

### Running Locally
```bash
# Clone the repository
git clone https://github.com/CodeRandomMC/pixel-to-cpp.git
cd pixel-to-cpp

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

## 📖 Usage Guide

### 1. Setting Up Your Canvas

**Canvas Size**: Set width and height to match your display dimensions
- For SSD1306 OLED: 128x64 or 128x32
- For small TFT displays: 128x128, 160x80, 240x135
- For larger displays: 320x240, 480x320

**Draw Mode**: Choose the format that matches your display:
- **1-bit Horizontal/Vertical**: For monochrome OLED displays (SSD1306, SH1106)
- **RGB565**: For color TFT displays (ST7735, ILI9341, ST7789)
- **RGB888 24-bit**: For high-quality displays with enough memory
- **RGB888 32-bit**: For displays supporting alpha transparency
- **1-bit Alpha**: For transparency masks

### 2. Drawing Tools

| Tool | Description | Usage |
|------|-------------|--------|
| **Pen** | Draw pixels with primary color | Left-click to draw |
| **Erase** | Remove pixels (set to transparent) | Left-click to erase |
| **Fill** | Flood fill areas with color | Left-click to fill area |
| **Eyedropper** | Pick colors from the canvas | Left-click to sample color |

**Pro Tips:**
- Right-click with any tool uses the secondary color
- Enable "Mirror X" or "Mirror Y" for symmetrical drawing
- Use the zoom slider for detailed work
- Toggle grid overlay for precise pixel placement

### 3. Working with Colors

- **Primary Color**: Used with left-click
- **Secondary Color**: Used with right-click  
- **Color Picker**: Click the color squares to choose new colors
- **Swap Button**: Quickly exchange primary and secondary colors

### 4. Importing Images

1. Click "Upload Image" in the header
2. Select any image file (PNG, JPG, GIF, etc.)
3. The image will be automatically:
   - Scaled to fit your canvas
   - Centered on the canvas
   - Converted to your chosen format (e.g., 1-bit for OLED displays)

### 5. Generating Arduino Code

1. **Name Your Asset**: Enter a name in the text field (e.g., "player_sprite")
2. **Choose Output Format**:
   - **Arduino Code**: Complete sketch with setup() and display functions
   - **Plain Bytes**: Just the data array with basic code
   - **Single Bitmap**: Minimal array declaration
   - **GFX Bitmap Font**: For use with Adafruit GFX font system
3. **Generate**: Click "Generate Code" to see the result
4. **Copy or Download**: Use "Copy Code" or "Export .h" buttons

## 🖥️ Supported Formats

### 1-Bit Monochrome (SSD1306, SH1106)
**Best for**: OLED displays, e-ink, simple graphics
**Memory usage**: 1 bit per pixel
```cpp
// 64x32 sprite = 256 bytes
const uint8_t sprite_bits[] PROGMEM = { 0xFF, 0x81, 0x81, 0xFF, ... };
display.drawBitmap(x, y, sprite_bits, 64, 32, WHITE);
```

### RGB565 16-bit (ST7735, ILI9341, ST7789)
**Best for**: Color TFT displays, good balance of quality and memory
**Memory usage**: 2 bytes per pixel
```cpp
// 32x32 sprite = 2048 bytes  
const uint16_t sprite_pixels[] PROGMEM = { 0xF800, 0x07E0, 0x001F, ... };
tft.drawRGBBitmap(x, y, sprite_pixels, 32, 32);
```

### RGB888 24-bit (ESP32, High-Memory Displays)
**Best for**: High-quality color displays with sufficient memory
**Memory usage**: 3 bytes per pixel
```cpp
// 32x32 sprite = 3072 bytes
const uint8_t sprite_pixels[] PROGMEM = { 255, 0, 0, 0, 255, 0, ... };
// Convert to RGB565 on-the-fly for display
```

### RGB888 32-bit with Alpha
**Best for**: Sprites with transparency, compositing
**Memory usage**: 4 bytes per pixel
```cpp
// 32x32 sprite = 4096 bytes
const uint8_t sprite_pixels[] PROGMEM = { 255, 0, 0, 255, 0, 255, 0, 128, ... };
// Includes alpha channel for transparency
```

### 1-Bit Alpha Maps
**Best for**: Transparency masks, sprite masks
**Memory usage**: 1 bit per pixel
```cpp
const uint8_t sprite_alpha[] PROGMEM = { 0xFF, 0x00, 0x18, 0x7E, ... };
// Use for masking or transparency effects
```

## 🎯 Display Library Examples

### SSD1306 OLED (128x64)
```cpp
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "my_sprite.h"  // Generated by Pixel2CPP

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  
  // Draw your sprite at position (32, 16)
  display.drawBitmap(32, 16, my_sprite_bits, my_sprite_w, my_sprite_h, WHITE);
  display.display();
}
```

### ST7735 TFT (128x128)
```cpp
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "my_sprite.h"

#define TFT_CS   10
#define TFT_RST  9
#define TFT_DC   8

Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_RST);

void setup() {
  tft.initR(INITR_BLACKTAB);
  tft.fillScreen(ST77XX_BLACK);
  
  // Draw RGB565 sprite
  drawSprite(32, 32);
}

void drawSprite(int16_t x, int16_t y) {
  tft.startWrite();
  tft.setAddrWindow(x, y, my_sprite_w, my_sprite_h);
  for (uint16_t i = 0; i < my_sprite_w * my_sprite_h; i++) {
    tft.writePixel(pgm_read_word(&my_sprite_pixels[i]));
  }
  tft.endWrite();
}
```

## 🔍 Testing Your Exports

Pixel2CPP includes a comprehensive test suite to validate your exports:

1. Switch to the **"Tests"** tab
2. Click **"Run Tests"** 
3. Verify all format conversions pass

The tests validate:
- ✅ 1-bit horizontal and vertical packing
- ✅ RGB565 color conversion accuracy  
- ✅ RGB24 and RGB332 format correctness
- ✅ 4-bit grayscale conversion
- ✅ Alpha channel handling

## 🛠️ Tips & Best Practices

### Memory Optimization
- **Use 1-bit** for simple icons and text (smallest memory footprint)
- **Use RGB565** for colorful sprites on TFT displays (good balance)
- **Use RGB888** only when you have plenty of memory (ESP32, etc.)

### Performance Tips
- **Horizontal packing** is faster for most displays
- **Vertical packing** works better for column-oriented displays
- **Pre-load sprites** in PROGMEM to save RAM
- **Use setAddrWindow()** for fastest RGB565 drawing

### Design Guidelines
- Design at actual pixel size for crisp results
- Use high contrast for 1-bit displays
- Test with your actual hardware - emulation isn't perfect
- Keep sprites small for Arduino Uno/Nano (limited memory)

### Common Issues
- **White export**: Check your draw mode matches your display
- **Wrong colors**: Verify color format (RGB565 vs RGB888)
- **Garbled display**: Check byte order and display library compatibility
- **Memory errors**: Reduce sprite size or use more efficient format

## 📈 Updates & Changelog

### Version 1.2.0 (Latest)
- ✨ Added RGB888 32-bit format with alpha channel support
- ✨ Improved image import with automatic format conversion
- ✨ Enhanced test suite with more comprehensive validation
- 🐛 Fixed grid rendering on high-DPI displays
- 🐛 Improved memory handling for large canvases
- 🎨 Updated UI with better tool organization

### Version 1.1.0
- ✨ Added 1-bit alpha map export format
- ✨ Added GFX Bitmap Font output format
- ✨ Implemented mirror drawing modes (X and Y axis)
- ✨ Added eyedropper tool for color picking
- 🐛 Fixed undo/redo system edge cases
- 🎨 Improved responsive design for mobile devices

### Version 1.0.0
- 🎉 Initial release
- ✨ Core pixel editor with pen, erase, fill tools
- ✨ Support for 1-bit, RGB565, RGB24, RGB332, and 4-bit grayscale
- ✨ Image import functionality
- ✨ Arduino code generation
- ✨ Built-in testing framework

### Planned Features
- 🔮 Animation frame support for sprites
- 🔮 Palette-based color modes
- 🔮 Advanced dithering algorithms
- 🔮 Batch export multiple sprites
- 🔮 Custom display library templates

## 🤝 Contributing

Found a bug or have a feature request? We'd love to hear from you!

- 🐛 **Report bugs**: [Open an issue](https://github.com/CodeRandomMC/pixel-to-cpp/issues)
- 💡 **Request features**: [Start a discussion](https://github.com/CodeRandomMC/pixel-to-cpp/discussions)
- 🔧 **Submit pull requests**: Fork, branch, and PR
- 📖 **Improve docs**: Help make this guide even better

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**⚠️ Important Notice:** This software is provided **free of charge** for educational and personal use. While the MIT License allows commercial use, we strongly discourage selling or commercializing this software. This tool was created to help the Arduino and embedded development community, not for profit.

**Please respect the spirit of open source:**
- ✅ Use freely for learning and personal projects
- ✅ Modify and improve for your own needs
- ✅ Share improvements with the community
- ❌ Do not sell this software or charge for its use
- ❌ Do not redistribute for commercial gain

Made with ❤️ by **CodeRandom** for the Arduino and embedded community.

---

**Need help?** Check out our [examples](https://github.com/CodeRandomMC/pixel-to-cpp/tree/main/examples) directory or join the [community discussions](https://github.com/CodeRandomMC/pixel-to-cpp/discussions).