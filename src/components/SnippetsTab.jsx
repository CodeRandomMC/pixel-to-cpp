/*
 * Pixel2CPP - Snippets Tab Component
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

import React from "react";

/**
 * Snippets Tab component containing Arduino usage code examples
 * 
 * @param {Object} props - Component props
 * @param {string} props.name - Current asset name
 * @param {number} props.w - Canvas width
 * @param {number} props.h - Canvas height
 */
export default function SnippetsTab({ name, w, h }) {
  const safeName = name.replace(/[^a-zA-Z0-9_]/g, "_");
  
  return (
    <div className="space-y-3">
      <div className="bg-neutral-900 rounded-2xl p-4 space-y-3">
        <h2 className="font-medium">Arduino usage snippets</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// 1-bit (SSD1306 OLED)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "${safeName}.h"

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup(){
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.drawBitmap(0, 0, ${safeName}_bits, ${w}, ${h}, 1);
  display.display();
}

void loop(){}`}</pre>

          <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB565 (ST7735/ILI9341 TFT)
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include "${safeName}.h"

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
    uint16_t color = pgm_read_word(&${safeName}_pixels[i]);
    tft.writePixel(color);
  }
  tft.endWrite();
}

void loop(){}`}</pre>

          <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB24 (ESP32/High Memory)
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include "${safeName}.h"

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
      uint8_t r = pgm_read_byte(&${safeName}_pixels[index]);
      uint8_t g = pgm_read_byte(&${safeName}_pixels[index + 1]);
      uint8_t b = pgm_read_byte(&${safeName}_pixels[index + 2]);
      uint16_t color = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
      tft.drawPixel(x0 + x, y0 + y, color);
    }
  }
}

void loop(){}`}</pre>

          <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// RGB332 (SSD1331/Low Memory)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1331.h>
#include "${safeName}.h"

Adafruit_SSD1331 display = Adafruit_SSD1331(10, 8, 9);

void setup(){
  display.begin();
  display.fillScreen(0x00);
  drawImage(0, 0);
}

void drawImage(int16_t x0, int16_t y0) {
  for (uint16_t y = 0; y < ${h}; y++) {
    for (uint16_t x = 0; x < ${w}; x++) {
      uint8_t color332 = pgm_read_byte(&${safeName}_pixels[y * ${w} + x]);
      display.drawPixel(x0 + x, y0 + y, color332);
    }
  }
}

// RGB332: RRRGGGBB (8-bit color)
void loop(){}`}</pre>

          <pre className="bg-neutral-950 rounded-xl p-3 overflow-auto text-xs">{`// 4-bit Grayscale (E-ink/EPD)
#include <Adafruit_GFX.h>
#include <Adafruit_EPD.h>
#include "${safeName}.h"

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
      uint8_t packedByte = pgm_read_byte(&${safeName}_pixels[byteIndex]);
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
  );
}
