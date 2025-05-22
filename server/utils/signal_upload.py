import csv
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate("firebase-adminsdk.json")  # Replace with your key
firebase_admin.initialize_app(cred)

db = firestore.client()

# Load and upload data
def upload_traffic_signals():
    with open('traffic_signals.csv', 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            signal_data = {
                "signal_id": row["signal_id"],
                "name": row["name"],
                "lat": float(row["lat"]),
                "lng": float(row["lng"]),
                "junction_id": row["junction_id"],
                "direction": row["direction"],
                "connected_esp32": row["connected_esp32"],
                "last_triggered": None
            }

            db.collection("traffic_signals").document(row["signal_id"]).set(signal_data)
            print(f"Uploaded {row['signal_id']} - {row['name']}")

if __name__ == "__main__":
    upload_traffic_signals()
    print("✅ All traffic signals uploaded to Firebase")