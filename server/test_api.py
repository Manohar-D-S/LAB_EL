import requests
import json

BASE_URL = "http://localhost:8000"

def test_direct_route():
    response = requests.get(f"{BASE_URL}/test")
    print(f"Direct route test: {response.status_code}")
    if response.status_code == 200:
        print(response.json())
    else:
        print(f"Error: {response.text}")

def test_router_route():
    response = requests.get(f"{BASE_URL}/router-test")
    print(f"Router route test: {response.status_code}")
    if response.status_code == 200:
        print(response.json())
    else:
        print(f"Error: {response.text}")

def test_post_route():
    data = {"test": "data"}
    response = requests.post(f"{BASE_URL}/test-post", json=data)
    print(f"Post route test: {response.status_code}")
    if response.status_code == 200:
        print(response.json())
    else:
        print(f"Error: {response.text}")

def test_main_route():
    data = {
        "source_lat": 12.9716, 
        "source_lng": 77.5946, 
        "dest_lat": 12.9352, 
        "dest_lng": 77.6101
    }
    response = requests.post(f"{BASE_URL}/routes", json=data)
    print(f"Main route test: {response.status_code}")
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    print("Testing API endpoints...")
    test_direct_route()
    print("\n---\n")
    test_router_route()
    print("\n---\n")
    test_post_route()
    print("\n---\n")
    test_main_route()
