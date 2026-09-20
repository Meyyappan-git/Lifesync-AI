import requests

API_URL = "http://localhost:8000"

def run():
    # Login
    resp = requests.post(f"{API_URL}/api/v1/auth/login", json={
        "email": "meyyappan2007@gmail.com",
        "password": "Password123!"
    })
    
    if resp.status_code != 200:
        print("Login failed", resp.text)
        return

    access_token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Upload a dummy file
    files = {'file': ('dummy.pdf', b'Dummy PDF Content', 'application/pdf')}
    data = {'folder_name': 'Test Folder'}
    
    print("Uploading file...")
    upload_resp = requests.post(
        f"{API_URL}/api/v1/lifesync/documents/upload",
        headers=headers,
        files=files,
        data=data
    )
    
    print("Upload status:", upload_resp.status_code)
    print("Upload body:", upload_resp.text)

if __name__ == "__main__":
    run()
