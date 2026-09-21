import requests

url = "http://localhost:8000/api/v1/auth/login"
payload = {
    "username": "meyyappan2007@gmail.com",
    "password": "Password123!" 
}
# wait, what's the password? I might not have it.
# Let's just create a new user.
