# Pixel2CPP Examples

This directory contains example Arduino sketches and code snippets demonstrating how to use sprites and graphics generated with Pixel2CPP.

## Examples

### Basic Examples
- `ssd1306_basic/` - Basic sprite display on SSD1306 OLED
- `st7735_basic/` - Basic sprite display on ST7735 TFT
- `ili9341_basic/` - Basic sprite display on ILI9341 TFT

### Advanced Examples
- `sprite_animation/` - Animated sprites with multiple frames
- `transparent_sprites/` - Using alpha channel for transparency
- `sprite_masks/` - Using 1-bit alpha maps for masking

## Getting Started

1. Generate your sprite using Pixel2CPP
2. Copy the generated `.h` file to the appropriate example directory
3. Update the example code to use your sprite name
4. Upload to your Arduino board

## Display Libraries Used

- **Adafruit_GFX** - Core graphics library
- **Adafruit_SSD1306** - For OLED displays
- **Adafruit_ST7735** - For ST7735 TFT displays
- **Adafruit_ILI9341** - For ILI9341 TFT displays

## Contributing

Feel free to add your own examples! Please follow the existing directory structure and include a README for each example.
