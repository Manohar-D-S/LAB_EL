#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// === WiFi credentials ===
const char* ssid = "Hi";
const char* password = "Baka_Baka";

// === Traffic light pins ===
const int northRed = 13, northYellow = 12, northGreen = 14;
const int eastRed  = 27, eastYellow  = 26, eastGreen  = 25;
const int southRed = 33, southYellow = 32, southGreen = 16;
const int westRed  = 19, westYellow  = 18, westGreen  = 5;

// === Web server ===
WebServer server(80);

// === State ===
volatile bool overrideActive = false;
volatile char overrideDirection = 'N'; // 'N', 'E', 'S', 'W'
unsigned long overrideStart = 0;

// Normal cycle state
char currentDirection = 'N';
unsigned long lastSwitchTime = 0;
const unsigned long greenDuration = 5000; // 5 sec green
const unsigned long yellowDuration = 2000; // 2 sec yellow
char lastPrintedDirection = '\0';

// === CORS helper ===
void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

// === Setup ===
void setup() {
  Serial.begin(115200);

  setupPins();
  connectWiFi();
  delay(5000);
  setupServer();

  Serial.println("System ready.");
}

// === Main loop ===
void loop() {
  server.handleClient();

  if (overrideActive) {
    handleOverride();
  } else {
    handleNormalCycle();
  }
}

// === Setup pins ===
void setupPins() {
  pinMode(northRed, OUTPUT); pinMode(northYellow, OUTPUT); pinMode(northGreen, OUTPUT);
  pinMode(eastRed, OUTPUT);  pinMode(eastYellow, OUTPUT);  pinMode(eastGreen, OUTPUT);
  pinMode(southRed, OUTPUT); pinMode(southYellow, OUTPUT); pinMode(southGreen, OUTPUT);
  pinMode(westRed, OUTPUT);  pinMode(westYellow, OUTPUT);  pinMode(westGreen, OUTPUT);
}

// === Connect WiFi ===
void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\nWiFi connected. IP: " + WiFi.localIP().toString());
}

// === Setup API server ===
void setupServer() {
  server.on("/proximity", HTTP_POST, handleProximity);
  server.on("/setNormal", HTTP_POST, handleSetNormal);
  server.on("/proximity", HTTP_OPTIONS, handleOptions);
  server.on("/setNormal", HTTP_OPTIONS, handleOptions);

  server.begin();
  Serial.println("HTTP server started");
}

// === Handle override logic ===
void handleOverride() {
  setAllRed();
  setGreen(overrideDirection);

  if (millis() - overrideStart > 8000) {
    overrideActive = false;
    Serial.println("Resuming normal cycle.");
    lastSwitchTime = millis(); // Reset normal cycle timing
  }
}

// === Normal traffic light cycle ===
void handleNormalCycle() {
  unsigned long now = millis();

  if (currentDirection == 'N' || currentDirection == 'E' || currentDirection == 'S' || currentDirection == 'W') {
    if (now - lastSwitchTime < greenDuration) {
      setAllRed();
      setGreen(currentDirection);
    } else if (now - lastSwitchTime < greenDuration + yellowDuration) {
      setAllRed();
      setYellow(currentDirection);
    } else {
      switch (currentDirection) {
        case 'N': currentDirection = 'E'; break;
        case 'E': currentDirection = 'S'; break;
        case 'S': currentDirection = 'W'; break;
        case 'W': currentDirection = 'N'; break;
      }
      lastSwitchTime = now;
    }
  } else {
    currentDirection = 'N';
    lastSwitchTime = now;
  }
}

// === Set all red ===
void setAllRed() {
  digitalWrite(northRed, HIGH); digitalWrite(northYellow, LOW); digitalWrite(northGreen, LOW);
  digitalWrite(eastRed, HIGH);  digitalWrite(eastYellow, LOW);  digitalWrite(eastGreen, LOW);
  digitalWrite(southRed, HIGH); digitalWrite(southYellow, LOW); digitalWrite(southGreen, LOW);
  digitalWrite(westRed, HIGH);  digitalWrite(westYellow, LOW);  digitalWrite(westGreen, LOW);
}

// === Set green ===
void setGreen(char dir) {
  if (dir != lastPrintedDirection) {
    lastPrintedDirection = dir; // Update tracker

    switch (dir) {
      case 'N': Serial.println("North GREEN"); break;
      case 'E': Serial.println("East GREEN"); break;
      case 'S': Serial.println("South GREEN"); break;
      case 'W': Serial.println("West GREEN"); break;
    }
  }

  switch (dir) {
    case 'N': digitalWrite(northRed, LOW); digitalWrite(northGreen, HIGH); break;
    case 'E': digitalWrite(eastRed, LOW); digitalWrite(eastGreen, HIGH); break;
    case 'S': digitalWrite(southRed, LOW); digitalWrite(southGreen, HIGH); break;
    case 'W': digitalWrite(westRed, LOW); digitalWrite(westGreen, HIGH); break;
  }
}

// === Set yellow ===
void setYellow(char dir) {
  switch (dir) {
    case 'N':
      digitalWrite(northGreen, LOW); digitalWrite(northYellow, HIGH);
      break;
    case 'E':
      digitalWrite(eastGreen, LOW); digitalWrite(eastYellow, HIGH);
      break;
    case 'S':
      digitalWrite(southGreen, LOW); digitalWrite(southYellow, HIGH);
      break;
    case 'W':
      digitalWrite(westGreen, LOW); digitalWrite(westYellow, HIGH);
      break;
  }
}

// === Handle /proximity (setGreen) ===
void handleProximity() {
  sendCORSHeaders(); // Add CORS headers

  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, server.arg("plain"));

  if (!error) {
    String dir = doc["direction"] | "N";
    if (dir.length() == 1) {
      overrideDirection = dir.charAt(0);
      overrideActive = true;
      overrideStart = millis();
      server.send(200, "application/json", "{\"status\":\"green set\"}");
      Serial.println("Proximity → Override GREEN ()");
    } else {
      server.send(400, "application/json", "{\"status\":\"bad direction\"}");
    }
  } else {
    server.send(400, "application/json", "{\"status\":\"bad json\"}");
  }
}

// === Handle /setNormal ===
void handleSetNormal() {
  sendCORSHeaders(); // Add CORS headers

  overrideActive = false;
  Serial.println("Manual setNormal → Back to normal cycle");
  server.send(200, "application/json", "{\"status\":\"normal cycle\"}");
}

// === CORS support ===
void handleOptions() {
  sendCORSHeaders();
  server.send(204);
}
