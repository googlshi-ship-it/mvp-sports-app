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
# Routes: Core & Matches (existing)
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
    # Scoring: align with majority
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
        {"matchId": oid, "token": current["_id"], "player": doc["player"]},  # bind to user id for idempotency
        {"$set": {**doc, "token": current["_id"]}},
        upsert=True,
    )

    # Aggregate
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
        diffs = {
            "attack": abs(doc["attack"] - av["attack"]),
            "defense": abs(doc["defense"] - av["defense"]),
            "passing": abs(doc["passing"] - av["passing"]),
            "dribbling": abs(doc["dribbling"] - av["dribbling"]),
        }
        delta = 0
        for k, dval in diffs.items():
            if dval <= 2:  # close
                delta += 1
            elif dval > 3:  # far
                delta -= 1
        if delta != 0:
            await update_user_score(current["_id"], delta)
        overall = (av["attack"] + av["defense"] + av["passing"] + av["dribbling"]) / 4
        return {
            "count": acc["count"],
            "averages": {k: round(v, 2) for k, v in av.items()},
            "overall": round(overall, 2),
            "delta": delta,
        }
    else:
        return {"count": 0, "averages": {"attack": 0, "defense": 0, "passing": 0, "dribbling": 0}, "overall": 0, "delta": 0}


# -------- Notifications & Import (unchanged below, trimmed for brevity in this diff) --------
# ... (The rest of notifications, scheduling, dispatch, stats, logs, import routes remain as in previous version) ...