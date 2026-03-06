#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Wait for a Chief dispatch result bridge file.

Usage:
  python3 scripts/wait_dispatch_result.py /path/to/result.md --timeout 180 --json
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path


def parse_result(path: Path) -> dict:
    text = path.read_text(encoding="utf-8").strip()
    lines = text.splitlines()
    status = None
    route_debug = None
    dispatch_id = None
    agent = None
    body_start = 0

    for i, line in enumerate(lines[:10]):
        if line.startswith("STATUS:"):
            status = line.split(":", 1)[1].strip()
        elif line.startswith("ROUTE_DEBUG:"):
            route_debug = line.split(":", 1)[1].strip()
        elif line.startswith("DISPATCH_ID:"):
            dispatch_id = line.split(":", 1)[1].strip()
        elif line.startswith("AGENT:"):
            agent = line.split(":", 1)[1].strip()
        elif line.strip() == "":
            body_start = i + 1
            break

    body = "\n".join(lines[body_start:]).strip() if lines else ""
    return {
        "path": str(path),
        "status": status,
        "route_debug": route_debug,
        "dispatch_id": dispatch_id,
        "agent": agent,
        "body": body,
        "raw": text,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Wait for dispatch result file")
    parser.add_argument("path", help="result file path")
    parser.add_argument("--timeout", type=int, default=180, help="seconds to wait")
    parser.add_argument("--interval", type=float, default=1.0, help="poll interval seconds")
    parser.add_argument("--json", action="store_true", help="output json")
    args = parser.parse_args()

    path = Path(args.path)
    deadline = time.time() + max(args.timeout, 1)

    while time.time() < deadline:
        if path.exists() and path.stat().st_size > 0:
            parsed = parse_result(path)
            if args.json:
                print(json.dumps({"ready": True, **parsed}, ensure_ascii=False, indent=2))
            else:
                print(parsed["raw"])
            return
        time.sleep(max(args.interval, 0.2))

    payload = {
        "ready": False,
        "path": str(path),
        "error": "timeout_waiting_for_dispatch_result",
    }
    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(payload["error"])


if __name__ == "__main__":
    main()
