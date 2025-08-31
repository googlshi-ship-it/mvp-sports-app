from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Literal
import uuid
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import requests
import asyncio
import csv
from io import StringIO
from jose import jwt, JWTError
from passlib.hash import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 240

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------------------
# Utils
# ---------------------------

def start_of_day(dt: datetime) -> datetime:
    dt = dt.astimezone(timezone.utc)
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


async def ensure_indexes():
    await db.matches.create_index("startTime")
    await db.matches.create_index("sourceId", unique=True)
    await db.ratings.create_index("matchId")
    await db.votes.create_index("matchId")
    await db.push_tokens.create_index("token", unique=True)
    await db.notifications.create_index([("deliverAt", 1)])
    await db.notifications.create_index([("status", 1)])
    await db.notifications.create_index([("matchId", 1)])
    await db.notifications.create_index([("matchId", 1), ("token", 1), ("type", 1)], unique=True)
    await db.device_votes.create_index([("matchId", 1), ("token", 1)], unique=True)
    await db.dispatch_logs.create_index([("ts", -1)])
    await db.player_ratings.create_index([("matchId", 1), ("token", 1), ("player", 1)], unique=True)
    await db.users.create_index("email", unique=True)


@app.on_event("startup")
async def on_startup():
    try:
        await ensure_indexes()
    except Exception as e:
        logger.warning(f"Index ensure failed: {e}")
    asyncio.create_task(_dispatch_loop())


# ---------------------------
# Models
# ---------------------------
Sport = Literal["football", "basketball", "ufc"]


class Team(BaseModel):
    type: Literal["club", "national"]
    name: str
    countryCode: Optional[str] = None


class Score(BaseModel):
    home: Optional[int] = None
    away: Optional[int] = None


class MatchBase(BaseModel):
    sport: Sport
    tournament: str
    subgroup: Optional[str] = None
    homeTeam: Team
    awayTeam: Team
    startTime: datetime
    status: Literal["scheduled", "live", "finished"] = "scheduled"
    score: Optional[Score] = None
    channels: Dict[str, List[str]] = Field(default_factory=dict)
    source: Optional[str] = None
    sourceId: Optional[str] = None


class MatchDB(MatchBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}


class MatchCreate(MatchBase):
    pass


class RateInput(BaseModel):
    like: bool


VoteCategory = Literal[
    "mvp",
    "scorer",
    "assist",
    "defender",
    "goalkeeper",
    "fight_of_the_night",
    "performance_of_the_night",
]


class VoteInput(BaseModel):
    category: VoteCategory
    player: str
    token: Optional[str] = None


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StatusCheckCreate(BaseModel):
    client_name: str


# -------- Auth Models --------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    score: int


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_user_from_token(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = data.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")


async def update_user_score(user_id: ObjectId, delta: int):
    await db.users.update_one({"_id": user_id}, {"$inc": {"score": int(delta)}})


# -------- Static Config --------
THESPORTSDB_KEY = os.environ.get("THESPORTSDB_KEY", "3")
SPORT_MAP = {"football": "Soccer", "basketball": "Basketball", "ufc": "Fighting"}
CHANNELS_CH = {"football": ["blue Sport", "SRF zwei"], "basketball": ["SRF zwei"], "ufc": ["blue Sport", "UFC Fight Pass"]}


def categories_for_sport(sport: str) -> List[str]:
    if sport == "football":
        return ["mvp", "scorer", "assist", "defender", "goalkeeper"]
    if sport == "basketball":
        return ["mvp", "scorer", "assist", "defender"]
    if sport == "ufc":
        return ["fight_of_the_night", "performance_of_the_night"]
    return ["mvp"]


def match_duration_minutes(sport: str) -> int:
    if sport == "football":
        return 120
    if sport == "basketball":
        return 120
    if sport == "ufc":
        return 180
    return 120


# ---------------------------
# Routes: Auth
# ---------------------------
@api_router.post("/auth/register")
async def register(body: RegisterInput):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hash(body.password)
    res = await db.users.insert_one({
        "email": body.email.lower(),
        "password": hashed,
        "score": 0,
        "createdAt": datetime.utcnow(),
    })
    user_id = str(res.inserted_id)
    token = create_token(user_id, body.email.lower())
    return {"token": token, "user": {"id": user_id, "email": body.email.lower(), "score": 0}}


@api_router.post("/auth/login")
async def login(body: LoginInput):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not bcrypt.verify(body.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(str(user["_id"]), user["email"])
    return {"token": token, "user": {"id": str(user["_id"]), "email": user["email"], "score": user.get("score", 0)}}


@api_router.get("/me", response_model=UserOut)
async def me(current=Depends(get_user_from_token)):
    return {"id": str(current["_id"]), "email": current["email"], "score": current.get("score", 0)}


@api_router.get("/leaderboard")
async def leaderboard():
    users = await db.users.find({}, {"email": 1, "score": 1}).sort("score", -1).limit(20).to_list(20)
    return [{"id": str(u["_id"]), "email": u["email"], "score": u.get("score", 0)} for u in users]


# ---------------------------
# Routes: Core & Matches
# ---------------------------
@api_router.get("/")
async def root():
    return {"message": "MVP backend running"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


@api_router.post("/matches", response_model=MatchDB)
async def create_match(match: MatchCreate):
    doc = match.dict()
    if not doc.get("sourceId"):
        doc["sourceId"] = f"manual_{uuid.uuid4()}"
        doc["source"] = "manual"
    res = await db.matches.insert_one(doc)
    created = await db.matches.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])  # type: ignore
    return MatchDB(**created)


@api_router.get("/matches", response_model=List[MatchDB])
async def list_matches(country: Optional[str] = None, sport: Optional[Sport] = None, status: Optional[str] = None):
    q: Dict = {}
    if sport:
        q["sport"] = sport
    if status:
        q["status"] = status
    items = await db.matches.find(q).sort("startTime", 1).to_list(1000)
    for item in items:
        item["_id"] = str(item["_id"])  # type: ignore
    return [MatchDB(**m) for m in items]


@api_router.get("/matches/grouped")
async def matches_grouped(country: Optional[str] = None):
    now = datetime.now(timezone.utc)
    sod = start_of_day(now)
    today_end = sod + timedelta(days=1)
    tomorrow_end = sod + timedelta(days=2)
    week_end = sod + timedelta(days=7)
    items = await db.matches.find({"startTime": {"$gte": sod, "$lte": week_end}}).sort("startTime", 1).to_list(1000)

    def pick_channels(m):
        if country and country in m.get("channels", {}):
            ch = m["channels"][country]
        else:
            ch = []
        return ch

    grouped = {"today": [], "tomorrow": [], "week": []}
    for m in items:
        st = m["startTime"]
        if isinstance(st, str):
            st = datetime.fromisoformat(st)
        if st <= today_end:
            bucket = "today"
        elif st <= tomorrow_end:
            bucket = "tomorrow"
        else:
            bucket = "week"
        grouped[bucket].append({
            **m,
            "id": str(m["_id"]),
            "channelsForCountry": pick_channels(m),
        })
    return grouped


@api_router.get("/matches/{match_id}", response_model=MatchDB)
async def get_match(match_id: str):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    m = await db.matches.find_one({"_id": oid})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    m["_id"] = str(m["_id"])  # type: ignore
    return MatchDB(**m)


@api_router.get("/matches/{match_id}/rating")
async def get_rating(match_id: str):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    doc = await db.ratings.find_one({"matchId": oid}) or {}
    likes = doc.get("likes", 0)
    dislikes = doc.get("dislikes", 0)
    total = max(likes + dislikes, 1)
    return {"likes": likes, "dislikes": dislikes, "likePct": round(likes * 100 / total, 1)}


@api_router.post("/matches/{match_id}/rate")
async def rate_match(match_id: str, body: RateInput, current=Depends(get_user_from_token)):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    inc = {"likes": 1} if body.like else {"dislikes": 1}
    await db.ratings.update_one({"matchId": oid}, {"$inc": inc}, upsert=True)
    doc = await db.ratings.find_one({"matchId": oid})
    likes = doc.get("likes", 0)
    dislikes = doc.get("dislikes", 0)
    total = max(likes + dislikes, 1)
    like_pct = round(likes * 100 / total, 1)
    delta = 1 if (body.like and like_pct >= 50) or ((not body.like) and like_pct < 50) else -1
    await update_user_score(current["_id"], delta)
    return {"likes": likes, "dislikes": dislikes, "likePct": like_pct}


@api_router.post("/matches/{match_id}/vote")
async def vote_match(match_id: str, body: VoteInput, current=Depends(get_user_from_token)):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")

    match_doc = await db.matches.find_one({"_id": oid})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Match not found")
    allowed = categories_for_sport(match_doc.get("sport", ""))
    if body.category not in allowed:
        raise HTTPException(status_code=400, detail=f"Category '{body.category}' not allowed for this sport")

    path = f"votes.{body.category}.{body.player}"
    await db.votes.update_one({"matchId": oid}, {"$inc": {path: 1}}, upsert=True)

    if body.token:
        try:
            await db.device_votes.update_one(
                {"matchId": oid, "token": body.token},
                {"$set": {"matchId": oid, "token": body.token, "updatedAt": datetime.utcnow()}},
                upsert=True,
            )
        except Exception:
            pass

    doc = await db.votes.find_one({"matchId": oid})

    def to_pct(counter: Dict[str, int]):
        total = sum(counter.values()) or 1
        return {k: round(v * 100 / total, 1) for k, v in counter.items()}

    out = {}
    totals = {}
    delta = 0
    for cat in allowed:
        cnt = doc.get("votes", {}).get(cat, {})
        totals[cat] = sum(cnt.values())
        pct = to_pct(cnt)
        out[cat] = pct
        if cat == body.category:
            if pct:
                max_pct = max(pct.values())
                sel_pct = pct.get(body.player, 0)
                delta = 1 if sel_pct >= max_pct - 20 else -1
    if delta != 0:
        await update_user_score(current["_id"], delta)
    return {"percentages": out, "totals": totals}


@api_router.get("/matches/{match_id}/votes")
async def get_votes(match_id: str):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")

    match_doc = await db.matches.find_one({"_id": oid})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Match not found")
    allowed = categories_for_sport(match_doc.get("sport", ""))

    doc = await db.votes.find_one({"matchId": oid}) or {}

    def to_pct(counter: Dict[str, int]):
        total = sum(counter.values()) or 1
        return {k: round(v * 100 / total, 1) for k, v in counter.items()}

    out = {}
    totals = {}
    for cat in allowed:
        cnt = doc.get("votes", {}).get(cat, {})
        totals[cat] = sum(cnt.values())
        out[cat] = to_pct(cnt)
    return {"percentages": out, "totals": totals}


# -------- Player Ratings (Football) --------
class PlayerRatingInput(BaseModel):
    token: Optional[str] = None
    player: str
    attack: int
    defense: int
    passing: int
    dribbling: int


def _clamp10(x: int) -> int:
    try:
        x = int(x)
    except Exception:
        x = 0
    return max(0, min(10, x))


@api_router.post("/matches/{match_id}/player_ratings")
async def submit_player_rating(match_id: str, body: PlayerRatingInput, current=Depends(get_user_from_token)):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    m = await db.matches.find_one({"_id": oid})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    if m.get("sport") != "football":
        raise HTTPException(status_code=400, detail="Player ratings only for football matches")

    doc = {
        "matchId": oid,
        "player": body.player.strip(),
        "attack": _clamp10(body.attack),
        "defense": _clamp10(body.defense),
        "passing": _clamp10(body.passing),
        "dribbling": _clamp10(body.dribbling),
        "updatedAt": datetime.utcnow(),
    }
    if body.token:
        doc["token"] = body.token
    await db.player_ratings.update_one(
        {"matchId": oid, "token": current["_id"], "player": doc["player"]},
        {"$set": {**doc, "token": current["_id"]}},
        upsert=True,
    )

    cur = db.player_ratings.find({"matchId": oid, "player": doc["player"]})
    acc = {"attack": 0, "defense": 0, "passing": 0, "dribbling": 0, "count": 0}
    async for r in cur:
        acc["attack"] += r.get("attack", 0)
        acc["defense"] += r.get("defense", 0)
        acc["passing"] += r.get("passing", 0)
        acc["dribbling"] += r.get("dribbling", 0)
        acc["count"] += 1
    if acc["count"] > 0:
        av = {k: (acc[k] / acc["count"]) for k in ["attack", "defense", "passing", "dribbling"]}
        diffs = {k: abs(doc[k] - av[k]) for k in ["attack", "defense", "passing", "dribbling"]}
        delta = 0
        for _, dval in diffs.items():
            if dval <= 2:
                delta += 1
            elif dval > 3:
                delta -= 1
        if delta != 0:
            await update_user_score(current["_id"], delta)
        overall = (av["attack"] + av["defense"] + av["passing"] + av["dribbling"]) / 4
        return {"count": acc["count"], "averages": {k: round(v, 2) for k, v in av.items()}, "overall": round(overall, 2), "delta": delta}
    else:
        return {"count": 0, "averages": {"attack": 0, "defense": 0, "passing": 0, "dribbling": 0}, "overall": 0, "delta": 0}


# ----------- Notifications & Scheduling -----------
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def build_final_message(match_doc: Dict) -> str:
    home = match_doc.get("homeTeam", {}).get("name", "Home")
    away = match_doc.get("awayTeam", {}).get("name", "Away")
    score = match_doc.get("score")
    score_str = None
    if isinstance(score, dict):
        h = score.get("home")
        a = score.get("away")
        if h is not None and a is not None:
            score_str = f" {h}:{a}"
    return f"{home} – {away}{score_str or ''}. Vote for MVP now!"


def build_12h_message(match_doc: Dict) -> str:
    home = match_doc.get("homeTeam", {}).get("name", "Home")
    away = match_doc.get("awayTeam", {}).get("name", "Away")
    return f"Don't miss out: Vote for MVP for {home} – {away}"


async def _schedule_for_match_oid(oid: ObjectId):
    match_doc = await db.matches.find_one({"_id": oid})
    if not match_doc:
        return
    start: datetime = match_doc.get("startTime")
    if isinstance(start, str):
        start = datetime.fromisoformat(start)
    start = start.astimezone(timezone.utc)
    finish = start + timedelta(minutes=match_duration_minutes(match_doc.get("sport", "")))

    tokens = await db.push_tokens.find().to_list(10000)

    to_insert = []
    for t in tokens:
        to_insert.append({
            "matchId": oid,
            "token": t["token"],
            "type": "final",
            "deliverAt": finish,
            "status": "pending",
            "createdAt": datetime.utcnow(),
        })
        if t.get("remind12h"):
            to_insert.append({
                "matchId": oid,
                "token": t["token"],
                "type": "12h",
                "deliverAt": finish + timedelta(hours=12),
                "status": "pending",
                "createdAt": datetime.utcnow(),
            })

    for n in to_insert:
        exists = await db.notifications.find_one({"matchId": oid, "token": n["token"], "type": n["type"]})
        if not exists:
            await db.notifications.insert_one(n)


@api_router.get("/notifications/queue_count")
async def queue_count(matchId: str):
    try:
        oid = ObjectId(matchId)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    pending = await db.notifications.count_documents({"matchId": oid, "status": "pending"})
    return {"pending": pending}


@api_router.post("/notifications/schedule_for_match")
async def schedule_for_match(body: Dict[str, str]):
    match_id = body.get("matchId")
    if not match_id:
        raise HTTPException(status_code=400, detail="matchId required")
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    await _schedule_for_match_oid(oid)
    return {"scheduled": True}


@api_router.post("/notifications/reschedule_match")
async def reschedule_match(body: Dict[str, str]):
    match_id = body.get("matchId")
    if not match_id:
        raise HTTPException(status_code=400, detail="matchId required")
    oid = ObjectId(match_id)
    await db.notifications.update_many({"matchId": oid, "status": "pending"}, {"$set": {"status": "canceled", "updatedAt": datetime.utcnow()}})
    await _schedule_for_match_oid(oid)
    return {"ok": True}


@api_router.post("/notifications/cancel_match")
async def cancel_match(body: Dict[str, str]):
    match_id = body.get("matchId")
    if not match_id:
        raise HTTPException(status_code=400, detail="matchId required")
    oid = ObjectId(match_id)
    await db.notifications.update_many({"matchId": oid, "status": "pending"}, {"$set": {"status": "canceled", "updatedAt": datetime.utcnow()}})
    return {"ok": True}


@api_router.post("/notifications/notify_test_audience")
async def notify_test_audience(body: Dict[str, str]):
    match_id = body.get("matchId")
    if not match_id:
        raise HTTPException(status_code=400, detail="matchId required")
    oid = ObjectId(match_id)
    mdoc = await db.matches.find_one({"_id": oid})
    if not mdoc:
        raise HTTPException(status_code=404, detail="Match not found")
    tokens = await db.push_tokens.find({"remind12h": True}).to_list(10000)
    if not tokens:
        return {"sent": 0}
    msgs = []
    for t in tokens:
        msgs.append({
            "to": t["token"],
            "sound": "default",
            "title": "MVP",
            "body": f"Test audience: Vote for MVP for {mdoc.get('homeTeam',{}).get('name','Home')} – {mdoc.get('awayTeam',{}).get('name','Away')}",
            "data": {"matchId": str(oid), "type": "test_audience"},
        })
    try:
        _ = requests.post(EXPO_PUSH_URL, json=msgs, timeout=20, headers={"Accept": "application/json", "Content-Type": "application/json"})
        await db.dispatch_logs.insert_one({"ts": datetime.now(timezone.utc).isoformat(), "sent": len(msgs), "skipped_voted": 0, "errors": 0, "durationMs": 0, "lastError": None, "kind": "test_audience"})
        return {"sent": len(msgs)}
    except Exception as e:
        await db.dispatch_logs.insert_one({"ts": datetime.now(timezone.utc).isoformat(), "sent": 0, "skipped_voted": 0, "errors": len(msgs), "durationMs": 0, "lastError": str(e), "kind": "test_audience"})
        raise HTTPException(status_code=500, detail=str(e))


class ScheduleHours(BaseModel):
    hours: int


@api_router.post("/notifications/schedule_for_next_48h")
async def schedule_for_next_48h():
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=48)
    matches = await db.matches.find({"startTime": {"$gte": now, "$lte": end}}).to_list(10000)
    for m in matches:
        await _schedule_for_match_oid(m["_id"])
    return {"count": len(matches)}


@api_router.post("/notifications/schedule_for_next_hours")
async def schedule_for_next_hours(body: ScheduleHours):
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=max(1, int(body.hours)))
    matches = await db.matches.find({"startTime": {"$gte": now, "$lte": end}}).to_list(10000)
    for m in matches:
        await _schedule_for_match_oid(m["_id"])
    return {"count": len(matches)}


@api_router.post("/notifications/simulate_finish_now")
async def simulate_finish_now(body: Dict[str, str]):
    match_id = body.get("matchId")
    if not match_id:
        raise HTTPException(status_code=400, detail="matchId required")
    oid = ObjectId(match_id)
    await _schedule_for_match_oid(oid)
    now = datetime.now(timezone.utc)
    await db.notifications.update_many({"matchId": oid, "type": {"$in": ["final", "12h"]}}, {"$set": {"deliverAt": now, "updatedAt": now}})
    return {"ok": True}


def chunk(arr, size):
    for i in range(0, len(arr), size):
        yield arr[i:i+size]


@api_router.get("/notifications/stats")
async def notif_stats():
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=24)
    pending = await db.notifications.count_documents({"status": "pending"})
    sent24 = await db.notifications.count_documents({"status": "sent", "sentAt": {"$gte": since}})
    skipped24 = await db.notifications.count_documents({"status": "skipped_voted", "updatedAt": {"$gte": since}})
    error24 = await db.notifications.count_documents({"status": "error", "updatedAt": {"$gte": since}})
    last = await db.dispatch_logs.find().sort("ts", -1).limit(1).to_list(1)
    last_log = last[0] if last else None
    return {"pending": pending, "sent24": sent24, "skipped24": skipped24, "error24": error24, "last": last_log}


@api_router.get("/notifications/pending")
async def notif_pending(limit: int = 50):
    docs = await db.notifications.find({"status": "pending"}).sort("deliverAt", 1).limit(int(limit)).to_list(int(limit))
    out = []
    for d in docs:
        due = d.get("deliverAt")
        if isinstance(due, datetime):
            due = due.isoformat()
        out.append({"matchId": str(d.get("matchId")), "dueAt": due, "type": d.get("type")})
    return out


@api_router.post("/notifications/dispatch_now")
async def dispatch_now():
    sent = await _dispatch_now_internal()
    return {"sent": sent}


@api_router.post("/notifications/test_push")
async def test_push(body: Dict[str, str]):
    token = body.get("token")
    msg = body.get("body") or "Test push from MVP"
    if not token:
        raise HTTPException(status_code=400, detail="token required")
    payload = [{"to": token, "sound": "default", "title": "MVP", "body": msg, "data": {"test": True}}]
    try:
        _ = requests.post(EXPO_PUSH_URL, json=payload, timeout=20, headers={"Accept": "application/json", "Content-Type": "application/json"})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/notifications/logs")
async def get_logs(limit: int = 200):
    logs = await db.dispatch_logs.find().sort("ts", -1).limit(int(limit)).to_list(int(limit))
    return logs


@api_router.get("/notifications/logs.csv")
async def get_logs_csv(limit: int = 200):
    logs = await db.dispatch_logs.find().sort("ts", -1).limit(int(limit)).to_list(int(limit))
    sio = StringIO()
    writer = csv.writer(sio)
    writer.writerow(["ts", "sent", "skipped_voted", "errors", "durationMs", "lastError"]) 
    for l in logs:
        writer.writerow([l.get("ts"), l.get("sent", 0), l.get("skipped_voted", 0), l.get("errors", 0), l.get("durationMs", 0), (l.get("lastError") or "").replace('\n', ' ')])
    return sio.getvalue()


async def _dispatch_now_internal():
    start = datetime.now(timezone.utc)
    skipped_count = 0
    errors = 0
    last_error = None

    pending = await db.notifications.find({"deliverAt": {"$lte": start}, "status": "pending"}).to_list(10000)
    if not pending:
        await db.dispatch_logs.insert_one({"ts": start.isoformat(), "sent": 0, "skipped_voted": 0, "errors": 0, "durationMs": 0})
        return 0

    match_ids = list({n["matchId"] for n in pending})
    matches = {}
    for mid in match_ids:
        doc = await db.matches.find_one({"_id": mid})
        if doc:
            matches[str(mid)] = doc

    total_sent = 0
    for batch in chunk(pending, 90):
        msgs = []
        ids = []
        for n in batch:
            if n["type"] == "12h":
                dv = await db.device_votes.find_one({"matchId": n["matchId"], "token": n["token"]})
                if dv:
                    skipped_count += 1
                    await db.notifications.update_one({"_id": n["_id"]}, {"$set": {"status": "skipped_voted", "updatedAt": datetime.utcnow()}})
                    continue
            mdoc = matches.get(str(n["matchId"])) or {}
            body = build_final_message(mdoc) if n["type"] == "final" else build_12h_message(mdoc)
            msgs.append({"to": n["token"], "sound": "default", "title": "MVP", "body": body, "data": {"matchId": str(n["matchId"]), "type": n["type"]}})
            ids.append(n["_id"])
        if not msgs:
            continue
        try:
            _ = requests.post(EXPO_PUSH_URL, json=msgs, timeout=20, headers={"Accept": "application/json", "Content-Type": "application/json"})
            await db.notifications.update_many({"_id": {"$in": ids}}, {"$set": {"status": "sent", "sentAt": datetime.utcnow()}})
            total_sent += len(msgs)
        except Exception as e:
            errors += len(msgs)
            last_error = str(e)
            await db.notifications.update_many({"_id": {"$in": ids}}, {"$set": {"status": "error", "error": str(e), "updatedAt": datetime.utcnow()}})

    duration_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
    await db.dispatch_logs.insert_one({"ts": start.isoformat(), "sent": total_sent, "skipped_voted": skipped_count, "errors": errors, "durationMs": duration_ms, "lastError": last_error})
    return total_sent


async def _dispatch_loop():
    while True:
        try:
            await _dispatch_now_internal()
        except Exception as e:
            logger.warning(f"Dispatch loop error: {e}")
        await asyncio.sleep(90)


# ----------- Import from TheSportsDB -----------
class ImportRequest(BaseModel):
    days: int = 2


def _parse_ts(d: Dict) -> Optional[datetime]:
    ts = d.get("strTimestamp") or None
    if ts:
        try:
            return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            pass
    date_s = d.get("dateEvent")
    time_s = (d.get("strTime") or "00:00:00").strip()
    if date_s:
        try:
            return datetime.strptime(f"{date_s} {time_s}", "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            try:
                return datetime.strptime(date_s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                return None
    return None


@api_router.post("/import/thesportsdb")
async def import_thesportsdb(body: ImportRequest):
    created = 0
    updated = 0
    today = datetime.now(timezone.utc).date()
    for offset in range(body.days):
        d = today + timedelta(days=offset)
        d_str = d.isoformat()
        for sport_key, s_value in SPORT_MAP.items():
            url = f"https://www.thesportsdb.com/api/v1/json/{THESPORTSDB_KEY}/eventsday.php?d={d_str}&s={s_value}"
            try:
                r = requests.get(url, timeout=15)
                data = r.json()
            except Exception as e:
                logger.warning(f"Fetch failed {url}: {e}")
                continue
            events = data.get("events") or []
            for ev in events:
                ext_id = ev.get("idEvent")
                if not ext_id:
                    continue
                st = _parse_ts(ev)
                if not st:
                    continue
                doc = {
                    "sport": sport_key,
                    "tournament": ev.get("strLeague") or (ev.get("strEvent") or ""),
                    "subgroup": ev.get("strSeason"),
                    "homeTeam": {"type": "club", "name": ev.get("strHomeTeam") or "TBD"},
                    "awayTeam": {"type": "club", "name": ev.get("strAwayTeam") or "TBD"},
                    "startTime": st,
                    "status": "scheduled",
                    "channels": {"CH": CHANNELS_CH.get(sport_key, [])},
                    "source": "thesportsdb",
                    "sourceId": ext_id,
                }
                existing = await db.matches.find_one({"sourceId": ext_id})
                if existing:
                    await db.matches.update_one({"_id": existing["_id"]}, {"$set": doc})
                    updated += 1
                else:
                    await db.matches.insert_one(doc)
                    created += 1
    # Auto-schedule next 48h idempotent
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=48)
    matches = await db.matches.find({"startTime": {"$gte": now, "$lte": end}}).to_list(10000)
    for m in matches:
        await _schedule_for_match_oid(m["_id"])

    return {"created": created, "updated": updated}


# Include router and middleware
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()