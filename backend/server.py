from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import List, Optional, Annotated
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self):
        d = self.model_dump(by_alias=True, exclude_none=True)
        d.pop("_id", None)
        return d

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)


class RunCreate(BaseModel):
    nickname: str = Field(min_length=1, max_length=16)
    wave: int = Field(ge=1, le=100)
    glory: int = Field(ge=0)
    result: str
    wins: int = 0
    recruits: int = 0
    fusions: int = 0
    team: List[str] = []


class RunRecord(BaseDocument, RunCreate):
    created_at: str = ""


@api_router.get("/")
async def root():
    return {"message": "Inazuma Rogue API"}


@api_router.post("/runs", response_model=RunRecord, response_model_by_alias=False)
async def create_run(payload: RunCreate):
    rec = RunRecord(**payload.model_dump(), created_at=datetime.now(timezone.utc).isoformat())
    res = await db.runs.insert_one(rec.to_mongo())
    rec.id = str(res.inserted_id)
    return rec


@api_router.get("/leaderboard", response_model=List[RunRecord], response_model_by_alias=False)
async def leaderboard():
    docs = await db.runs.find().sort("glory", -1).limit(20).to_list(20)
    return [RunRecord.from_mongo(d) for d in docs]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
