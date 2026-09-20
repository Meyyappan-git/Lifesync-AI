import urllib.request
import json

req = urllib.request.Request(
    'https://api.nodemailer.com/user',
    data=b'{"requestor":"LifeSyncAI"}',
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print(e)
