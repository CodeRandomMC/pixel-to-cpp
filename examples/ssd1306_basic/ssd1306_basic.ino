/*
 * Pixel2CPP - SSD1306 Basic Example
 * 
 * This example demonstrates how to display a sprite generated with Pixel2CPP
 * on an SSD1306 OLED display.
 * 
 * Hardware:
 * - Arduino Uno/Nano/Pro Mini
 * - SSD1306 OLED Display (128x64 or 128x32)
 * - I2C connection (SDA, SCL)
 * 
 * Libraries Required:
 * - Adafruit_GFX
 * - Adafruit_SSD1306
 * 
 * Instructions:
 * 1. Generate your sprite using Pixel2CPP
 * 2. Copy the generated .h file to this directory
 * 3. Update the #include statement below to use your sprite file
 * 4. Update the sprite name variables to match your sprite
 */

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "my_sprite.h"  // Replace with your generated sprite file

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void setup() {
  Serial.begin(9600);
  
  // Initialize the OLED display
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }
  
  Serial.println(F("SSD1306 initialized successfully"));
  
  // Clear the display
  display.clearDisplay();
  
  // Draw your sprite at the center of the screen
  int16_t x = (SCREEN_WIDTH - my_sprite_w) / 2;
  int16_t y = (SCREEN_HEIGHT - my_sprite_h) / 2;
  
  display.drawBitmap(x, y, my_sprite_bits, my_sprite_w, my_sprite_h, WHITE);
  
  // Update the display
  display.display();
  
  Serial.println(F("Sprite displayed successfully"));
}

void loop() {
  // The sprite is displayed once and stays on screen
  // Add any additional functionality here
  delay(1000);
}
