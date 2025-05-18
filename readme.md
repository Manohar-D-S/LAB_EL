follow the below instructions

open 2 terminals in this main project folder (where the readme.md file is placed)

TERMINAL 1:
    cd server
    pip install -r requirements.txt
    python main.py

TERMINAL 2:
    cd web
    npm install         
    npm run dev


DEBUGGING:
    Check the server_logs.log file for server side debugging



Instructions to run React Native app (frontend folder)

📦 Core Dependencies (Run These First)
npm install react react-native react-native-web expo expo-router @react-navigation/native @react-navigation/bottom-tabs

🗺️ Maps & Location
npm install react-native-maps react-leaflet leaflet expo-location

🖥️ UI & Icons
npm install lucide-react-native @expo/vector-icons react-native-svg

🛠️ Utilities
npm install react-native-safe-area-context react-native-screens react-native-reanimated react-native-gesture-handler react-native-url-polyfill

🌐 Web-Specific Fix (Leaflet Markers)
npm install leaflet

Install Expo CLI (if missing):
npm install -g expo-cli

Start the app:
expo start

