#!/usr/bin/env python3
"""
Supadata API Client - Transcript Extraction with Translation
"""
import os
import sys
import json
import requests
from typing import Optional, Dict, Any, List

# API Keys
SUPADATA_API_KEY = "sd_b8f63cfb3106599b4242d40099c5d23e"
DEEPSEEK_API_KEY = "sk-5ad555f540a44db9aa64cdee54e2c12d"

BASE_URL = "https://api.supadata.ai/v1"
DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"

class SupadataClient:
    def __init__(self):
        self.api_key = SUPADATA_API_KEY
        self.base_url = BASE_URL
        
    def get_headers(self) -> Dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }
    
    def get_transcript(self, url: str) -> Dict[str, Any]:
        """Extract transcript from a video URL."""
        try:
            response = requests.get(
                f"{self.base_url}/transcript",
                params={"url": url},
                headers=self.get_headers(),
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
    
    def get_youtube_video(self, video_id: str) -> Dict[str, Any]:
        """Get YouTube video metadata."""
        try:
            response = requests.get(
                f"{self.base_url}/youtube/video",
                params={"id": video_id},
                headers=self.get_headers(),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
    
    def get_youtube_channel(self, channel_id: str) -> Dict[str, Any]:
        """Get YouTube channel metadata."""
        try:
            response = requests.get(
                f"{self.base_url}/youtube/channel",
                params={"id": channel_id},
                headers=self.get_headers(),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}
    
    def search_youtube(self, query: str, limit: int = 10) -> Dict[str, Any]:
        """Search YouTube videos."""
        try:
            response = requests.get(
                f"{self.base_url}/youtube/search",
                params={"query": query, "limit": limit},
                headers=self.get_headers(),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"error": str(e), "success": False}


class DeepSeekTranslator:
    def __init__(self):
        self.api_key = DEEPSEEK_API_KEY
        self.url = DEEPSEEK_URL
        
    def translate(self, text: str, target_lang: str = "Chinese") -> str:
        """Translate text to target language using DeepSeek."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""You are a professional translator. Translate the following transcript to {target_lang}. 
Maintain the original formatting with timestamps if any. 
Only output the translated text, nothing else.

Transcript:
{text}"""
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }
        
        try:
            response = requests.post(
                self.url,
                headers=headers,
                json=data,
                timeout=60
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except requests.exceptions.RequestException as e:
            return f"Translation error: {str(e)}"


def format_transcript(transcript_data: Dict[str, Any]) -> str:
    """Format transcript data into readable text."""
    if "error" in transcript_data:
        return f"Error: {transcript_data['error']}"
    
    if "content" not in transcript_data:
        return "No transcript available"
    
    lines = []
    for segment in transcript_data.get("content", []):
        text = segment.get("text", "")
        offset = segment.get("offset", 0)
        seconds = offset // 1000
        minutes = seconds // 60
        seconds = seconds % 60
        timestamp = f"[{minutes:02d}:{seconds:02d}]"
        lines.append(f"{timestamp} {text}")
    
    return "\n".join(lines)


# CLI interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Supadata Transcript Extraction with Translation")
    parser.add_argument("command", choices=["transcript", "translate", "youtube-video", "search"], help="Command to run")
    parser.add_argument("--url", help="Video URL for transcript")
    parser.add_argument("--id", help="Video/Channel ID")
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--limit", type=int, default=10, help="Result limit")
    parser.add_argument("--lang", default="Chinese", help="Target language for translation")
    
    args = parser.parse_args()
    
    supadata = SupadataClient()
    translator = DeepSeekTranslator()
    
    if args.command == "transcript" and args.url:
        result = supadata.get_transcript(args.url)
        print(format_transcript(result))
    elif args.command == "translate" and args.url:
        # Get transcript and translate
        transcript_data = supadata.get_transcript(args.url)
        original_text = format_transcript(transcript_data)
        translated = translator.translate(original_text, args.lang)
        print(translated)
    elif args.command == "youtube-video" and args.id:
        result = supadata.get_youtube_video(args.id)
        print(json.dumps(result, indent=2))
    elif args.command == "search" and args.query:
        result = supadata.search_youtube(args.query, args.limit)
        print(json.dumps(result, indent=2))
    else:
        print("Usage: supadata_client.py transcript --url <url>")
        print("       supadata_client.py translate --url <url> --lang Chinese")
