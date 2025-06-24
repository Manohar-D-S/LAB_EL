#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// Network credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Traffic light pins
#define RED_PIN 14
#define YELLOW_PIN 12
#define GREEN_PIN 13

// Signal ID for this ESP32
const char* SIGNAL_ID = "Unnamed";

// Server
WebServer server(80);
unsigned long greenStartTime = 0;
unsigned long greenDuration = 0;
bool isGreenActive = false;
String currentState = "RED"; // RED, GREEN, YELLOW

void setup() {
  Serial.begin(115200);
  
  // Setup pins
  pinMode(RED_PIN, OUTPUT);
  pinMode(YELLOW_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  
  // Initial state (red)
  digitalWrite(RED_PIN, HIGH);
  digitalWrite(YELLOW_PIN, LOW);
  digitalWrite(GREEN_PIN, LOW);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Setup server endpoints
  server.on("/proximity", HTTP_POST, handleProximity);
  server.on("/control", HTTP_POST, handleControl);
  server.on("/status", HTTP_GET, handleStatus);
  
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
  
  // Check if green light duration is over
  if (isGreenActive && (millis() - greenStartTime >= greenDuration)) {
    isGreenActive = false;
    setNormalOperation();
  }
}

void handleProximity() {
  String jsonData = server.arg("plain");
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, jsonData);
  
  if (!error) {
    float distance = doc["distance"];
    
    Serial.print("Ambulance proximity: ");
    Serial.println(distance);
    
    // Auto-switch to green if ambulance is very close (50m)
    if (distance <= 50) {
      turnGreen(15000); // 15 seconds green
    }
  }
  
  server.send(200, "application/json", "{\"status\":\"ok\"}");
}

void handleControl() {
  String jsonData = server.arg("plain");
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, jsonData);
  
  if (!error) {
    String action = doc["action"];
    
    if (action == "turn_green") {
      int duration = doc["duration"];
      turnGreen(duration * 1000); // Convert to milliseconds
      server.send(200, "application/json", "{\"status\":\"ok\",\"action\":\"turned_green\"}");
    } 
    else if (action == "normal_operation") {
      setNormalOperation();
      server.send(200, "application/json", "{\"status\":\"ok\",\"action\":\"normal_operation\"}");
    }
    else {
      server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"Invalid action\"}");
    }
  } else {
    server.send(400, "application/json", "{\"status\":\"error\",\"message\":\"Invalid JSON\"}");
  }
}

void handleStatus() {
  String response = "{\"signal_id\":\"";
  response += SIGNAL_ID;
  response += "\",\"status\":\"";
  response += currentState;
  response += "\",\"green_active\":";
  response += isGreenActive ? "true" : "false";
  response += "}";
  
  server.send(200, "application/json", response);
}

void turnGreen(unsigned long duration) {
  // Yellow transition
  digitalWrite(RED_PIN, LOW);
  digitalWrite(YELLOW_PIN, HIGH);
  digitalWrite(GREEN_PIN, LOW);
  delay(1000); // 1 second yellow
  
  // Turn green
  digitalWrite(RED_PIN, LOW);
  digitalWrite(YELLOW_PIN, LOW);
  digitalWrite(GREEN_PIN, HIGH);
  
  greenStartTime = millis();
  greenDuration = duration;
  isGreenActive = true;
  currentState = "GREEN";
  
  Serial.print("Green light activated for ");
  Serial.print(duration / 1000);
  Serial.println(" seconds");
}

void setNormalOperation() {
  // Back to red
  digitalWrite(RED_PIN, HIGH);
  digitalWrite(YELLOW_PIN, LOW);
  digitalWrite(GREEN_PIN, LOW);
  currentState = "RED";
  Serial.println("Back to normal operation (RED)");
}
