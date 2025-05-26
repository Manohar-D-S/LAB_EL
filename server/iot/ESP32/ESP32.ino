#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

// Replace with your network credentials
const char* ssid = "Hi";
const char* password = "Baka_Baka";
const char* ip = "192.168.43.100";
const char* gateway = "192.168.43.100";
const char* subnet = "255.255.255.0";

WebServer server(80);  //Start HTTP server on port 80

// GPIO mapping for each direction and color
#define RED_NORTH    13
#define YELLOW_NORTH 12
#define GREEN_NORTH  14

#define RED_EAST     27
#define YELLOW_EAST  26
#define GREEN_EAST   25

#define RED_SOUTH    21
#define YELLOW_SOUTH 19
#define GREEN_SOUTH  18

#define RED_WEST     5
#define YELLOW_WEST  4
#define GREEN_WEST   2

unsigned long lastCommandTime = 0;
String lastGreenDirection = "";
unsigned long autoCycleInterval = 10000; // 10 seconds per direction in auto mode
unsigned long transitionDelay = 1500;    // 1.5 seconds yellow before green

const char* directions[] = {"N", "E", "S", "W"};
const int numDirections = 4;

// Helper: Set all signals to red except the given direction, which is set to green
void setTrafficLights(const String& greenDir) {
  // North
  digitalWrite(RED_NORTH, greenDir != "N" ? HIGH : LOW);
  digitalWrite(YELLOW_NORTH, LOW);
  digitalWrite(GREEN_NORTH, greenDir == "N" ? HIGH : LOW);
  // East
  digitalWrite(RED_EAST, greenDir != "E" ? HIGH : LOW);
  digitalWrite(YELLOW_EAST, LOW);
  digitalWrite(GREEN_EAST, greenDir == "E" ? HIGH : LOW);
  // South
  digitalWrite(RED_SOUTH, greenDir != "S" ? HIGH : LOW);
  digitalWrite(YELLOW_SOUTH, LOW);
  digitalWrite(GREEN_SOUTH, greenDir == "S" ? HIGH : LOW);
  // West
  digitalWrite(RED_WEST, greenDir != "W" ? HIGH : LOW);
  digitalWrite(YELLOW_WEST, LOW);
  digitalWrite(GREEN_WEST, greenDir == "W" ? HIGH : LOW);
}

// Helper: Set all signals to red
void setAllRed() {
  digitalWrite(RED_NORTH, HIGH);
  digitalWrite(YELLOW_NORTH, LOW);
  digitalWrite(GREEN_NORTH, LOW);
  digitalWrite(RED_EAST, HIGH);
  digitalWrite(YELLOW_EAST, LOW);
  digitalWrite(GREEN_EAST, LOW);
  digitalWrite(RED_SOUTH, HIGH);
  digitalWrite(YELLOW_SOUTH, LOW);
  digitalWrite(GREEN_SOUTH, LOW);
  digitalWrite(RED_WEST, HIGH);
  digitalWrite(YELLOW_WEST, LOW);
  digitalWrite(GREEN_WEST, LOW);
}

// Helper: Set yellow for a direction, red for others
void setTransitionYellow(const String& dir) {
  // Set all to red first
  setAllRed();
  if (dir == "N") digitalWrite(YELLOW_NORTH, HIGH);
  else if (dir == "E") digitalWrite(YELLOW_EAST, HIGH);
  else if (dir == "S") digitalWrite(YELLOW_SOUTH, HIGH);
  else if (dir == "W") digitalWrite(YELLOW_WEST, HIGH);
}

void handleTrafficLightCommand() {
  if (server.hasArg("plain")) {
    String jsonData = server.arg("plain");
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, jsonData);

    if (!error) {
      const char* command = doc["command"];
      const char* signalId = doc["signal_id"];
      int duration = doc["duration"] | 10; // default 10s if not provided
      String direction = doc["direction"] | "";

      Serial.print("Received command: ");
      Serial.println(command);
      Serial.print("Signal ID: ");
      Serial.println(signalId);
      Serial.print("Direction: ");
      Serial.println(direction);
      Serial.print("Duration: ");
      Serial.print(duration);
      Serial.println(" seconds");

      if (strcmp(command, "set_green") == 0 && direction.length() > 0) {
        // Transition: yellow for this direction
        setTransitionYellow(direction);
        delay(transitionDelay);

        // Set green for this direction, red for others
        setTrafficLights(direction);
        lastGreenDirection = direction;
        lastCommandTime = millis();

        delay(duration * 1000);

        // After duration, revert to auto mode (let loop handle it)
        setAllRed();
        lastGreenDirection = "";
      }
      // You can add more commands (set_red, reset, etc.) if needed
    }
  }
  server.send(200, "text/plain", "Request for signal change received");
}

void handleEspReady() {
  Serial.println("ESP32: /esp-ready called, sending ready to server...");
  // All LEDs ON for 2 seconds
  digitalWrite(RED_NORTH, HIGH); digitalWrite(YELLOW_NORTH, HIGH); digitalWrite(GREEN_NORTH, HIGH);
  digitalWrite(RED_EAST, HIGH);  digitalWrite(YELLOW_EAST, HIGH);  digitalWrite(GREEN_EAST, HIGH);
  digitalWrite(RED_SOUTH, HIGH); digitalWrite(YELLOW_SOUTH, HIGH); digitalWrite(GREEN_SOUTH, HIGH);
  digitalWrite(RED_WEST, HIGH);  digitalWrite(YELLOW_WEST, HIGH);  digitalWrite(GREEN_WEST, HIGH);
  delay(2000);
  setAllRed();
  server.send(200, "text/plain", "esp32 ready ack");
}

void setup() {
  // Set all pins as OUTPUT and turn all red ON initially
  pinMode(RED_NORTH, OUTPUT);    pinMode(YELLOW_NORTH, OUTPUT);    pinMode(GREEN_NORTH, OUTPUT);
  pinMode(RED_EAST, OUTPUT);     pinMode(YELLOW_EAST, OUTPUT);     pinMode(GREEN_EAST, OUTPUT);
  pinMode(RED_SOUTH, OUTPUT);    pinMode(YELLOW_SOUTH, OUTPUT);    pinMode(GREEN_SOUTH, OUTPUT);
  pinMode(RED_WEST, OUTPUT);     pinMode(YELLOW_WEST, OUTPUT);     pinMode(GREEN_WEST, OUTPUT);
  setAllRed();

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

  server.on("/esp-ready", HTTP_POST, handleEspReady);
  server.on("/traffic-light-control", HTTP_POST, handleTrafficLightCommand);
  server.begin();
  Serial.println("HTTP server started");

  // After WiFi connect, notify Python server
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, "http://<PYTHON_SERVER_IP>:8000/iot/esp-ready"); // <-- Replace with your server IP
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode = http.POST("{\"status\":\"ready\"}");
    Serial.print("ESP32 sent ready to server, response: ");
    Serial.println(httpResponseCode);
    http.end();
  }
}

void loop() {
  server.handleClient();

  // If no command is active, run auto traffic light cycle
  static int currentDirIdx = 0;
  static unsigned long lastAutoSwitch = 0;
  if (lastGreenDirection == "") {
    unsigned long now = millis();
    if (now - lastAutoSwitch > autoCycleInterval) {
      String dir = directions[currentDirIdx];
      // Transition: yellow for this direction
      setTransitionYellow(dir);
      delay(transitionDelay);

      // Set green for this direction, red for others
      setTrafficLights(dir);

      lastAutoSwitch = now;
      currentDirIdx = (currentDirIdx + 1) % numDirections;
    }
  }
}
