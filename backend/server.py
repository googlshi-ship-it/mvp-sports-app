from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal
import uuid
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ---------------------------
# Utils
# ---------------------------
# Removed PyObjectId class - using string IDs instead for Pydantic v2 compatibility


def start_of_day(dt: datetime) -> datetime:
    dt = dt.astimezone(timezone.utc)
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


# ---------------------------
# Models
# ---------------------------
Sport = Literal["football", "basketball", "ufc"]


class Team(BaseModel):
    type: Literal["club", "national"]
    name: str
    countryCode: Optional[str] = None  # ISO alpha-2 for national teams


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
    channels: Dict[str, List[str]] = Field(default_factory=dict)  # countryCode -> channel names
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


# Extended categories per sport
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


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class StatusCheckCreate(BaseModel):
    client_name: str


THESPORTSDB_KEY = os.environ.get("THESPORTSDB_KEY", "3")

SPORT_MAP = {
    "football": "Soccer",
    "basketball": "Basketball",
    "ufc": "Fighting",
}

# Manual CH channel mapping by sport (simple MVP)
CHANNELS_CH = {
    "football": ["blue Sport", "SRF zwei"],
    "basketball": ["SRF zwei"],
    "ufc": ["blue Sport", "UFC Fight Pass"],
}

async def ensure_indexes():
    await db.matches.create_index("startTime")
    await db.matches.create_index("sourceId", unique=True)
    await db.ratings.create_index("matchId")
    await db.votes.create_index("matchId")
    await db.push_tokens.create_index("token", unique=True)


@app.on_event("startup")
async def on_startup():
    try:
        await ensure_indexes()
    except Exception as e:
        logger.warning(f"Index ensure failed: {e}")


def categories_for_sport(sport: str) -> List[str]:
    if sport == "football":
        return ["mvp", "scorer", "assist", "defender", "goalkeeper"]
    if sport == "basketball":
        return ["mvp", "scorer", "assist", "defender"]
    if sport == "ufc":
        return ["fight_of_the_night", "performance_of_the_night"]
    return ["mvp"]


# ---------------------------
# Routes
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
    # Add a unique sourceId for manual matches to avoid duplicate key error
    if not doc.get("sourceId"):
        doc["sourceId"] = f"manual_{uuid.uuid4()}"
        doc["source"] = "manual"
    res = await db.matches.insert_one(doc)
    created = await db.matches.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])  # Convert ObjectId to string
    return MatchDB(**created)


@api_router.get("/matches", response_model=List[MatchDB])
async def list_matches(country: Optional[str] = None, sport: Optional[Sport] = None, status: Optional[str] = None):
    q: Dict = {}
    if sport:
        q["sport"] = sport
    if status:
        q["status"] = status
    items = await db.matches.find(q).sort("startTime", 1).to_list(1000)
    # Convert ObjectId to string for each item
    for item in items:
        item["_id"] = str(item["_id"])
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
        bucket = None
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
    m["_id"] = str(m["_id"])  # Convert ObjectId to string
    return MatchDB(**m)


@api_router.post("/matches/{match_id}/rate")
async def rate_match(match_id: str, body: RateInput):
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
    return {"likes": likes, "dislikes": dislikes, "likePct": round(likes * 100 / total, 1)}


@api_router.post("/matches/{match_id}/vote")
async def vote_match(match_id: str, body: VoteInput):
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
    doc = await db.votes.find_one({"matchId": oid})

    def to_pct(counter: Dict[str, int]):
        total = sum(counter.values()) or 1
        return {k: round(v * 100 / total, 1) for k, v in counter.items()}

    out = {}
    for cat in allowed:
        out[cat] = to_pct(doc.get("votes", {}).get(cat, {}))
    return out


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
    for cat in allowed:
        out[cat] = to_pct(doc.get("votes", {}).get(cat, {}))
    return out


class PushRegister(BaseModel):
    token: str
    platform: Literal['ios', 'android', 'web']
    country: Optional[str] = None


@api_router.post("/push/register")
async def register_push(body: PushRegister):
    await db.push_tokens.update_one(
        {"token": body.token},
        {"$set": {"platform": body.platform, "country": body.country, "updatedAt": datetime.utcnow()}},
        upsert=True,
    )
    return {"ok": True}


# ----------- Import from TheSportsDB -----------
class ImportRequest(BaseModel):
    days: int = 2  # today + N-1 days


def _parse_ts(d: Dict) -> Optional[datetime]:
    ts = d.get("strTimestamp") or None
    if ts:
        try:
            # TheSportsDB strTimestamp is UTC like '2025-07-01 19:45:00'
            return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except Exception:
            pass
    # Fallback
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
                # Upsert by sourceId
                existing = await db.matches.find_one({"sourceId": ext_id})
                if existing:
                    await db.matches.update_one({"_id": existing["_id"]}, {"$set": doc})
                    updated += 1
                else:
                    await db.matches.insert_one(doc)
                    created += 1
    return {"created": created, "updated": updated}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()