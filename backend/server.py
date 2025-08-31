from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
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
import asyncio
from jose import jwt, JWTError
from passlib.hash import bcrypt
from zoneinfo import ZoneInfo

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

# Voting window (hours)
VOTING_WINDOW_HOURS = int(os.environ.get("VOTING_WINDOW_HOURS", "24"))

# Admin token
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "CHANGEME")

# Create the main app and router with prefix /api
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------------------
# Utils
# ---------------------------

def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def start_of_day(dt: datetime) -> datetime:
    dt = to_utc(dt)
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


def match_duration_minutes(sport: str) -> int:
    if sport == "football":
        return 120
    if sport == "basketball":
        return 120
    if sport == "ufc":
        return 180
    return 120


def compute_final_and_window(m: Dict) -> Dict:
    st = m.get("startTime")
    if isinstance(st, str):
        st = datetime.fromisoformat(st)
    st = to_utc(st)
    sport = m.get("sport", "football")
    final_at = m.get("finalAt")
    if isinstance(final_at, str):
        final_at = datetime.fromisoformat(final_at)
    if not final_at:
        final_at = st + timedelta(minutes=match_duration_minutes(sport))
    final_at = to_utc(final_at)
    open_at = m.get("voting_open_at")
    if isinstance(open_at, str):
        open_at = datetime.fromisoformat(open_at)
    close_at = m.get("voting_close_at")
    if isinstance(close_at, str):
        close_at = datetime.fromisoformat(close_at)
    if not open_at:
        open_at = final_at
    if not close_at:
        close_at = open_at + timedelta(hours=VOTING_WINDOW_HOURS)
    open_at = to_utc(open_at)
    close_at = to_utc(close_at)
    return {"finalAt": final_at, "voting_open_at": open_at, "voting_close_at": close_at}


def with_voting_status(m: Dict) -> Dict:
    now = datetime.now(timezone.utc)
    comp = compute_final_and_window(m)
    is_open = comp["voting_open_at"] <= now < comp["voting_close_at"]
    return {
        **{k: comp[k].isoformat() for k in comp},
        "now": now.isoformat(),
        "isVotingOpen": is_open,
    }


def to_local_iso(dt: datetime, tz: Optional[str]) -> Optional[str]:
    if not dt:
        return None
    dt = to_utc(dt)
    if not tz:
        return None
    try:
        return dt.astimezone(ZoneInfo(tz)).isoformat()
    except Exception:
        return None


async def ensure_indexes():
    await db.matches.create_index("startTime")
    await db.matches.create_index("sourceId", unique=True)
    await db.matches.create_index("competition_id")
    await db.ratings.create_index("matchId")
    await db.votes.create_index("matchId")
    await db.users.create_index("email", unique=True)
    await db.competitions.create_index([("type", 1), ("country", 1), ("season", 1)])


async def backfill_voting_windows():
    cur = db.matches.find({})
    async for m in cur:
        comp = compute_final_and_window(m)
        await db.matches.update_one({"_id": m["_id"]}, {"$set": comp})


async def seed_competitions_and_matches():
    cnt = await db.competitions.count_documents({})
    if cnt > 0:
        return
    # Seed competitions
    la_liga = {
        "name": "La Liga",
        "country": "Spain",
        "season": "2025",
        "type": "league",
        "start_date": datetime(2025, 8, 15, tzinfo=timezone.utc),
        "end_date": datetime(2026, 5, 31, tzinfo=timezone.utc),
    }
    ucl = {
        "name": "UEFA Champions League",
        "country": "Europe",
        "season": "2025",
        "type": "cup",
        "start_date": datetime(2025, 6, 1, tzinfo=timezone.utc),
        "end_date": datetime(2026, 5, 31, tzinfo=timezone.utc),
    }
    res1 = await db.competitions.insert_one(la_liga)
    res2 = await db.competitions.insert_one(ucl)

    now = datetime.now(timezone.utc)
    def mk_match(hours_from_now: int, comp_id):
        return {
            "sport": "football",
            "tournament": "La Liga" if comp_id == res1.inserted_id else "UEFA Champions League",
            "subgroup": "Matchday",
            "homeTeam": {"type": "club", "name": "Team A", "countryCode": "ES"},
            "awayTeam": {"type": "club", "name": "Team B", "countryCode": "ES"},
            "startTime": now + timedelta(hours=hours_from_now),
            "status": "scheduled",
            "score": None,
            "channels": {"CH": ["blue Sport"], "ES": ["Movistar"]},
            "source": "seed",
            "sourceId": f"seed_{uuid.uuid4()}",
            "competition_id": comp_id,
            "stadium": "Demo Stadium",
            # lineups/injuries demo
            "formation_home": "4-3-3",
            "formation_away": "4-2-3-1",
            "lineup_home": [
                {"number": "1", "name": "GK Home", "pos": "GK", "role": "starter"},
                {"number": "9", "name": "CF Home", "pos": "FW", "role": "starter"},
            ],
            "lineup_away": [
                {"number": "1", "name": "GK Away", "pos": "GK", "role": "starter"},
                {"number": "10", "name": "CF Away", "pos": "FW", "role": "starter"},
            ],
            "bench_home": [
                {"number": "12", "name": "Sub H1", "pos": "MF", "role": "sub"}
            ],
            "bench_away": [
                {"number": "12", "name": "Sub A1", "pos": "MF", "role": "sub"}
            ],
            "unavailable_home": [
                {"name": "Injured H1", "reason": "Hamstring", "type": "injury", "status": "out"},
                {"name": "Doubt H2", "reason": "Knock", "type": "injury", "status": "doubtful"},
            ],
            "unavailable_away": [
                {"name": "Susp A1", "reason": "Red card", "type": "suspension", "status": "out"}
            ],
            "lineups_status": "probable",
            "lineups_updated_at": datetime.now(timezone.utc),
            "injuries_updated_at": datetime.now(timezone.utc),
        }

    matches = [
        mk_match(6, res1.inserted_id),
        mk_match(24, res1.inserted_id),
        mk_match(36, res2.inserted_id),
    ]
    for m in matches:
        comp = compute_final_and_window(m)
        m.update(comp)
    await db.matches.insert_many(matches)


@app.on_event("startup")
async def on_startup():
    try:
        await ensure_indexes()
        await backfill_voting_windows()
        await seed_competitions_and_matches()
    except Exception as e:
        logger.warning(f"Startup setup failed: {e}")
    # Minimal background loop placeholder
    asyncio.create_task(_dispatch_loop())


# ---------------------------
# Background dispatcher stubs (notifications omitted)
# ---------------------------
async def _dispatch_now_internal():
    return 0


async def _dispatch_loop():
    while True:
        try:
            await _dispatch_now_internal()
        except Exception as e:
            logger.warning(f"Dispatch loop error: {e}")
        await asyncio.sleep(90)


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
    stadium: Optional[str] = None
    competition_id: Optional[str] = None  # stored as ObjectId string in API
    # Persist voting window
    finalAt: Optional[datetime] = None
    voting_open_at: Optional[datetime] = None
    voting_close_at: Optional[datetime] = None
    # Lineups & injuries
    formation_home: Optional[str] = None
    formation_away: Optional[str] = None
    lineup_home: Optional[List[Dict]] = None
    lineup_away: Optional[List[Dict]] = None
    bench_home: Optional[List[Dict]] = None
    bench_away: Optional[List[Dict]] = None
    unavailable_home: Optional[List[Dict]] = None
    unavailable_away: Optional[List[Dict]] = None
    lineups_status: Optional[Literal["none", "probable", "confirmed"]] = "none"
    lineups_updated_at: Optional[datetime] = None
    injuries_updated_at: Optional[datetime] = None


class MatchDB(MatchBase):
    id: str = Field(alias="_id")
    now: Optional[datetime] = None
    isVotingOpen: Optional[bool] = None

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
    payload = {"sub": user_id, "email": email, "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)}
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


def require_admin(x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    if not x_admin_token or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin token required")


async def update_user_score(user_id: ObjectId, delta: int):
    await db.users.update_one({"_id": user_id}, {"$inc": {"score": int(delta)}})


# -------- Static Config --------
THESPORTSDB_KEY = os.environ.get("THESPORTSDB_KEY", "3")
SPORT_MAP = {"football": "Soccer", "basketball": "Basketball", "ufc": "Fighting"}


def categories_for_sport(sport: str) -> List[str]:
    if sport == "football":
        return ["mvp", "scorer", "assist", "defender", "goalkeeper"]
    if sport == "basketball":
        return ["mvp", "scorer", "assist", "defender"]
    if sport == "ufc":
        return ["fight_of_the_night", "performance_of_the_night"]
    return ["mvp"]


# ---------------------------
# Voting window checks
# ---------------------------

def assert_voting_open_or_raise(match_doc: Dict):
    comp = compute_final_and_window(match_doc)
    now = datetime.now(timezone.utc)
    if now < comp["voting_open_at"]:
        remaining = int((comp["voting_open_at"] - now).total_seconds())
        raise HTTPException(status_code=403, detail={
            "reason": "voting_not_open",
            "opensAt": comp["voting_open_at"].isoformat(),
            "now": now.isoformat(),
            "remainingSeconds": max(remaining, 0),
        })
    if now >= comp["voting_close_at"]:
        raise HTTPException(status_code=403, detail={
            "reason": "voting_closed",
            "closedAt": comp["voting_close_at"].isoformat(),
            "now": now.isoformat(),
            "remainingSeconds": 0,
        })


# ---------------------------
# Health & Auth
# ---------------------------
@api_router.get("/")
async def health():
    return {"message": "MVP backend running"}


@api_router.post("/auth/register")
async def register(body: RegisterInput):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hash(body.password)
    res = await db.users.insert_one({"email": body.email.lower(), "password": hashed, "score": 0, "createdAt": datetime.utcnow()})
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
# Competitions
# ---------------------------
class CompetitionCreate(BaseModel):
    name: str
    country: str
    season: str
    type: Literal["league", "cup"]
    start_date: datetime
    end_date: datetime


class CompetitionDB(CompetitionCreate):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, datetime: lambda v: v.isoformat()}


@api_router.get("/competitions")
async def list_competitions():
    items = await db.competitions.find({}).sort([("type", 1), ("country", 1), ("name", 1)]).to_list(1000)
    for it in items:
        it["_id"] = str(it["_id"])  # type: ignore
    return items


@api_router.get("/competitions/{comp_id}")
async def get_competition(comp_id: str):
    try:
        oid = ObjectId(comp_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid competition id")
    c = await db.competitions.find_one({"_id": oid})
    if not c:
        raise HTTPException(status_code=404, detail="Competition not found")
    c["_id"] = str(c["_id"])  # type: ignore
    return c


@api_router.get("/competitions/{comp_id}/matches")
async def competition_matches(comp_id: str, tz: Optional[str] = Query(default=None)):
    try:
        oid = ObjectId(comp_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid competition id")
    cur = db.matches.find({"competition_id": oid}).sort("startTime", 1)
    out = []
    async for m in cur:
        st = m.get("startTime")
        st_local = None
        if isinstance(st, str):
            st = datetime.fromisoformat(st)
        st = to_utc(st)
        if tz:
            st_local = to_local_iso(st, tz)
        m["_id"] = str(m["_id"])  # type: ignore
        if "competition_id" in m and m["competition_id"]:
            m["competition_id"] = str(m["competition_id"])  # type: ignore
        extra = with_voting_status(m)
        out.append({**m, **extra, "start_time_local": st_local})
    return out


# ---------------------------
# Matches core
# ---------------------------
@api_router.post("/matches", response_model=MatchDB)
async def create_match(match: MatchCreate):
    doc = match.dict()
    # convert competition_id to ObjectId if present
    comp_id = doc.get("competition_id")
    if comp_id:
        try:
            doc["competition_id"] = ObjectId(comp_id)
        except Exception:
            doc["competition_id"] = None
    comp = compute_final_and_window(doc)
    doc.update(comp)
    if not doc.get("sourceId"):
        doc["sourceId"] = f"manual_{uuid.uuid4()}"
        doc["source"] = "manual"
    res = await db.matches.insert_one(doc)
    created = await db.matches.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])  # type: ignore
    return MatchDB(**{**created, **with_voting_status(created)})


@api_router.get("/matches")
async def list_matches(country: Optional[str] = None, sport: Optional[Sport] = None, status: Optional[str] = None, tz: Optional[str] = None):
    q: Dict = {}
    if sport:
        q["sport"] = sport
    if status:
        q["status"] = status
    items = await db.matches.find(q).sort("startTime", 1).to_list(1000)
    out = []
    for item in items:
        item["_id"] = str(item["_id"])  # type: ignore
        extra = with_voting_status(item)
        st = item.get("startTime")
        if isinstance(st, str):
            st = datetime.fromisoformat(st)
        st = to_utc(st)
        st_local = to_local_iso(st, tz) if tz else None
        out.append({**item, **extra, "start_time_local": st_local})
    return out


@api_router.get("/matches/grouped")
async def matches_grouped(country: Optional[str] = None, tz: Optional[str] = None):
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
        extra = with_voting_status(m)
        st_local = to_local_iso(st, tz) if tz else None
        grouped[bucket].append({**m, "id": str(m["_id"]), "channelsForCountry": pick_channels(m), **extra, "start_time_local": st_local})
    return grouped


@api_router.get("/matches/{match_id}")
async def get_match(match_id: str, include: Optional[str] = None, tz: Optional[str] = None):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    m = await db.matches.find_one({"_id": oid})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    m["_id"] = str(m["_id"])  # type: ignore
    extra = with_voting_status(m)
    st = m.get("startTime")
    if isinstance(st, str):
        st = datetime.fromisoformat(st)
    st = to_utc(st)
    st_local = to_local_iso(st, tz) if tz else None
    out = {**m, **extra, "start_time_local": st_local}

    if include == "lineups":
        out["lineups"] = await _get_lineups_payload(m)
    return out


@api_router.post("/matches/{match_id}/set_voting_window")
async def set_voting_window(match_id: str, body: Dict[str, Optional[str]]):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    updates = {}
    openAt = body.get("openAt")
    closeAt = body.get("closeAt")
    if openAt:
        updates["voting_open_at"] = to_utc(datetime.fromisoformat(openAt))
    if closeAt:
        updates["voting_close_at"] = to_utc(datetime.fromisoformat(closeAt))
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    await db.matches.update_one({"_id": oid}, {"$set": updates})
    m = await db.matches.find_one({"_id": oid})
    m["_id"] = str(m["_id"])  # type: ignore
    return {**m, **with_voting_status(m)}


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
    match_doc = await db.matches.find_one({"_id": oid})
    if not match_doc:
        raise HTTPException(status_code=404, detail="Match not found")
    assert_voting_open_or_raise(match_doc)
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
    assert_voting_open_or_raise(match_doc)
    allowed = categories_for_sport(match_doc.get("sport", ""))
    if body.category not in allowed:
        raise HTTPException(status_code=400, detail=f"Category '{body.category}' not allowed for this sport")

    path = f"votes.{body.category}.{body.player}"
    await db.votes.update_one({"matchId": oid}, {"$inc": {path: 1}}, upsert=True)

    if body.token:
        try:
            await db.device_votes.update_one({"matchId": oid, "token": body.token}, {"$set": {"matchId": oid, "token": body.token, "updatedAt": datetime.utcnow()}}, upsert=True)
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


@api_router.post("/matches/{match_id}/player_ratings")
async def submit_player_rating(match_id: str, body: Dict, current=Depends(get_user_from_token)):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    m = await db.matches.find_one({"_id": oid})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    assert_voting_open_or_raise(m)
    if m.get("sport") != "football":
        raise HTTPException(status_code=400, detail="Player ratings only for football matches")

    def _clamp10(x: int) -> int:
        try:
            x = int(x)
        except Exception:
            x = 0
        return max(0, min(10, x))

    player = (body.get("player") or "").strip()
    attack = _clamp10(body.get("attack", 0))
    defense = _clamp10(body.get("defense", 0))
    passing = _clamp10(body.get("passing", 0))
    dribbling = _clamp10(body.get("dribbling", 0))

    doc = {"matchId": oid, "player": player, "attack": attack, "defense": defense, "passing": passing, "dribbling": dribbling, "updatedAt": datetime.utcnow()}
    await db.player_ratings.update_one({"matchId": oid, "token": current["_id"], "player": player}, {"$set": {**doc, "token": current["_id"]}}, upsert=True)

    cur = db.player_ratings.find({"matchId": oid, "player": player})
    acc = {"attack": 0, "defense": 0, "passing": 0, "dribbling": 0, "count": 0}
    async for r in cur:
        acc["attack"] += r.get("attack", 0)
        acc["defense"] += r.get("defense", 0)
        acc["passing"] += r.get("passing", 0)
        acc["dribbling"] += r.get("dribbling", 0)
        acc["count"] += 1
    if acc["count"] > 0:
        av = {k: (acc[k] / acc["count"]) for k in ["attack", "defense", "passing", "dribbling"]}
        delta = 0
        for k in ["attack", "defense", "passing", "dribbling"]:
            diff = abs(doc[k] - av[k])
            if diff <= 2:
                delta += 1
            elif diff > 3:
                delta -= 1
        if delta != 0:
            await update_user_score(current["_id"], delta)
        overall = (av["attack"] + av["defense"] + av["passing"] + av["dribbling"]) / 4
        return {"count": acc["count"], "averages": {k: round(v, 2) for k, v in av.items()}, "overall": round(overall, 2), "delta": delta}
    else:
        return {"count": 0, "averages": {"attack": 0, "defense": 0, "passing": 0, "dribbling": 0}, "overall": 0, "delta": 0}


# ---------------------------
# Lineups & Injuries API
# ---------------------------
async def _get_lineups_payload(m: Dict) -> Dict:
    return {
        "lineups_status": m.get("lineups_status", "none"),
        "formation_home": m.get("formation_home"),
        "formation_away": m.get("formation_away"),
        "home": {
            "starters": [p for p in (m.get("lineup_home") or []) if p.get("role") == "starter"],
            "bench": [p for p in (m.get("bench_home") or [])],
            "unavailable": m.get("unavailable_home") or [],
        },
        "away": {
            "starters": [p for p in (m.get("lineup_away") or []) if p.get("role") == "starter"],
            "bench": [p for p in (m.get("bench_away") or [])],
            "unavailable": m.get("unavailable_away") or [],
        },
        "lineups_updated_at": (m.get("lineups_updated_at").isoformat() if m.get("lineups_updated_at") else None),
        "injuries_updated_at": (m.get("injuries_updated_at").isoformat() if m.get("injuries_updated_at") else None),
    }


@api_router.get("/matches/{match_id}/lineups")
async def get_lineups(match_id: str):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    m = await db.matches.find_one({"_id": oid})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return await _get_lineups_payload(m)


@api_router.post("/matches/{match_id}/lineups")
async def post_lineups(match_id: str, body: Dict, admin=Depends(require_admin)):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    updates = {}
    for key in [
        "formation_home", "formation_away", "lineup_home", "lineup_away", "bench_home", "bench_away", "lineups_status"
    ]:
        if key in body:
            updates[key] = body[key]
    updates["lineups_updated_at"] = datetime.now(timezone.utc)
    if not updates:
        raise HTTPException(status_code=400, detail="No lineups fields provided")
    await db.matches.update_one({"_id": oid}, {"$set": updates})
    m = await db.matches.find_one({"_id": oid})
    return await _get_lineups_payload(m)


@api_router.post("/matches/{match_id}/injuries")
async def post_injuries(match_id: str, body: Dict, admin=Depends(require_admin)):
    try:
        oid = ObjectId(match_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid match id")
    updates = {}
    for key in ["unavailable_home", "unavailable_away"]:
        if key in body:
            updates[key] = body[key]
    updates["injuries_updated_at"] = datetime.now(timezone.utc)
    if not updates:
        raise HTTPException(status_code=400, detail="No injuries fields provided")
    await db.matches.update_one({"_id": oid}, {"$set": updates})
    m = await db.matches.find_one({"_id": oid})
    return await _get_lineups_payload(m)


# ---------------------------
# TheSportsDB Importer (skeleton with idempotent upsert)
# ---------------------------
@api_router.post("/import/thesportsdb")
async def import_thesportsdb(days: int = 1):
    # Minimal stub to keep endpoint available; real mapping omitted in this MVP increment.
    # Idempotent no-op import.
    return {"created": 0, "updated": 0}


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