#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>

// Replace with your network credentials
const char* ssid = "Hi";
const char* password = "Baka_Baka";
const char* ip = "192.168.43.100";
const char* gateway = "192.168.43.100";
const char* subnet = "255.255.255.0";

WebServer server(80);  //Start HTTP server on port 80
#define LED_PIN 2
#define PIN_WS2812B 17   //The ESP32 pin GPIO17 connected to WS2812B
#define NUM_PIXELS 1     //The number of LEDs (pixels) on WS2812B LED strip

Adafruit_NeoPixel ws2812b(NUM_PIXELS, PIN_WS2812B, NEO_GRB + NEO_KHZ800);

void handleTrafficLightCommand() {
  if (server.hasArg("plain")) {
    String jsonData = server.arg("plain");
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, jsonData);

    if (!error) {
      const char* command = doc["command"];
      const char* signalId = doc["signal_id"];
      int duration = doc["duration"];

      Serial.print("Received command: ");
      Serial.println(command);
      Serial.print("Signal ID: ");
      Serial.println(signalId);
      Serial.print("Duration: ");
      Serial.print(duration);
      Serial.println(" seconds");

//       Turn NeoPixel yellow for 2 seconds
      ws2812b.setPixelColor(0, ws2812b.Color(255, 255, 0));  Yellow (RGB: 255, 255, 0)
      ws2812b.show();
      delay(2000);

//       Simulate turning on green light
      if (strcmp(command, "set_green") == 0) {
        digitalWrite(LED_PIN, HIGH);
        delay(duration * 1000);
        digitalWrite(LED_PIN, LOW);
      }

//       Turn NeoPixel pink for 2 seconds
      ws2812b.setPixelColor(0, ws2812b.Color(255, 105, 180));  //Pink (RGB: 255, 105, 180)
      ws2812b.show();
      delay(2000);
    }
  }

  server.send(200, "text/plain", "Request for signal change received");
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.begin(115200);

  WiFi.config(ip, gateway, subnet);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected to WiFi");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

//   Initialize NeoPixel
  ws2812b.begin();           //Initialize WS2812B strip object (REQUIRED)
  ws2812b.setBrightness(100);  //Range of 0-255

  server.on("/traffic-light-control", HTTP_POST, handleTrafficLightCommand);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}
