import requests

API_URL = "http://localhost:8000"

def run():
    # Register
    resp = requests.post(f"{API_URL}/api/v1/auth/register", json={
        "full_name": "Test User",
        "email": "test_register@gmail.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    
    print("Register status:", resp.status_code)
    print("Register body:", resp.text)

if __name__ == "__main__":
    run()
