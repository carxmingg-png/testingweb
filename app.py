#!/usr/bin/env python3
"""
CarX Street - Gamer Web Application Server
Powered by FastAPI & Uvicorn (Ready for Render & Production)
"""

import os
import sys
import uuid
import time
from typing import Optional
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

# Import core engine
import carx_engine

app = FastAPI(
    title="CarX Street Cyberpunk Control Hub",
    description="Cyberpunk Gamer Web Portal for CarX Street Profile Management & Boosting",
    version="2.0.0"
)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# Mount Static Files
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# ============================================================
# IN-MEMORY WEB SESSION STORAGE
# ============================================================
web_sessions = {}

def get_session(request: Request) -> dict:
    session_id = request.cookies.get("carx_session_id")
    if not session_id or session_id not in web_sessions:
        session_id = str(uuid.uuid4())
        web_sessions[session_id] = {
            "session_id": session_id,
            "user_identifier": None,
            "access_type": None,
            "is_admin": False,
            "email": "",
            "carx_id": "",
            "token": None,
            "profile": None,
            "last_active": time.time()
        }
    else:
        web_sessions[session_id]["last_active"] = time.time()
    return web_sessions[session_id]

# ============================================================
# REQUEST SCHEMAS
# ============================================================
class KeyVerifyRequest(BaseModel):
    key: str

class AuthLoginRequest(BaseModel):
    email: str
    password: str

class AuthRegisterRequest(BaseModel):
    email: str
    password: str

class CurrencyBoostRequest(BaseModel):
    tier: str  # "max", "med", "custom"
    silver: Optional[int] = 50000000
    gold: Optional[int] = 9999
    xp: Optional[int] = 999999

class CarsBoostRequest(BaseModel):
    option: str  # "all", "random", "first_50", "custom"
    count: Optional[int] = 10

class AdminKeyGenerateRequest(BaseModel):
    duration: str  # "1time", "1d", "30d", "lifetime"

class AdminCustomKeyRequest(BaseModel):
    key_name: str
    duration: str = "1time"
    custom_days: Optional[int] = None
    expires_at: Optional[float] = None

class AdminKeyUpdateRequest(BaseModel):
    old_key: str
    new_key: Optional[str] = None
    duration: Optional[str] = None
    expires_at: Optional[float] = None
    used: Optional[bool] = None

class AdminKeyRevokeRequest(BaseModel):
    key: str

class AdminExtractFleetRequest(BaseModel):
    email: str
    password: str

# ============================================================
# ROUTES: WEB PAGES & HEALTH
# ============================================================
@app.get("/health")
def health_check():
    return {"status": "online", "service": "CarX Street Cyber Hub", "timestamp": time.time()}

@app.get("/", response_class=HTMLResponse)
def serve_index(request: Request):
    session = get_session(request)
    try:
        response = templates.TemplateResponse(
            request=request,
            name="index.html",
            context={"session": session}
        )
    except TypeError:
        response = templates.TemplateResponse(
            "index.html",
            {"request": request, "session": session}
        )
    response.set_cookie(
        key="carx_session_id",
        value=session["session_id"],
        httponly=True,
        samesite="lax",
        max_age=86400 * 30
    )
    return response

# ============================================================
# API: KEY VERIFICATION & ACCESS
# ============================================================
@app.post("/api/key/verify")
def api_verify_key(payload: KeyVerifyRequest, request: Request, response: Response):
    session = get_session(request)
    key_input = payload.key.strip()
    
    ok, msg, dur = carx_engine.redeem_key(session["session_id"], key_input)
    if not ok:
        return JSONResponse(status_code=400, content={"success": False, "message": msg})
    
    session["user_identifier"] = session["session_id"]
    session["access_type"] = dur
    session["is_admin"] = (dur == "admin")
    
    res = JSONResponse(content={
        "success": True,
        "message": msg,
        "access_type": dur,
        "is_admin": session["is_admin"]
    })
    res.set_cookie("carx_session_id", session["session_id"], httponly=True, max_age=86400 * 30)
    return res

@app.get("/api/key/status")
def api_key_status(request: Request):
    session = get_session(request)
    if session.get("is_admin"):
        return {"has_access": True, "access_type": "admin", "is_admin": True}
    has_access, access_type = carx_engine.check_access(session.get("user_identifier"))
    session["access_type"] = access_type
    session["is_admin"] = (access_type == "admin")
    return {
        "has_access": has_access,
        "access_type": access_type,
        "is_admin": session["is_admin"]
    }

# ============================================================
# API: CARX ACCOUNT AUTH (LOGIN / REGISTER)
# ============================================================
def require_license_gate(session: dict):
    if session.get("is_admin"):
        return True
    has_access, _ = carx_engine.check_access(session.get("user_identifier"))
    if not has_access:
        raise HTTPException(status_code=403, detail="License Key Required. Please enter a valid key to access.")

@app.post("/api/auth/register")
def api_auth_register(payload: AuthRegisterRequest, request: Request):
    session = get_session(request)
    require_license_gate(session)
    
    email = payload.email.strip()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password cannot be empty.")
    
    blueprint = carx_engine.get_blueprint_profile()
    if not blueprint:
        raise HTTPException(status_code=500, detail="Blueprint assets missing on server.")
    
    ok, token, carx_id, _, err = carx_engine.register_account(email, password)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Registration failed: {err}")
    
    # Inject blueprint profile
    ok_save, err_save = carx_engine.save_profile(token, blueprint)
    if not ok_save:
        raise HTTPException(status_code=500, detail=f"Account created, but blueprint injection failed: {err_save}")
    
    session["token"] = token
    session["carx_id"] = str(carx_id)
    session["email"] = email
    session["profile"] = blueprint
    
    carx_engine.consume_one_time_key_if_applicable(session["user_identifier"])
    
    return {
        "success": True,
        "message": f"🎉 Account created & Blueprint injected successfully! CarX ID: {carx_id}",
        "carx_id": carx_id,
        "email": email
    }

@app.post("/api/auth/login")
def api_auth_login(payload: AuthLoginRequest, request: Request):
    session = get_session(request)
    require_license_gate(session)
    
    email = payload.email.strip()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password cannot be empty.")
    
    token, carx_id, err = carx_engine.login_account(email, password)
    if not token:
        raise HTTPException(status_code=400, detail=f"Login failed: {err}")
    
    profile, err_prof = carx_engine.get_profile(token)
    if not profile:
        raise HTTPException(status_code=400, detail=f"Profile sync failed: {err_prof}. Please launch the game at least once.")
    
    session["token"] = token
    session["carx_id"] = str(carx_id)
    session["email"] = email
    session["profile"] = profile
    
    return {
        "success": True,
        "message": "✅ Connected to CarX Street servers!",
        "carx_id": carx_id,
        "email": email
    }

@app.post("/api/auth/logout")
def api_auth_logout(request: Request):
    session = get_session(request)
    session["token"] = None
    session["carx_id"] = ""
    session["email"] = ""
    session["profile"] = None
    return {"success": True, "message": "Logged out."}

# ============================================================
# API: PROFILE STATS
# ============================================================
@app.get("/api/profile")
def api_get_profile(request: Request):
    session = get_session(request)
    logged_in = bool(session.get("token") and session.get("profile"))
    
    if not logged_in:
        return {
            "logged_in": False,
            "access_type": session.get("access_type"),
            "is_admin": session.get("is_admin", False)
        }
    
    prof = session["profile"]
    resources = prof.get("resources", {})
    silver = resources.get("soft", {}).get("amount", 0)
    gold = resources.get("hard", {}).get("amount", 0)
    xp = resources.get("experience", {}).get("amount", 0)
    
    maps = prof.get("game_world_parts", {})
    maps_unlocked = sum(1 for v in maps.values() if isinstance(v, dict) and v.get("unlocked"))
    
    cars_items = prof.get("cars", {}).get("items", {})
    cars_count = len(cars_items) if isinstance(cars_items, dict) else 0
    
    streetpass = bool(prof.get("is_pass_owned", False))
    premium = bool(prof.get("has_premium", False))
    
    return {
        "logged_in": True,
        "email": session.get("email"),
        "carx_id": session.get("carx_id"),
        "silver": silver,
        "gold": gold,
        "xp": xp,
        "maps_unlocked": maps_unlocked,
        "total_maps": 6,
        "cars_count": cars_count,
        "streetpass": streetpass,
        "premium": premium,
        "access_type": session.get("access_type"),
        "is_admin": session.get("is_admin", False)
    }

# ============================================================
# API: BOOST OPERATIONS
# ============================================================
def require_login(session: dict):
    require_license_gate(session)
    if not session.get("token") or not session.get("profile"):
        raise HTTPException(status_code=401, detail="Please login to your CarX Street account first.")

@app.post("/api/boost/currency")
def api_boost_currency(payload: CurrencyBoostRequest, request: Request):
    session = get_session(request)
    require_login(session)
    
    if payload.tier == "max":
        silver, gold, xp = 50000000, 9999, 999999
    elif payload.tier == "med":
        silver, gold, xp = 10000000, 5000, 100000
    else:
        silver = max(0, int(payload.silver or 0))
        gold = max(0, int(payload.gold or 0))
        xp = max(0, int(payload.xp or 0))
    
    updated_profile = carx_engine.inject_currency(session["profile"], silver, gold, xp)
    ok, err = carx_engine.save_profile(session["token"], updated_profile)
    if not ok:
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {err}")
    
    session["profile"] = updated_profile
    carx_engine.consume_one_time_key_if_applicable(session["user_identifier"])
    
    return {
        "success": True,
        "message": f"💎 Currency Boost Applied! Silver: {silver:,}, Gold: {gold:,}, XP: {xp:,}",
        "silver": silver,
        "gold": gold,
        "xp": xp
    }

@app.post("/api/boost/maps")
def api_boost_maps(request: Request):
    session = get_session(request)
    require_login(session)
    
    updated_profile = carx_engine.unlock_maps_ultimate(session["profile"])
    ok, err = carx_engine.save_profile(session["token"], updated_profile)
    if not ok:
        raise HTTPException(status_code=500, detail=f"Failed to save map unlock: {err}")
    
    session["profile"] = updated_profile
    carx_engine.consume_one_time_key_if_applicable(session["user_identifier"])
    
    return {
        "success": True,
        "message": "🗺️ All 6 Maps, World Regions, and Real Estate Properties Unlocked!"
    }

@app.post("/api/boost/cars")
def api_boost_cars(payload: CarsBoostRequest, request: Request):
    session = get_session(request)
    require_login(session)
    
    car_data = carx_engine.get_car_data()
    if not car_data:
        own = session["profile"].get("cars", {}).get("items", {})
        if own:
            car_data = own
        else:
            raise HTTPException(status_code=400, detail="No car database found and garage is empty.")
    
    option = payload.option
    if option == "all":
        selected = car_data
        lbl = "All Vehicles"
    elif option == "random":
        num = min(10, len(car_data))
        selected = dict(random.sample(list(car_data.items()), num))
        lbl = "10 Random Vehicles"
    elif option == "first_50":
        num = min(50, len(car_data))
        selected = dict(list(car_data.items())[:num])
        lbl = f"First {num} Vehicles"
    else:
        cnt = max(1, min(int(payload.count or 10), len(car_data)))
        selected = dict(random.sample(list(car_data.items()), cnt))
        lbl = f"{cnt} Custom Vehicles"
    
    updated_profile, added, skipped = carx_engine.implant_cars(session["profile"], selected)
    ok, err = carx_engine.save_profile(session["token"], updated_profile)
    if not ok:
        raise HTTPException(status_code=500, detail=f"Failed to save cars: {err}")
    
    session["profile"] = updated_profile
    carx_engine.consume_one_time_key_if_applicable(session["user_identifier"])
    
    total_cars = len(updated_profile.get("cars", {}).get("items", {}))
    skipped_count = len(skipped)
    skip_msg = f" ({skipped_count} already owned models safely skipped)" if skipped_count > 0 else ""
    return {
        "success": True,
        "message": f"🚗 Injected {added} cars from {lbl}!{skip_msg} Total in garage: {total_cars}",
        "added": added,
        "skipped": skipped_count,
        "skipped_models": skipped[:10],
        "total_cars": total_cars
    }

@app.post("/api/boost/streetpass")
def api_boost_streetpass(request: Request):
    session = get_session(request)
    require_login(session)
    
    # Server side unlock verification
    carx_engine.unlock_streetpass(session["token"])
    
    updated_profile = carx_engine.max_streetpass_points(session["profile"], 1000000)
    ok, err = carx_engine.save_profile(session["token"], updated_profile)
    if not ok:
        raise HTTPException(status_code=500, detail=f"Failed to save Street Pass: {err}")
    
    session["profile"] = updated_profile
    carx_engine.consume_one_time_key_if_applicable(session["user_identifier"])
    
    return {
        "success": True,
        "message": "🎟️ Street Pass & Elite Pass maxed out with Premium flags activated!"
    }

@app.post("/api/boost/all")
def api_boost_all(request: Request):
    session = get_session(request)
    require_login(session)
    
    profile = session["profile"]
    profile = carx_engine.unlock_maps_ultimate(profile)
    profile = carx_engine.inject_currency(profile, 50000000, 9999, 999999)
    profile = carx_engine.max_streetpass_points(profile, 1000000)
    
    # Best effort server verify
    carx_engine.unlock_streetpass(session["token"])
    
    ok, err = carx_engine.save_profile(session["token"], profile)
    if not ok:
        raise HTTPException(status_code=500, detail=f"All-in-One boost failed to save: {err}")
    
    session["profile"] = profile
    carx_engine.consume_one_time_key_if_applicable(session["user_identifier"])
    
    return {
        "success": True,
        "message": "⚡ GOD MODE ACTIVATED! Maps, Max Currency, and Street Pass boosted in one strike!"
    }

@app.post("/api/profile/refresh")
def api_profile_refresh(request: Request):
    session = get_session(request)
    if not session.get("token"):
        raise HTTPException(status_code=401, detail="Not logged in.")
    
    profile, err = carx_engine.get_profile(session["token"])
    if not profile:
        raise HTTPException(status_code=400, detail=f"Refresh failed: {err}")
    
    session["profile"] = profile
    return {"success": True, "message": "🔄 Profile synchronized with CarX Street servers!"}

# ============================================================
# API: ADMIN KEY MANAGEMENT
# ============================================================
def require_admin(session: dict):
    if not session.get("is_admin"):
        raise HTTPException(status_code=403, detail="👑 Admin privileges required.")

@app.get("/api/admin/keys")
def api_admin_list_keys(request: Request):
    session = get_session(request)
    require_admin(session)
    
    db = carx_engine.load_db()
    keys = db.get("keys", {})
    return {"success": True, "keys": keys, "total": len(keys)}

@app.get("/api/admin/stats")
def api_admin_stats(request: Request):
    session = get_session(request)
    require_admin(session)
    return {"success": True, "stats": carx_engine.get_admin_stats()}

@app.post("/api/admin/keys/custom")
def api_admin_create_custom_key(payload: AdminCustomKeyRequest, request: Request):
    session = get_session(request)
    require_admin(session)
    
    exp = payload.expires_at
    if exp is None and payload.custom_days:
        exp = time.time() + (payload.custom_days * 86400)
    
    ok, msg, k = carx_engine.create_custom_key(payload.key_name, payload.duration, exp)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "key": k}

@app.put("/api/admin/keys/update")
def api_admin_update_key(payload: AdminKeyUpdateRequest, request: Request):
    session = get_session(request)
    require_admin(session)
    
    ok, msg, target_key = carx_engine.update_key(
        old_key=payload.old_key,
        new_key=payload.new_key,
        duration=payload.duration,
        expires_at=payload.expires_at,
        used=payload.used
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "key": target_key}

@app.post("/api/admin/keys/generate")
def api_admin_generate_key(payload: AdminKeyGenerateRequest, request: Request):
    session = get_session(request)
    require_admin(session)
    
    dur = payload.duration
    if dur not in ["1time", "1d", "30d", "lifetime"]:
        dur = "1time"
    
    key = carx_engine.generate_key(dur)
    return {"success": True, "key": key, "duration": dur}

@app.post("/api/admin/keys/revoke")
def api_admin_revoke_key(payload: AdminKeyRevokeRequest, request: Request):
    session = get_session(request)
    require_admin(session)
    
    ok, count = carx_engine.revoke_key(payload.key)
    if not ok:
        raise HTTPException(status_code=404, detail="Key not found.")
    return {"success": True, "message": f"Revoked key. {count} active user(s) removed."}

@app.post("/api/admin/keys/clear_claimed")
def api_admin_clear_claimed(request: Request):
    session = get_session(request)
    require_admin(session)
    
    count = carx_engine.clear_claimed_keys()
    return {"success": True, "message": f"🧹 Cleared {count} claimed keys from database."}

# ============================================================
# API: ADMIN FLEET EXTRACTOR & MANAGER
# ============================================================
@app.get("/api/admin/cars/status")
def api_admin_fleet_status(request: Request):
    session = get_session(request)
    require_admin(session)
    meta = carx_engine.get_active_fleet_meta()
    return {"success": True, "fleet": meta}

@app.post("/api/admin/cars/extract")
def api_admin_extract_fleet(payload: AdminExtractFleetRequest, request: Request):
    session = get_session(request)
    require_admin(session)
    
    email = payload.email.strip()
    password = payload.password.strip()
    if not email or not password:
        raise HTTPException(status_code=400, detail="Source Account Email and Password are required.")
    
    ok, msg, meta = carx_engine.extract_cars_from_source_account(email, password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    
    return {
        "success": True,
        "message": msg,
        "fleet": meta
    }

# ============================================================
# STARTUP FOR DIRECT RUN
# ============================================================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting CarX Street Cyberpunk Web App on port {port}...")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
