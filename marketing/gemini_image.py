#!/usr/bin/env python3
"""Generate/edit images via Gemini image models (Nano Banana Pro).

Replaces the gemini-mcp edit_image/generate_image tools with a direct REST call.
Key is read from ~/.gemini-mcp.env (GEMINI_API_KEY=...).

Usage:
  python3 gemini_image.py --prompt "..." --output out.png [--image in1.png --image in2.png] [--model gemini-3-pro-image-preview]
"""
import argparse, base64, json, mimetypes, os, pathlib, sys, urllib.request

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", required=True)
    p.add_argument("--image", action="append", default=[], help="input image(s), in order")
    p.add_argument("--output", required=True)
    p.add_argument("--model", default="gemini-3-pro-image-preview")
    a = p.parse_args()

    key = None
    for line in open(os.path.expanduser("~/.gemini-mcp.env")):
        if line.startswith("GEMINI_API_KEY="):
            key = line.strip().split("=", 1)[1]
    if not key:
        sys.exit("GEMINI_API_KEY not found in ~/.gemini-mcp.env")

    parts = []
    for img in a.image:
        mime = mimetypes.guess_type(img)[0] or "image/png"
        parts.append({"inline_data": {"mime_type": mime,
                     "data": base64.b64encode(open(img, "rb").read()).decode()}})
    parts.append({"text": a.prompt})

    body = json.dumps({"contents": [{"parts": parts}],
                       "generationConfig": {"responseModalities": ["IMAGE"]}}).encode()
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent",
        data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key})
    with urllib.request.urlopen(req, timeout=300) as r:
        resp = json.load(r)

    for part in resp["candidates"][0]["content"]["parts"]:
        if "inlineData" in part:
            pathlib.Path(a.output).parent.mkdir(parents=True, exist_ok=True)
            open(a.output, "wb").write(base64.b64decode(part["inlineData"]["data"]))
            print(a.output)
            return
    sys.exit(f"no image in response: {json.dumps(resp)[:500]}")

if __name__ == "__main__":
    main()
