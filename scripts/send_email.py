#!/usr/bin/env python3
"""
Email sender using Resend API
Email: jeffai@agentmail.to
"""

import os
import sys
import json

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "am_us_ac65e4d242eee6512b4c76e5420f9afa043630d43bf250f463ec8772b506c781")
FROM_EMAIL = "JeffAI <jeffai@agentmail.to>"

def send_email(to: str, subject: str, body: str, html: bool = False):
    """Send email via Resend API"""
    import requests
    
    url = "https://api.resend.com/emails"
    
    data = {
        "from": FROM_EMAIL,
        "to": [to],
        "subject": subject,
    }
    
    if html:
        data["html"] = body
    else:
        data["text"] = body
    
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code >= 400:
        print(f"Error: {response.status_code} - {response.text}", file=sys.stderr)
        return False
    
    result = response.json()
    print(f"Email sent successfully! ID: {result.get('id')}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: send_email.py <to> <subject> <body>")
        print("Or: send_email.py --html <to> <subject> <html_body>")
        sys.exit(1)
    
    if sys.argv[1] == "--html":
        if len(sys.argv) != 4:
            print("Usage: send_email.py --html <to> <subject> <html_body>")
            sys.exit(1)
        _, _, to, subject, *body_parts = sys.argv
        body = " ".join(body_parts)
        send_email(to, subject, body, html=True)
    else:
        to, subject, *body_parts = sys.argv[1:]
        body = " ".join(body_parts)
        send_email(to, subject, body)
