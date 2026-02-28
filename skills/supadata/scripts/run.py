#!/usr/bin/env python3
"""
Supadata API Client for transcript extraction.
"""
import os
import sys
import json
import requests
from typing import Optional, Dict, Any

API_KEY = "sd_b8f63cfb3106599b4242d40099c5d23e"
BASE_URL = "https://api.supadata.ai/v1"

def get_transcript(url: str) -> Dict[str, Any]:
    """
    Extract transcript from a video URL.
    
    Args:
        url: Video URL from YouTube, TikTok, Instagram, Twitter, Facebook, or public file URL
        
    Returns:
        Dict containing transcript text and metadata
    """
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    params = {"url": url}
    
    try:
        response = requests.get(
            f"{BASE_URL}/transcript",
            params=params,
            headers=headers,
            timeout=60
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def get_youtube_video(video_id: str) -> Dict[str, Any]:
    """
    Get YouTube video metadata.
    
    Args:
        video_id: YouTube video ID
        
    Returns:
        Dict containing video metadata
    """
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    params = {"id": video_id}
    
    try:
        response = requests.get(
            f"{BASE_URL}/youtube/video",
            params=params,
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}

def main():
    # Read input from stdin
    input_data = json.load(sys.stdin)
    
    # Get the URL from input
    url = input_data.get("url", "")
    
    if not url:
        print(json.dumps({"error": "No URL provided"}))
        return
    
    # Extract transcript
    result = get_transcript(url)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
