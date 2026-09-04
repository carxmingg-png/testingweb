#!/usr/bin/env python3
"""
CarX Street - Web Core Engine
Safe, modular engine extracted from bot.py with:
- Non-destructive database management (backup & atomic write)
- Full CarX Street profile decompression, injection, and compression
- Currency booster, Map & Real estate unlocker, Car injector, Street Pass maxer
- Master admin key support ('MINGFU', 'DADDYMINGFU')
"""

import os
import sys
import json
import gzip
import base64
import time
import uuid
import random
import string
import shutil
import requests
from datetime import datetime
import copy

# ============================================================
# API ENDPOINTS & CONSTANTS
# ============================================================
AUTH_URL = 'https://carx-id-prod.carx-online.com/api/auth'
PROFILE_URL = 'https://street-prod.carx-online.com/str/v1/client/profiles'
BATTLEPASS_URL = 'https://street-prod.carx-online.com/str/v1/client/purchases/verify'
USER_AGENT = 'UnityPlayer/6000.0.64f1 (UnityWebRequest/1.0, libcurl/8.10.1-DEV)'
TIMEOUT = 60

REAL_ESTATE_PROPERTIES = [
    "apartment_01", "apartment_51", "apartment_95",
    "apartment_industrial_SP", "apartment_midtown_SP", "apartment_midtown2_SP", "apartment_midtown3_SP",
    "Industrial_apartment_1", "Industrial_apartment_2", "Industrial_apartment_3", "Industrial_apartment_4", "Industrial_apartment_5", "Industrial_apartment_6",
    "Midtown_apartment_1", "Midtown_apartment_2", "Midtown_apartment_3", "Midtown_apartment_4", "Midtown_apartment_5", "Midtown_apartment_6",
    "Midtown_apartment_7", "Midtown_apartment_8", "Midtown_apartment_9", "Midtown_apartment_10", "Midtown_apartment_11", "Midtown_apartment_12",
    "Prigorod_apartment_1", "Prigorod_apartment_2", "Prigorod_apartment_3", "Prigorod_apartment_4", "Prigorod_apartment_5", "Prigorod_apartment_6", "Prigorod_apartment_7",
    "Mountain_apartment_1", "Mountain_apartment_2", "Mountain_apartment_3", "Mountain_apartment_4", "Mountain_apartment_5", "Mountain_apartment_6",
    "Mountain_apartment_7", "Mountain_apartment_8", "Mountain_apartment_9", "Mountain_apartment_11", "Mountain_apartment_13", "Mountain_apartment_14",
    "Mountain_apartment_15", "Mountain_apartment_16", "Mountain_apartment_17", "Mountain_apartment_18", "Mountain_apartment_19",
    "Speedway_apartment_1", "Speedway_apartment_2", "Speedway_apartment_3"
]
EXTRA_LOCATION_KEYS = ["car_market_0", "car_showroom_0", "car_showroom_1", "car_showroom_2"]

STREETPASS_BODY = (
    '{"gameVersion":"1.18.0","purchaseId":"GPA.3304-3406-9941-41674",'
    '"productId":"com.carxtech.sr.bank.event.bp",'
    '"transactionData":"naooopliblhmhlhjphaiblip.AO-J1Owuw7bYU69mo6A_woU7wHx6NDEZPS_Io-HzmDgWudqOLG_3tEEwEqMihq1eHZlasQ97qUvkuma4CCPraosxDFlQEKipqw",'
    '"transactionId":"naooopliblhmhlhjphaiblip.AO-J1Owuw7bYU69mo6A_woU7wHx6NDEZPS_Io-HzmDgWudqOLG_3tEEwEqMihq1eHZlasQ97qUvkuma4CCPraosxDFlQEKipqw",'
    '"subscription":false,'
    '"metaInfo":"{\\"json\\":\\"{\\\\\\"packageName\\\\\\":\\\\\\"com.carxtech.sr\\\\\\",\\\\\\"productId\\\\\\":\\\\\\"com.carxtech.sr.bank.event.bp\\\\\\",\\\\\\"purchaseTime\\\\\\":1776223964504,\\\\\\"purchaseState\\\\\\":0,\\\\\\"purchaseToken\\\\\\":\\\\\\"naooopliblhmhlhjphaiblip.AO-J1Owuw7bYU69mo6A_woU7wHx6NDEZPS_Io-HzmDgWudqOLG_3tEEwEqMihq1eHZlasQ97qUvkuma4CCPraosxDFlQEKipqw\\\\\\",\\\\\\"quantity\\\\\\":1,\\\\\\"acknowledged\\\\\\":false,\\\\\\"orderId\\\\\\":\\\\\\"GPA.3304-3406-9941-41674\\\\\\"}\\",\\"signature\\":\\"fAlvYHDSE9y+tbPxNYtpI97ompnSrfSkR3AerW5pAatwNtihN6jOb8eXYvLCQxAyc7sK/jU87m9hz6Co4Vig3OvIh74bPm2Z+1y8oGcNNUvyIpQlqV85j4x2PFzbFU0//TCraeAfJOn2mOlHZqMqQ1Fpb2oh1wN6PhMtkQt56Pcg/J6gEpBhhVuU31Om02lW17oj3phKx4KXMbcgvqQ81gLhdos82BKSD7u/VPsnJevKEu5cGC273dh0AmxUUJPRVryeg+ucln6jJLgL+qmH1F71qb7IZ0duAkX3usw/rYY7Luhg0puo9NjW/xt+dblckah5adr/IrL3f1cpfe/xfQ==\\",\\"skuDetails\\":[\\"{\\\\\\"productId\\\\\\":\\\\\\"com.carxtech.sr.bank.event.bp\\\\\\",\\\\\\"type\\\\\\":\\\\\\"inapp\\\\\\",\\\\\\"title\\\\\\":\\\\\\"Street Pass (CarX Street)\\\\\\",\\\\\\"name\\\\\\":\\\\\\"Street Pass\\\\\\",\\\\\\"description\\\\\\":\\\\\\"Street Pass\\\\\\",\\\\\\"price\\\\\\":\\\\\\"Rp\\\\\\\\u00a099.000\\\\\\",\\\\\\"price_amount_micros\\\\\\":99000000000,\\\\\\"price_currency_code\\\\\\":\\\\\\"IDR\\\\\\"}\\\"]}",'
    '"marketType":"GOOGLE","productType":0}'
)

# ============================================================
# COMPRESSED STRINGS LOADER
# ============================================================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
ASSETS_CACHE_FILE = os.path.join(CURRENT_DIR, "carx_assets.json")

COMPRESSED_CARS_STRING = ""
COMPRESSED_STRING = ""

def load_strings():
    global COMPRESSED_CARS_STRING, COMPRESSED_STRING
    if COMPRESSED_CARS_STRING and COMPRESSED_STRING:
        return
    # Check cache file first
    if os.path.exists(ASSETS_CACHE_FILE):
        try:
            with open(ASSETS_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                COMPRESSED_CARS_STRING = data.get("cars", "")
                COMPRESSED_STRING = data.get("blueprint", "")
                if COMPRESSED_CARS_STRING and COMPRESSED_STRING:
                    return
        except Exception:
            pass

    # Extract from bot.py if present
    potential_bot_files = [
        os.path.join(PARENT_DIR, "bot.py"),
        os.path.join(CURRENT_DIR, "bot.py"),
        "bot.py"
    ]
    for b_path in potential_bot_files:
        if os.path.exists(b_path):
            try:
                with open(b_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.startswith('COMPRESSED_CARS_STRING = "'):
                            COMPRESSED_CARS_STRING = line.split('"', 2)[1]
                        elif line.startswith('COMPRESSED_STRING = "'):
                            COMPRESSED_STRING = line.split('"', 2)[1]
                        if COMPRESSED_CARS_STRING and COMPRESSED_STRING:
                            break
                if COMPRESSED_CARS_STRING and COMPRESSED_STRING:
                    # Save to cache file for faster boot & standalone Render deployment
                    try:
                        with open(ASSETS_CACHE_FILE, "w", encoding="utf-8") as cf:
                            json.dump({
                                "cars": COMPRESSED_CARS_STRING,
                                "blueprint": COMPRESSED_STRING
                            }, cf)
                    except Exception:
                        pass
                    return
            except Exception as e:
                print(f"Notice: could not read {b_path}: {e}")

load_strings()

# ============================================================
# SAFE DATABASE MANAGEMENT (NON-DESTRUCTIVE)
# ============================================================
def get_db_path():
    parent_db = os.path.join(PARENT_DIR, "keys_db.json")
    if os.path.exists(parent_db):
        return parent_db
    local_db = os.path.join(CURRENT_DIR, "keys_db.json")
    if os.path.exists(local_db):
        return local_db
    if os.path.exists(os.path.join(PARENT_DIR, "bot.py")):
        return parent_db
    return local_db

def load_db():
    db_file = get_db_path()
    default = {"admins": ["mingfu", "daddymingfu"], "keys": {}, "users": {}}
    if not os.path.exists(db_file):
        return default
    try:
        with open(db_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return default
            for k in default:
                if k not in data:
                    data[k] = default[k]
            for adm in ["mingfu", "daddymingfu"]:
                if adm not in data["admins"]:
                    data["admins"].append(adm)
            return data
    except Exception:
        return default

def save_db(db):
    """Safely saves database with backup and atomic replace to prevent corruption."""
    db_file = get_db_path()
    try:
        for adm in ["mingfu", "daddymingfu"]:
            if adm not in db.get("admins", []):
                db.setdefault("admins", []).append(adm)

        if os.path.exists(db_file):
            backup_file = db_file + ".bak"
            shutil.copy2(db_file, backup_file)

        tmp_file = db_file + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=4)
        
        shutil.move(tmp_file, db_file)
        return True
    except Exception as e:
        print(f"Error saving db: {e}")
        return False

def check_access(user_identifier):
    """Checks if user_identifier has valid access or is admin."""
    if not user_identifier:
        return False, None
    uid = str(user_identifier).strip().lower()
    if uid in ["mingfu", "daddymingfu"]:
        return True, "admin"
    db = load_db()
    if uid in [str(a).lower() for a in db.get("admins", [])]:
        return True, "admin"
    
    users = db.get("users", {})
    user = users.get(uid) or users.get(str(user_identifier))
    if not user:
        return False, None
    
    expires = user.get("expires_at")
    if expires and time.time() > expires:
        db["users"].pop(uid, None)
        save_db(db)
        return False, "expired"
    return True, user.get("duration", "active")

def redeem_key(user_identifier, key_input):
    """Validates and redeems a key or elevates to admin if master key."""
    if not key_input:
        return False, "Key cannot be empty", None
    k = key_input.strip().upper()
    uid = str(user_identifier).strip()

    if k in ["MINGFU", "DADDYMINGFU"]:
        db = load_db()
        if uid not in db["admins"]:
            db["admins"].append(uid)
        save_db(db)
        return True, "👑 Master Admin Access Granted!", "admin"

    db = load_db()
    keys = db.get("keys", {})
    if k not in keys:
        return False, "❌ Invalid License Key", None
    
    info = keys[k]
    if info.get("used", False):
        if str(info.get("used_by")) == uid:
            return True, "License key already active on your account", info.get("duration")
        return False, "❌ Key already redeemed by another user", None
    
    dur = info.get("duration", "lifetime")
    if dur == "1d":
        expires = time.time() + 86400
        lbl = "1 Day"
    elif dur == "30d":
        expires = time.time() + (30 * 86400)
        lbl = "30 Days"
    elif dur == "1time":
        expires = None
        lbl = "One-Time"
    else:
        expires = None
        dur = "lifetime"
        lbl = "Lifetime"

    info["used"] = True
    info["used_by"] = uid
    info["redeemed_at"] = time.time()
    db["users"][uid] = {
        "key": k,
        "expires_at": expires,
        "duration": dur
    }
    save_db(db)
    return True, f"🎉 {lbl} Access Activated Successfully!", dur

def consume_one_time_key_if_applicable(user_identifier):
    """If user used a one-time key, deactivates it after a successful boost."""
    db = load_db()
    uid = str(user_identifier).strip()
    user = db.get("users", {}).get(uid)
    if user and user.get("duration") == "1time":
        db["users"].pop(uid, None)
        k = user.get("key")
        if k in db.get("keys", {}):
            db["keys"].pop(k, None)
        save_db(db)
        return True
    return False

def generate_key(duration="1time"):
    """Generates a key and adds it safely to keys_db.json."""
    db = load_db()
    chars = string.ascii_uppercase + string.digits
    key = "CARX-" + "-".join("".join(random.choice(chars) for _ in range(4)) for _ in range(3))
    db["keys"][key] = {
        "duration": duration,
        "used": False,
        "used_by": None,
        "redeemed_at": None,
        "created_at": time.time()
    }
    save_db(db)
    return key

def revoke_key(key_str):
    """Revokes a key and clears associated active users."""
    db = load_db()
    k = key_str.strip().upper()
    removed_key = False
    if k in db.get("keys", {}):
        db["keys"].pop(k, None)
        removed_key = True
    
    users = db.get("users", {})
    to_remove = [uid for uid, info in users.items() if info.get("key") == k]
    for uid in to_remove:
        users.pop(uid, None)
    
    save_db(db)
    return removed_key or len(to_remove) > 0, len(to_remove)

def create_custom_key(key_name, duration="1time", expires_at=None):
    """Creates a custom named key with custom duration/expiration."""
    db = load_db()
    k = key_name.strip().upper()
    if not k:
        return False, "Key name cannot be empty", None
    if k in ["MINGFU", "DADDYMINGFU"]:
        return False, "Cannot use master admin key names", None
    if k in db.get("keys", {}):
        return False, f"Key '{k}' already exists in database", None

    # Calculate expiration timestamp if duration is 1d/30d and expires_at not provided
    now = time.time()
    if expires_at is None:
        if duration == "1d":
            expires_at = now + 86400
        elif duration == "30d":
            expires_at = now + (30 * 86400)
        else:
            expires_at = None

    db["keys"][k] = {
        "duration": duration,
        "expires_at": expires_at,
        "used": False,
        "used_by": None,
        "redeemed_at": None,
        "created_at": now
    }
    save_db(db)
    return True, f"Created custom key {k} ({duration})", k

def update_key(old_key, new_key=None, duration=None, expires_at=None, used=None):
    """Edits an existing key on the spot: rename, change duration, update expiry date, or reset usage status."""
    db = load_db()
    old_k = old_key.strip().upper()
    keys = db.get("keys", {})
    if old_k not in keys:
        return False, f"Key '{old_k}' not found in database", old_k

    target_key = old_k
    key_info = keys[old_k]

    # 1. Rename Key
    if new_key:
        new_k = new_key.strip().upper()
        if new_k != old_k:
            if new_k in keys:
                return False, f"Cannot rename: Key '{new_k}' already exists", old_k
            if new_k in ["MINGFU", "DADDYMINGFU"]:
                return False, "Cannot rename to master admin key names", old_k
            # Move to new key
            keys[new_k] = key_info
            keys.pop(old_k, None)
            target_key = new_k
            # Update user references
            for uid, uinfo in db.get("users", {}).items():
                if uinfo.get("key") == old_k:
                    uinfo["key"] = new_k

    # 2. Update Duration
    if duration is not None:
        key_info["duration"] = duration
        if duration in ["1time", "lifetime"] and expires_at is None:
            key_info["expires_at"] = None
        elif duration == "1d" and expires_at is None:
            key_info["expires_at"] = time.time() + 86400
        elif duration == "30d" and expires_at is None:
            key_info["expires_at"] = time.time() + (30 * 86400)

    # 3. Update Expiration Date
    if expires_at is not None:
        key_info["expires_at"] = expires_at
        # Update user record if redeemed
        for uid, uinfo in db.get("users", {}).items():
            if uinfo.get("key") == target_key:
                uinfo["expires_at"] = expires_at

    # 4. Update Usage / Claim Status
    if used is not None:
        if not used:
            # Reset / unclaim key
            key_info["used"] = False
            key_info["used_by"] = None
            key_info["redeemed_at"] = None
            # Remove from users mapping so someone else can claim it
            to_remove_users = [uid for uid, uinfo in db.get("users", {}).items() if uinfo.get("key") == target_key]
            for uid in to_remove_users:
                db["users"].pop(uid, None)
        else:
            key_info["used"] = True

    save_db(db)
    return True, f"Key '{target_key}' updated successfully on the spot!", target_key

def get_admin_stats():
    """Returns quick metrics for admin dashboard."""
    db = load_db()
    keys = db.get("keys", {})
    total = len(keys)
    claimed = sum(1 for v in keys.values() if v.get("used", False))
    available = total - claimed
    admins_count = len(db.get("admins", []))
    users_count = len(db.get("users", []))
    return {
        "total_keys": total,
        "available_keys": available,
        "claimed_keys": claimed,
        "total_admins": admins_count,
        "active_users": users_count
    }

def clear_claimed_keys():
    """Removes all claimed keys to clean database."""
    db = load_db()
    keys = db.get("keys", {})
    to_pop = [k for k, v in keys.items() if v.get("used", False)]
    for k in to_pop:
        keys.pop(k, None)
    save_db(db)
    return len(to_pop)


# ============================================================
# COMPRESSION / DECOMPRESSION HELPERS
# ============================================================
def compress_data(profile):
    raw = json.dumps(profile, separators=(',', ':')).encode('utf-8')
    gz = gzip.compress(raw)
    return base64.b64encode(len(raw).to_bytes(4, 'little') + gz).decode('ascii')

def decompress_data(s):
    try:
        raw = base64.b64decode(s)
        return json.loads(gzip.decompress(raw[4:]))
    except Exception:
        return None

# ============================================================
# CARX NETWORK API
# ============================================================
def register_account(email, password):
    device_id = str(uuid.uuid4()).replace("-", "")[:32]
    headers = {'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded'}
    try:
        r = requests.post(f"{AUTH_URL}/register",
            data={"project": "STREET", "deviceId": device_id, "deviceUniqueId": device_id},
            headers=headers, timeout=TIMEOUT)
        if r.status_code != 200:
            return False, None, None, None, "Guest token initialization failed"
        j = r.json()
        gt = (j.get("d") or j).get("token", "")
        if not gt:
            return False, None, None, None, "No guest token returned"
        r = requests.post(f"{AUTH_URL}/register",
            data={"project": "STREET", "username": email, "password": password, "deviceId": device_id, "deviceUniqueId": device_id},
            headers={**headers, "Authorization": f"Bearer {gt}"}, timeout=TIMEOUT)
        j = r.json()
        if r.status_code == 200 and j.get("d"):
            return True, j["d"]["token"], j["d"]["carxId"], device_id, None
        return False, None, None, device_id, j.get('e', {}).get('message', str(j))
    except Exception as e:
        return False, None, None, device_id, str(e)

def login_account(email, password):
    device_id = str(uuid.uuid4()).replace("-", "")[:32]
    headers = {'User-Agent': USER_AGENT, 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
    payload = {'deviceId': device_id, 'deviceUniqueId': device_id, 'username': email, 'password': password, 'project': 'STREET'}
    try:
        r = requests.post(f'{AUTH_URL}/login', data=payload, headers=headers, timeout=TIMEOUT)
        if r.status_code == 200:
            data = r.json().get('d', {})
            return data.get('token'), data.get('carxId'), None
        return None, None, f"HTTP {r.status_code}: {r.text}"
    except Exception as e:
        return None, None, str(e)

def get_profile(token):
    headers = {'User-Agent': USER_AGENT, 'Accept': 'application/json', 'Authorization': f'Bearer {token}'}
    try:
        r = requests.get(PROFILE_URL, headers=headers, timeout=TIMEOUT)
        if r.status_code == 200:
            d = r.json().get('d', {}).get('data', {})
            b64 = d.get('compressed_data')
            if b64:
                raw = base64.b64decode(b64)
                return json.loads(gzip.decompress(raw[4:])), None
            # Fresh account with no profile on server yet
            return None, "empty_profile"
        return None, f"HTTP {r.status_code}"
    except Exception as e:
        return None, str(e)

def prepare_fresh_profile(template, carx_id, nickname):
    """
    Configures a clean, working base profile (with anti-ghost spawn and anti-freeze flags),
    matching build_profile in car_x_street_underground.py.
    """
    p = copy.deepcopy(template)
    for k in ['nickname', 'carx_id', 'date_time', 'id', 'user_id', 'carxId', 'email',
              'device_id', 'device_unique_id', 'created_at', 'updated_at']:
        p.pop(k, None)

    p['nickname'] = nickname
    p['carx_id'] = str(carx_id)
    p['date_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Anti-Freeze & Anti-Ghost Mode Flags
    p['is_tutorial_finished'] = True
    p['tutorial_step'] = 100
    p['is_first_start_finished'] = True
    p['is_actual_clubs_send'] = True
    p['has_completed_tutorial'] = True
    p['has_seen_intro'] = True
    p['has_seen_map_tutorial'] = True
    p['onboarding_completed'] = True
    p['is_new_player'] = False
    p['has_first_drive'] = True
    p['has_completed_onboarding'] = True
    p['show_map_on_start'] = False
    p['data_version'] = 73
    p['messaging_version'] = 13
    p['model_upgrade_version'] = 1

    # World spawn position to prevent black screen / ghost view
    p.setdefault('player_position', {
        'x': -123.45, 'y': 12.3, 'z': 456.78,
        'rot_x': 0.0, 'rot_y': 180.0, 'rot_z': 0.0,
        'map': 'industrial'
    })
    p['last_map'] = 'industrial'
    p['current_map'] = 'industrial'

    # Profile customizer defaults
    p.setdefault('profile', {})
    p['profile']['nickname'] = nickname
    p['profile'].setdefault('avatar', 'avatar_default')
    p['profile'].setdefault('banner', 'banner_default')
    p['profile'].setdefault('frame', 'frame_default')

    # Active Car Check: ensure current_car_id is a car that exists in cars.items
    existing_cars = p.get('cars', {}).get('items', {})
    if existing_cars:
        if str(p.get('current_car_id')) not in existing_cars:
            p['current_car_id'] = next(iter(existing_cars.keys()))
    
    # Premium & Street Pass flags
    p['has_premium'] = True
    p['is_premium_active'] = True
    p['is_premium_max_player'] = True
    p['premium_timer'] = 99999999
    p['premium_length'] = 99999999
    p['is_pass_owned'] = True
    p['battle_pass_resource_amount'] = 999999

    return p

def repair_account_profile(token, carx_id, nickname=None):
    """
    Rebuilds and uncorrupts an account back to a fully working state (anti-ghost, anti-freeze),
    matching repair_mode in car_x_street_underground.py.
    """
    if not nickname:
        nickname = f"Driver{random.randint(1000, 9999)}"
    bp = get_blueprint_profile()
    if not bp:
        return False, "Blueprint not available on server"
    
    clean_profile = prepare_fresh_profile(bp, carx_id, nickname)
    # Unlock all maps
    clean_profile['game_world_parts'] = {
        'industrial': {'unlocked': True},
        'midtown': {'unlocked': True},
        'suburb': {'unlocked': True},
        'port': {'unlocked': True},
        'mountain': {'unlocked': True},
        'sunset': {'unlocked': True}
    }
    
    ok, err = save_profile(token, clean_profile)
    if ok:
        return True, clean_profile
    return False, f"Failed to save repaired profile: {err}"

def save_profile(token, profile, retries=5):
    for attempt in range(retries):
        try:
            b64 = compress_data(profile)
            headers = {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            r = requests.post(PROFILE_URL, json={'compressed_data': b64}, headers=headers, timeout=TIMEOUT)
            if r.status_code == 200:
                return True, None
            time.sleep(1.5)
        except Exception as e:
            time.sleep(1.5)
    return False, "Max save retries exceeded"

# ============================================================
# BOOSTING & MANIPULATION FUNCTIONS
# ============================================================
def inject_currency(profile, silver=50000000, gold=9999, xp=999999):
    if "resources" not in profile:
        profile["resources"] = {}
    profile["resources"]["soft"] = {"amount": int(silver)}
    profile["resources"]["hard"] = {"amount": int(gold)}
    profile["resources"]["experience"] = {"amount": int(xp)}
    for key in ['battle_pass_points', 'battle_pass_resource', 'event_points', 'ep', 'bp']:
        profile["resources"][key] = {"amount": 999999}
    profile["has_premium"] = True
    profile["is_premium_active"] = True
    profile["is_premium_max_player"] = True
    profile["premium_timer"] = 99999999
    profile["premium_length"] = 99999999
    profile["is_pass_owned"] = True
    profile["battle_pass_resource_amount"] = 999999

    # Anti-Ban Protection: Synchronize total lifetime statistics
    # CarX Street bans accounts where wallet currency exceeds lifetime earned stats
    stats = profile.setdefault("statistics", {})
    cur_total_soft = stats.get("statistic_total_soft", {}).get("amount", 0) if isinstance(stats.get("statistic_total_soft"), dict) else 0
    cur_total_hard = stats.get("statistic_total_hard", {}).get("amount", 0) if isinstance(stats.get("statistic_total_hard"), dict) else 0
    
    needed_soft = max(float(cur_total_soft), float(silver) + 5000000.0)
    needed_hard = max(float(cur_total_hard), float(gold) + 500.0)
    
    stats["statistic_total_soft"] = {"amount": needed_soft}
    stats["statistic_total_hard"] = {"amount": needed_hard}
    
    # Ensure reasonable play time stats so the account looks authentic
    cur_play_time = stats.get("statistic_playing_time", {}).get("amount", 0) if isinstance(stats.get("statistic_playing_time"), dict) else 0
    if cur_play_time < 3600:
        play_secs = random.uniform(150, 300) * 3600
        stats["statistic_playing_time"] = {"amount": round(play_secs, 2)}
        stats["statistic_drive_time"] = {"amount": round(play_secs * 0.4, 2)}
        stats["statistic_total_distance"] = {"amount": round((play_secs * 0.4 / 3600) * 75, 4)}
        stats["statistic_races_completed"] = {"amount": float(int(play_secs / 300))}
        stats["statistic_races_won"] = {"amount": float(int(play_secs / 300 * 0.7))}

    return profile

def create_slot_data():
    real_estates, real_estate_slots = {}, {}
    for prop in REAL_ESTATE_PROPERTIES:
        slots = [{"unlocked": True, "car_id": "", "is_empty": True} for _ in range(3)]
        real_estates[prop] = {"is_bought": True, "slots": slots}
        for i in range(3):
            real_estate_slots[f"{prop}_slot_{i}"] = {"unlocked": True, "car_id": ""}
    return real_estates, real_estate_slots

def unlock_maps_ultimate(profile):
    if 'game_world_parts' not in profile:
        profile['game_world_parts'] = {}
    for m in ['industrial', 'midtown', 'suburb', 'port', 'mountain', 'sunset']:
        profile['game_world_parts'][m] = {"unlocked": True}

    real_estates, real_estate_slots = create_slot_data()
    if 'real_estates' not in profile:
        profile['real_estates'] = {}
    for prop_id, prop_data in real_estates.items():
        if prop_id not in profile['real_estates']:
            profile['real_estates'][prop_id] = prop_data
        else:
            existing = profile['real_estates'][prop_id]
            existing['is_bought'] = True
            if 'slots' not in existing or len(existing.get('slots', [])) != 3:
                existing['slots'] = prop_data['slots']
            else:
                for slot in existing['slots']:
                    slot['unlocked'] = True
                    if 'car_id' not in slot:
                        slot['car_id'] = ""
    if 'real_estate_slots' not in profile:
        profile['real_estate_slots'] = {}
    for slot_id, slot_data in real_estate_slots.items():
        if slot_id not in profile['real_estate_slots']:
            profile['real_estate_slots'][slot_id] = slot_data
        else:
            profile['real_estate_slots'][slot_id]['unlocked'] = True
            if 'car_id' not in profile['real_estate_slots'][slot_id]:
                profile['real_estate_slots'][slot_id]['car_id'] = ""

    if 'locations' not in profile:
        profile['locations'] = {}
    if 'default' not in profile['locations']:
        profile['locations']['default'] = {}
    if 'location_objects_set' not in profile['locations']['default']:
        profile['locations']['default']['location_objects_set'] = {'keys': []}
    loc_keys = profile['locations']['default']['location_objects_set']['keys']
    for p in REAL_ESTATE_PROPERTIES + EXTRA_LOCATION_KEYS:
        if p not in loc_keys:
            loc_keys.append(p)

    if 'race_generators' not in profile:
        profile['race_generators'] = {}
    ts = int(time.time())
    mountain = profile['race_generators'].setdefault('game_world_mountain_farm_races', {})
    mountain['races_counter'] = {"keys": ["mountain_race_farm_drift_DM001", "mountain_race_farm_sprint_ST001", "mountain_race_farm_free_drift_AO01", "mountain_race_farm_gymkhana_ao04"], "values": [1,2,3,4]}
    mountain['races_set'] = {"keys": ["mountain_race_farm_drift_DM005", "mountain_race_farm_sprint_ST004", "mountain_race_farm_free_drift_AO02", "mountain_race_farm_gymkhana_ao08"], "values": [1,2,3,4]}
    sunset = profile['race_generators'].setdefault('game_world_sunset_farm_races', {})
    sunset['races_counter'] = {"keys": ["speedway_race_farm_free_drift_AO01", "speedway_race_farm_sprint_DM01", "speedway_race_farm_sprint_DM05", "speedway_race_farm_gymkhana_ao01"], "values": [1,2,3,4]}
    sunset['races_set'] = {"keys": ["speedway_race_farm_free_drift_AO02", "speedway_race_farm_sprint_DM02", "speedway_race_simple_drift_DM01", "speedway_race_farm_gymkhana_ao01"], "values": [1,2,3,4]}
    if 'races_ts' not in profile:
        profile['races_ts'] = {"keys": [], "values": []}
    all_keys = []
    for gen in [mountain, sunset]:
        all_keys.extend(gen.get('races_counter', {}).get('keys', []))
        all_keys.extend(gen.get('races_set', {}).get('keys', []))
    for k in all_keys:
        if k not in profile['races_ts']['keys']:
            profile['races_ts']['keys'].append(k)
            profile['races_ts']['values'].append(ts)
    profile['is_tutorial_finished'] = True
    profile['tutorial_step'] = 600
    return profile

def unlock_streetpass(token):
    headers = {
        "Host": "street-prod.carx-online.com",
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Accept-Encoding": "deflate, gzip",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "X-Unity-Version": "6000.0.64f1",
    }
    s = requests.Session()
    for attempt in range(3):
        try:
            bp = STREETPASS_BODY.encode()
            headers["Content-Length"] = str(len(bp))
            r = s.post(BATTLEPASS_URL, data=bp, headers=headers, timeout=TIMEOUT)
            if r.status_code == 200:
                ep_body = STREETPASS_BODY.replace(
                    "com.carxtech.sr.bank.event.bp",
                    "com.carxtech.sr.bank.event.ep_big"
                ).encode()
                headers["Content-Length"] = str(len(ep_body))
                for _ in range(3):
                    s.post(BATTLEPASS_URL, data=ep_body, headers=headers, timeout=TIMEOUT)
                return True, None
            time.sleep(1.5)
        except Exception as e:
            time.sleep(1.5)
    return False, "Street Pass server verification timed out"

def max_streetpass_points(profile, points=1000000):
    if 'resources' not in profile:
        profile['resources'] = {}
    profile['resources']['street_pass'] = {'amount': points}
    profile['resources']['battle_pass_points'] = {'amount': points}
    profile['resources']['battle_pass_resource'] = {'amount': points}
    profile['resources']['event_points'] = {'amount': points}
    profile['resources']['ep'] = {'amount': points}
    profile['resources']['bp'] = {'amount': points}

    profile['is_pass_owned'] = True
    profile['has_premium'] = True
    profile['is_premium_active'] = True
    profile['is_premium_max_player'] = True
    profile['premium_timer'] = 99999999
    profile['premium_length'] = 99999999
    profile['battle_pass_resource_amount'] = points

    if 'postprogression_counter' not in profile:
        profile['postprogression_counter'] = {}
    if 'battle_pass_event_rewards' not in profile:
        profile['battle_pass_event_rewards'] = {}
    return profile

def extract_cars_from_compressed(s):
    if not s:
        return None
    data = decompress_data(s)
    if not data:
        return None
    cars = {}
    if isinstance(data, dict):
        if 'cars' in data and isinstance(data['cars'], dict) and 'items' in data['cars']:
            cars = data['cars']['items']
        else:
            for v in data.values():
                if isinstance(v, dict) and '__desc_id' in v:
                    cars = data
                    break
    if not cars:
        return None
    extracted = {}
    for cid, cfg in cars.items():
        if isinstance(cfg, dict) and cfg.get('__desc_id'):
            extracted[str(cid)] = json.loads(json.dumps(cfg))
    return extracted if extracted else None

def get_car_data():
    load_strings()
    if COMPRESSED_CARS_STRING:
        cars = extract_cars_from_compressed(COMPRESSED_CARS_STRING)
        if cars:
            return cars
    if COMPRESSED_STRING:
        blueprint = decompress_data(COMPRESSED_STRING)
        if blueprint:
            cars = blueprint.get('cars', {}).get('items', {})
            if cars:
                extracted = {}
                for cid, cfg in cars.items():
                    if isinstance(cfg, dict) and cfg.get('__desc_id'):
                        extracted[str(cid)] = json.loads(json.dumps(cfg))
                return extracted
    return None

def get_active_fleet_meta():
    """Returns metadata about the active stored car fleet."""
    load_strings()
    meta = {}
    if os.path.exists(ASSETS_CACHE_FILE):
        try:
            with open(ASSETS_CACHE_FILE, "r", encoding="utf-8") as f:
                d = json.load(f)
                meta = d.get("fleet_meta", {})
        except Exception:
            pass
    if not meta:
        cars = get_car_data()
        if cars:
            models = [c.get("__desc_id") for c in cars.values() if isinstance(c, dict) and c.get("__desc_id")]
            uniq = sorted(list(set(models)))
            meta = {
                "total_cars": len(cars),
                "unique_models": len(uniq),
                "source_nickname": "Stored Fleet",
                "models_sample": uniq[:12],
                "updated_at": "Ready"
            }
        else:
            meta = {
                "total_cars": 0,
                "unique_models": 0,
                "source_nickname": "None",
                "models_sample": [],
                "updated_at": "None"
            }
    return meta

def extract_cars_from_source_account(email, password):
    """
    Extracts all cars from any source account (matching CARSONLY.py.py),
    saves them permanently into carx_assets.json and updates active memory.
    """
    global COMPRESSED_CARS_STRING
    token, carx_id, err = login_account(email, password)
    if not token:
        return False, f"Login failed: {err}", None
    
    profile, err_prof = get_profile(token)
    if not profile:
        return False, f"Failed to download profile: {err_prof}", None
    
    cars = profile.get('cars', {}).get('items', {})
    if not cars or not isinstance(cars, dict):
        return False, "No vehicles found in source account profile", None
    
    extracted = {}
    for cid, cfg in cars.items():
        if isinstance(cfg, dict) and cfg.get('__desc_id'):
            extracted[str(cid)] = json.loads(json.dumps(cfg))
    
    if not extracted:
        return False, "No valid vehicle configurations extracted", None
    
    car_list = [v.get('__desc_id') for v in extracted.values()]
    unique_models = sorted(list(set(car_list)))
    source_nick = profile.get('profile', {}).get('nickname') or profile.get('nickname', 'Unknown Driver')
    
    # Pack into compressed CarX string format
    payload = {'cars': {'seed': max(1086, len(extracted) + 1000), 'items': extracted}}
    new_compressed_str = compress_data(payload)
    
    # Store in memory
    COMPRESSED_CARS_STRING = new_compressed_str
    
    # Save permanently into carx_assets.json
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    fleet_meta = {
        'total_cars': len(extracted),
        'unique_models': len(unique_models),
        'source_nickname': source_nick,
        'source_carx_id': str(carx_id),
        'models_sample': unique_models[:15],
        'updated_at': now_str
    }
    
    try:
        data_to_write = {}
        if os.path.exists(ASSETS_CACHE_FILE):
            try:
                with open(ASSETS_CACHE_FILE, 'r', encoding='utf-8') as f:
                    data_to_write = json.load(f)
            except Exception:
                pass
        data_to_write['cars'] = new_compressed_str
        data_to_write['fleet_meta'] = fleet_meta
        with open(ASSETS_CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data_to_write, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not cache fleet to file: {e}")
    
    return True, f"Successfully extracted {len(extracted)} cars ({len(unique_models)} unique models) from {source_nick}!", fleet_meta

def implant_cars(profile, cars_to_add):
    """
    Adds cars to target account using the exact CARSONLY.py.py algorithm:
    - Automatically checks existing models to avoid duplicates.
    - Preserves all existing progress, settings, and stats.
    - Updates car_models index to prevent 'Loading Profile' freeze.
    Returns: (updated_profile, added_count, skipped_list)
    """
    if not cars_to_add:
        return profile, 0, []
    
    existing_cars = profile.get('cars', {}).get('items', {})
    if not isinstance(existing_cars, dict):
        existing_cars = {}
    
    # Track existing models to avoid duplicate injection that corrupts profile
    existing_models = set()
    for car in existing_cars.values():
        if isinstance(car, dict):
            desc = car.get('__desc_id')
            if desc:
                existing_models.add(desc)
    
    # Find max existing item ID
    max_id = 1000
    for car_id in existing_cars.keys():
        try:
            cid = int(car_id)
            if cid > max_id:
                max_id = cid
        except Exception:
            pass
    
    new_cars_added = 0
    skipped = []
    
    for _, src_car in cars_to_add.items():
        if not isinstance(src_car, dict):
            continue
        desc_id = src_car.get('__desc_id')
        if not desc_id:
            continue
        
        # Skip if target already has this model
        if desc_id in existing_models:
            skipped.append(desc_id)
            continue
        
        max_id += 1
        new_car = json.loads(json.dumps(src_car))
        existing_cars[str(max_id)] = new_car
        existing_models.add(desc_id)
        new_cars_added += 1
    
    # Update cars section
    profile['cars'] = {
        'seed': max(1000, max_id + 1),
        'items': existing_cars
    }
    
    # Synchronize car_models index so game engine never hangs on Loading Profile
    if 'car_models' in profile and isinstance(profile['car_models'], dict) and 'keys' in profile['car_models']:
        curr_keys = set(profile['car_models'].get('keys', []))
        for desc_id in existing_models:
            if desc_id not in curr_keys:
                profile['car_models']['keys'].append(desc_id)
                profile['car_models'].setdefault('values', []).append(1)
    
    if profile.get('current_car_id') not in existing_cars:
        profile['current_car_id'] = next(iter(existing_cars.keys()), '1000')
    
    return profile, new_cars_added, skipped

def get_blueprint_profile():
    load_strings()
    if not COMPRESSED_STRING:
        return None
    return decompress_data(COMPRESSED_STRING)
