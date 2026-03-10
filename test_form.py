import requests

url = "http://localhost:8000/api/curriculum/generate"
payload = {
    "skills": "React, TypeScript",
    "domain": "Web",
    "role": "Frontend",
    "time": "15",
    "pace": "Advanced"
}

print(f"Posting to {url} with {payload}...")
try:
    response = requests.post(url, data=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}...")
except Exception as e:
    print(f"Error: {e}")
