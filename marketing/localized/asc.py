"""Minimal App Store Connect REST client (ES256 JWT)."""
import time, jwt, requests

KEY_ID, ISSUER = "5SS3TPSGUC", "82ed5117-fe05-464d-9467-d578064a8bee"
KEY = open(f"/Users/jonatanbjerrekaer/.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8").read()
BASE = "https://api.appstoreconnect.apple.com"
APP_ID = "6758355259"


def _h():
    tok = jwt.encode({"iss": ISSUER, "exp": int(time.time()) + 1100, "aud": "appstoreconnect-v1"},
                     KEY, algorithm="ES256", headers={"kid": KEY_ID})
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def call(method, path, body=None, ok=(200, 201, 204)):
    r = requests.request(method, path if path.startswith("http") else BASE + path, headers=_h(), json=body)
    if r.status_code not in ok:
        raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:800]}")
    return r.json() if r.content else {}


def get(path):
    return call("GET", path)
