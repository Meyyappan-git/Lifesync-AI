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
    
    # Change password
    change_resp = requests.post(
        f"{API_URL}/api/v1/auth/change-password",
        headers=headers,
        json={
            "current_password": "Password123!",
            "new_password": "NewPassword123!",
            "confirm_password": "NewPassword123!"
        }
    )
    
    print("Change pass status:", change_resp.status_code)
    print("Change pass body:", change_resp.text)

if __name__ == "__main__":
    run()
