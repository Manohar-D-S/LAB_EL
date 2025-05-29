#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <TFT_eSPI.h>

// Replace with your network credentials
const char* ssid = "Hi";
const char* password = "Baka_Baka";
const char* ip = "192.168.43.101"; // Different IP for ESP32_2
const char* gateway = "192.168.43.1";
const char* subnet = "255.255.255.0";

WebServer server(80);  // Start HTTP server on port 80
TFT_eSPI tft = TFT_eSPI();

void handleLogMessage() {
  if (server.hasArg("plain")) {
    String jsonData = server.arg("plain");
    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, jsonData);

    if (!error) {
      const char* message = doc["message"];
      Serial.print("[ESP32_2 LOG] ");
      Serial.println(message);
      // Display the message on TFT
      tft.fillScreen(TFT_WHITE);
      tft.setTextColor(TFT_BLACK);
      tft.setTextSize(2);
      tft.setCursor(2, 2);
      tft.println("setup success");
      tft.setCursor(50, 100);
      tft.setTextColor(TFT_RED);
      tft.setTextSize(3);
      tft.println("RV-IOT-Board");
      tft.setCursor(10, 180);
      tft.setTextColor(TFT_BLUE);
      tft.setTextSize(2);
      tft.println(message);
    }
  }
  server.send(200, "text/plain", "Log message received");
}

void setup() {
  tft.init();
  tft.setRotation(3); // Adjust the rotation if necessary (0 to 3)
  Serial.begin(115200);
  Serial.println("hello...");
  tft.fillScreen(TFT_WHITE);
  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(2);
  tft.setCursor(2, 2);
  tft.println("setup success");
  tft.setCursor(50, 100);
  tft.setTextColor(TFT_RED);
  tft.setTextSize(3);
  tft.println("RV-IOT-Board");

  WiFi.config(ip, gateway, subnet);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");
  int wifi_attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
    wifi_attempts++;
    if (wifi_attempts % 10 == 0) {
      Serial.print(" [Still connecting...]");
    }
  }

  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  server.on("/log-message", HTTP_POST, handleLogMessage);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}
