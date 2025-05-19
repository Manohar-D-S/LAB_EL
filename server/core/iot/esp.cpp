// #include <WiFi.h>
// #include <WebServer.h>
// #include <ArduinoJson.h>  // Install via Library Manager: "ArduinoJson"

// // Replace with your network credentials
// const char* ssid = "YOUR_SSID";
// const char* password = "YOUR_PASSWORD";

// // Define LED pins
// #define GREEN_LED_PIN 12
// #define RED_LED_PIN 13

// WebServer server(80);

// void handleTrafficLightControl() {
//   if (server.hasArg("plain")) {
//     String jsonData = server.arg("plain");
//     DynamicJsonDocument doc(1024);
//     DeserializationError error = deserializeJson(doc, jsonData);
    
//     if (!error) {
//       const char* command = doc["command"];
//       const char* signalId = doc["signal_id"];
//       int duration = doc["duration"];

//       if (strcmp(command, "set_green") == 0) {
//         // Turn on green LED for `signalId`
//         digitalWrite(GREEN_LED_PIN, HIGH);
//         delay(duration * 1000);  // Block for simplicity (use millis() for production)
//         digitalWrite(GREEN_LED_PIN, LOW);
//       }
//     }
//   }
//   server.send(200, "text/plain", "OK");
// }

// void setup() {
//   pinMode(GREEN_LED_PIN, OUTPUT);
//   pinMode(RED_LED_PIN, OUTPUT);
//   digitalWrite(GREEN_LED_PIN, LOW);
//   digitalWrite(RED_LED_PIN, HIGH);

//   Serial.begin(115200);
//   WiFi.begin(ssid, password);

//   while (WiFi.status() != WL_CONNECTED) {
//     delay(1000);
//     Serial.println("Connecting to WiFi...");
//   }

//   Serial.println("Connected to WiFi");
//   Serial.println(WiFi.localIP());

//   server.on("/traffic-light-control", HTTP_POST, handleTrafficLightControl);
//   server.begin();
//   Serial.println("HTTP server started");
// }

// void loop() {
//   server.handleClient();
// }