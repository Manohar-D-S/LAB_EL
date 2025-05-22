# core/firebase.py
import firebase_admin
from firebase_admin import credentials, firestore
from typing import List, Dict

# Initialize Firebase Admin SDK
cred = credentials.Certificate("/server/firebase.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

def get_all_signals() -> List[Dict]:
    signals_ref = db.collection("traffic_signals")
    docs = signals_ref.stream()
    return [doc.to_dict() for doc in docs]