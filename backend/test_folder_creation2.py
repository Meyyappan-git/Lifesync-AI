import requests

API_URL = "http://localhost:8000"

def run():
    # 1. Register a test user
    email = "testuser_createfolder4@example.com"
    password = "Password123!"
    
    requests.post(f"{API_URL}/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": email,
        "password": password,
        "confirm_password": password
    })
    
    # 2. Login
    resp = requests.post(f"{API_URL}/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    
    token = resp.json()["access_token"]
    
    # 3. Create folder
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = requests.post(f"{API_URL}/api/v1/lifesync/folders", json={
        "name": "My New Folder",
        "description": "A folder"
    }, headers=headers)
    
    print("Create folder status:", create_resp.status_code)
    print("Create folder body:", create_resp.text)

if __name__ == "__main__":
    run()
