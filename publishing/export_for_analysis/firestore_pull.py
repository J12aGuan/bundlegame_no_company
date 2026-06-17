#!/usr/bin/env python3
"""
Pull live BundleGame Firestore data into the JSON shape ``export.py`` expects.

Credentials are read from the environment / repo ``.env`` only — never hardcoded
or printed. Two auth modes, in priority order:

  1. Service account: ``GOOGLE_APPLICATION_CREDENTIALS`` -> firebase-admin
     (full admin access, bypasses security rules). Recommended for completeness.
  2. Email/password: ``FIREBASE_ADMIN_EMAIL`` / ``FIREBASE_ADMIN_PASSWORD`` +
     ``VITE_FIREBASE_API_KEY`` -> Identity Toolkit signInWithPassword -> the ID
     token is used as a Bearer against the Firestore REST API. Reads under
     ``/Users`` succeed only if the account carries the ``admin=true`` custom
     claim (see firestore.rules).

Usage:
  python publishing/export_for_analysis/firestore_pull.py --probe        # auth + access check
  python publishing/export_for_analysis/firestore_pull.py --dataset-root mainGame --out _raw_pull
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def enc_path(path: str) -> str:
    """URL-encode each path segment (some participant ids contain spaces)."""
    return "/".join(urllib.parse.quote(seg, safe="") for seg in str(path).split("/"))

HERE = Path(__file__).resolve().parent
# publishing/export_for_analysis/ lives under publishing/, so the repo root is two levels up.
REPO_ROOT = HERE.parent.parent
DEFAULT_PROJECT_ID = "bundling-63c10"
FIRESTORE_ROOT = "https://firestore.googleapis.com/v1"
IDENTITY_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"


# --------------------------------------------------------------------------- #
# Env loading (no values printed).                                            #
# --------------------------------------------------------------------------- #
def load_dotenv(root: Path = REPO_ROOT) -> None:
    env_path = root / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key, val = key.strip(), val.strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        os.environ.setdefault(key, val)


def project_id() -> str:
    return (os.environ.get("FIREBASE_PROJECT_ID")
            or os.environ.get("VITE_FIREBASE_PROJECT_ID")
            or DEFAULT_PROJECT_ID).strip()


# --------------------------------------------------------------------------- #
# HTTP helpers.                                                               #
# --------------------------------------------------------------------------- #
def _post_json(url: str, body: dict[str, Any]) -> dict[str, Any]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_json(url: str, token: str | None) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    req = urllib.request.Request(url, method="GET", headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _post_url(url: str, token: str | None, body: dict[str, Any]) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 method="POST", headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


# --------------------------------------------------------------------------- #
# Auth.                                                                       #
# --------------------------------------------------------------------------- #
def sign_in_email_password() -> dict[str, Any]:
    api_key = os.environ.get("VITE_FIREBASE_API_KEY", "").strip()
    email = os.environ.get("FIREBASE_ADMIN_EMAIL", "").strip()
    password = os.environ.get("FIREBASE_ADMIN_PASSWORD", "").strip()
    if not (api_key and email and password):
        raise RuntimeError("Missing VITE_FIREBASE_API_KEY / FIREBASE_ADMIN_EMAIL / "
                           "FIREBASE_ADMIN_PASSWORD in environment/.env.")
    out = _post_json(f"{IDENTITY_URL}?key={api_key}",
                     {"email": email, "password": password, "returnSecureToken": True})
    return out  # contains idToken, refreshToken, expiresIn (not printed)


def decode_claims(id_token: str) -> dict[str, Any]:
    try:
        payload = id_token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        return json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
    except Exception:
        return {}


# --------------------------------------------------------------------------- #
# Firestore REST value decoding.                                             #
# --------------------------------------------------------------------------- #
def decode_value(value: dict[str, Any]) -> Any:
    if "nullValue" in value:
        return None
    if "stringValue" in value:
        return value["stringValue"]
    if "booleanValue" in value:
        return value["booleanValue"]
    if "integerValue" in value:
        return int(value["integerValue"])
    if "doubleValue" in value:
        return float(value["doubleValue"])
    if "timestampValue" in value:
        return {"seconds": _iso_to_seconds(value["timestampValue"])}
    if "mapValue" in value:
        return decode_fields(value["mapValue"].get("fields", {}))
    if "arrayValue" in value:
        return [decode_value(v) for v in value["arrayValue"].get("values", [])]
    if "geoPointValue" in value:
        return value["geoPointValue"]
    if "referenceValue" in value:
        return value["referenceValue"]
    return None


def _iso_to_seconds(iso: str) -> float:
    from datetime import datetime
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def decode_fields(fields: dict[str, Any]) -> dict[str, Any]:
    return {k: decode_value(v) for k, v in (fields or {}).items()}


def doc_id(name: str) -> str:
    return name.rsplit("/", 1)[-1] if name else ""


# --------------------------------------------------------------------------- #
# Firestore REST reads.                                                       #
# --------------------------------------------------------------------------- #
def docs_base(proj: str) -> str:
    return f"{FIRESTORE_ROOT}/projects/{proj}/databases/(default)/documents"


def get_document(proj: str, path: str, token: str | None) -> dict[str, Any] | None:
    try:
        raw = _get_json(f"{docs_base(proj)}/{enc_path(path)}", token)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise
    return {"id": doc_id(raw.get("name", "")), **decode_fields(raw.get("fields", {}))}


def list_collection(proj: str, coll_path: str, token: str | None,
                    page_size: int = 300) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page_token = ""
    while True:
        url = f"{docs_base(proj)}/{enc_path(coll_path)}?pageSize={page_size}"
        if page_token:
            url += f"&pageToken={page_token}"
        data = _get_json(url, token)
        for raw in data.get("documents", []):
            out.append({"_name": raw.get("name", ""),
                        "id": doc_id(raw.get("name", "")),
                        **decode_fields(raw.get("fields", {}))})
        page_token = data.get("nextPageToken", "")
        if not page_token:
            break
    return out


def list_collection_ids(proj: str, doc_path: str, token: str | None) -> list[str]:
    url = f"{docs_base(proj)}/{enc_path(doc_path)}:listCollectionIds"
    try:
        data = _post_url(url, token, {})
    except urllib.error.HTTPError:
        return []
    return list(data.get("collectionIds", []))


# --------------------------------------------------------------------------- #
# Probe.                                                                      #
# --------------------------------------------------------------------------- #
def probe() -> int:
    load_dotenv()
    proj = project_id()
    print(f"[probe] project: {proj}")

    use_sa = bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip())
    print(f"[probe] GOOGLE_APPLICATION_CREDENTIALS set: {'yes' if use_sa else 'no'}")

    # Public read (no auth) — MasterData/cities.
    try:
        cities = get_document(proj, "MasterData/cities", None)
        print(f"[probe] public MasterData/cities readable: "
              f"{'yes' if cities else 'no'} "
              f"(startinglocation={cities.get('startinglocation') if cities else None})")
    except Exception as exc:
        print(f"[probe] public read error: {type(exc).__name__}: {exc}")

    # Email/password auth.
    try:
        session = sign_in_email_password()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")
        try:
            msg = json.loads(detail).get("error", {}).get("message", "")
        except Exception:
            msg = exc.reason
        print(f"[probe] email/password sign-in FAILED: HTTP {exc.code} {msg}")
        return 2
    except Exception as exc:
        print(f"[probe] email/password sign-in FAILED: {type(exc).__name__}: {exc}")
        return 2

    token = session.get("idToken", "")
    claims = decode_claims(token)
    is_admin = bool(claims.get("admin") is True)
    print(f"[probe] email/password sign-in: OK (uid={claims.get('user_id', '')[:6]}…)")
    print(f"[probe] token has admin=true custom claim: {'YES' if is_admin else 'NO'}")

    # Try to list one Users doc (admin-gated).
    try:
        users = list_collection(proj, "Users", token, page_size=1)
        print(f"[probe] /Users list with this token: OK ({len(users)} doc sampled)")
        if users:
            uid = users[0]["id"]
            subs = list_collection_ids(proj, f"Users/{uid}", token)
            print(f"[probe] sample user subcollections: {subs}")
        print("[probe] RESULT: email/password path CAN read participant data. "
              "Proceed with --dataset-root <root>.")
        return 0
    except urllib.error.HTTPError as exc:
        print(f"[probe] /Users list DENIED: HTTP {exc.code} "
              f"({'missing admin claim' if exc.code in (401, 403) else exc.reason})")
        print("[probe] RESULT: this account cannot read /Users via rules. "
              "Provide a service-account JSON (GOOGLE_APPLICATION_CREDENTIALS) instead.")
        return 3


# --------------------------------------------------------------------------- #
# Full pull.                                                                  #
# --------------------------------------------------------------------------- #
def pull(dataset_root: str, out_dir: Path) -> dict[str, Any]:
    load_dotenv()
    proj = project_id()
    session = sign_in_email_password()
    token = session.get("idToken", "")
    claims = decode_claims(token)
    if claims.get("admin") is not True:
        raise RuntimeError("Signed-in account lacks admin=true; cannot read /Users.")

    out_dir.mkdir(parents=True, exist_ok=True)

    # MasterData. Datasets are nested under doc.datasets[root]; store grids live
    # in MasterData/store ({stores: [...]}); cities in MasterData/cities.
    cities = get_document(proj, "MasterData/cities", None) or {}
    datasets_doc = get_document(proj, "MasterData/datasets", None) or {}
    datasets_map = datasets_doc.get("datasets", {}) if isinstance(datasets_doc, dict) else {}
    central = get_document(proj, "MasterData/centralConfig", None) or {}
    resolved_root = dataset_root or str(central.get("scenario_set") or "mainGame")

    dataset_entry = datasets_map.get(resolved_root) if isinstance(datasets_map, dict) else None
    if not isinstance(dataset_entry, dict):
        raise RuntimeError(f"dataset root '{resolved_root}' not found in MasterData/datasets "
                           f"(available: {list(datasets_map)}).")
    scenario_bundle = {
        "scenarios": dataset_entry.get("scenarios", []),
        "orders": dataset_entry.get("orders", []),
        "optimal": dataset_entry.get("optimal", []),
        "metadata": dataset_entry.get("metadata", {}),
    }
    store_doc = get_document(proj, "MasterData/store", None) or {}
    stores = {"stores": store_doc.get("stores", [])} if isinstance(store_doc, dict) else {"stores": []}

    # Users.
    print(f"[pull] listing Users…")
    user_docs = list_collection(proj, "Users", token)
    print(f"[pull] {len(user_docs)} users; pulling subcollections…")
    participants: list[dict[str, Any]] = []
    for i, u in enumerate(user_docs, 1):
        uid = u["id"]
        actions = list_collection(proj, f"Users/{uid}/Actions", token)
        summary = get_document(proj, f"Users/{uid}/Summary/summary", token)
        progress = get_document(proj, f"Users/{uid}/Progress/progress", token)
        action_doc = get_document(proj, f"Users/{uid}/Action/actions", token)
        participants.append({
            "id": uid,
            "researchStudy": u.get("researchStudy"),
            "actions": actions,
            "summaryDoc": summary,
            "progressSummary": summary,
            "scenarioSetProgressDoc": progress,
            "scenarioActionsDoc": action_doc,
            "orders": [],
        })
        if i % 10 == 0 or i == len(user_docs):
            print(f"[pull]   {i}/{len(user_docs)} users")

    bundle = {
        "participants": participants,
        "scenario_bundle": scenario_bundle,
        "cities": cities,
        "stores": stores,
        "meta": {"source": "firestore_live", "is_sample": False,
                 "dataset_root": resolved_root,
                 "project_id": proj},
    }
    (out_dir / "participants.json").write_text(
        json.dumps(participants, indent=2), encoding="utf-8")
    (out_dir / "scenario_bundle.json").write_text(
        json.dumps(scenario_bundle, indent=2), encoding="utf-8")
    (out_dir / "cities.json").write_text(json.dumps(cities, indent=2), encoding="utf-8")
    (out_dir / "stores.json").write_text(json.dumps(stores, indent=2), encoding="utf-8")
    print(f"[pull] wrote raw JSON to {out_dir} "
          f"(participants={len(participants)}, scenarios={len(scenario_bundle['scenarios'])})")
    return bundle


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--probe", action="store_true")
    ap.add_argument("--dataset-root", default="")
    ap.add_argument("--out", default=str(HERE / "_raw_pull"))
    args = ap.parse_args()
    if args.probe:
        return probe()
    pull(args.dataset_root, Path(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
