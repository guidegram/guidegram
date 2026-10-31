import urllib.request
import json
import sys

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

url = 'https://api.github.com/repos/telegramdesktop/tdesktop/issues?sort=comments&direction=desc&per_page=5'
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read().decode('utf-8'))
        remaining = r.headers.get('x-ratelimit-remaining')
        print(f"Remaining rate limit: {remaining}")
        for item in data:
            print(f"#{item['number']}: {item['title']} ({item.get('comments', 0)} comments) - {item['html_url']}")
except Exception as e:
    print(f"Error: {e}")
