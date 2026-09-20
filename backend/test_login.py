import requests

API_URL = "http://localhost:8000"

def run():
    # Login
    resp = requests.post(f"{API_URL}/api/v1/auth/login", json={
        "email": "meyyappan2007@gmail.com",
        "password": "Password123!"
    })
    
    print("Login status:", resp.status_code)
    print("Login body:", resp.text)

if __name__ == "__main__":
    run()
