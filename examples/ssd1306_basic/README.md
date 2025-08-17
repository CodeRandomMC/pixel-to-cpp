# SSD1306 Basic Example

This example demonstrates how to display a sprite generated with Pixel2CPP on an SSD1306 OLED display.

## Hardware Requirements

- Arduino Uno, Nano, or Pro Mini
- SSD1306 OLED Display (128x64 or 128x32)
- I2C connection (SDA, SCL pins)

## Wiring

Connect your SSD1306 OLED display to your Arduino:

| OLED Display | Arduino |
|--------------|---------|
| VCC          | 3.3V    |
| GND          | GND     |
| SDA          | A4      |
| SCL          | A5      |

## Libraries Required

Install these libraries through the Arduino Library Manager:

1. **Adafruit GFX Library**
2. **Adafruit SSD1306**

## Setup Instructions

1. **Generate your sprite** using Pixel2CPP:
   - Set canvas size to match your display (128x64 or 128x32)
   - Choose "1-bit Horizontal" or "1-bit Vertical" format
   - Draw your sprite
   - Export as "Arduino Code" or "Plain Bytes"

2. **Copy the generated file**:
   - Copy the generated `.h` file to this directory
   - Rename it to `my_sprite.h` or update the include statement in the sketch

3. **Update the sketch**:
   - If you used a different filename, update the `#include "my_sprite.h"` line
   - Update the sprite variable names if needed (e.g., `my_sprite_bits`, `my_sprite_w`, `my_sprite_h`)

4. **Upload to Arduino**:
   - Connect your Arduino
   - Select the correct board and port
   - Upload the sketch

## Expected Output

The sprite should appear centered on the OLED display. Open the Serial Monitor (9600 baud) to see status messages.

## Troubleshooting

- **Display not working**: Check wiring and I2C address (default is 0x3C)
- **Wrong sprite size**: Make sure your sprite dimensions match the display
- **Garbled display**: Verify you're using the correct format (1-bit for SSD1306)
- **Memory errors**: Reduce sprite size or use more efficient packing

## Customization

- Change the display position by modifying the `x` and `y` variables
- Add multiple sprites by including additional sprite files
- Create animations by changing sprite position in the `loop()` function
