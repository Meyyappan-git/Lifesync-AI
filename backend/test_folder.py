import requests

API_URL = "http://localhost:8000"

def run():
    # Login
    resp = requests.post(f"{API_URL}/api/v1/auth/login", json={
        "email": "meyyappan2007@gmail.com",
        "password": "Password123!"
    })
    
    access_token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Create folder
    folder_resp = requests.post(
        f"{API_URL}/api/v1/lifesync/folders",
        headers=headers,
        json={"name": "My Custom Folder"}
    )
    
    print("Folder creation status:", folder_resp.status_code)
    print("Folder creation body:", folder_resp.text)

if __name__ == "__main__":
    run()
