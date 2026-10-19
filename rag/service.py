
"""DisasterAI API: Friend 2 RAG behind Friend 1's existing n8n contract."""

import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Find Friend 2's project. Its src.* imports depend on this path.
FRIEND2_ROOT = Path(
    os.getenv(
        "FRIEND2_RAG_ROOT",
        str(Path.home() / "Projects" / "DisasterAI" / "Knowledge"),
    )
).expanduser().resolve()

if not FRIEND2_ROOT.is_dir():
    raise RuntimeError(f"Friend 2 project not found: {FRIEND2_ROOT}")

if str(FRIEND2_ROOT) not in sys.path:
    sys.path.insert(0, str(FRIEND2_ROOT))

# Load Friend 1's environment, then explicitly select the model and
# index used to ingest Friend 2's 2,575 chunks.
load_dotenv()
os.environ["EMBEDDING_MODEL"] = "intfloat/multilingual-e5-base"
os.environ["CHROMA_PATH"] = "chroma_db"

from backend.llm_router import router as llm_router
from backend.validate import router as validate_router

from src.config import get_settings
from src.rag.embeddings import get_embedder
from src.rag.retriever import retrieve

DEFAULT_STRATEGY = os.getenv("DEFAULT_STRATEGY", "section")

# Avoid simultaneous retrieval calls initializing/accessing the embedding
# model and Chroma collection concurrently.
RETRIEVAL_LOCK = Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the same embedding model used for Friend 2's index.
    get_embedder().embed_passages(["warm up"])
    yield


app = FastAPI(title="DisasterAI RAG service", lifespan=lifespan)
app.include_router(validate_router)
app.include_router(llm_router)


class SearchRequest(BaseModel):
    query: str
    k: int = 4
    topic: str | None = None
    strategy: str | None = None


@app.get("/health")
def health():
    settings = get_settings()
    return {
        "status": "ok",
        "default_strategy": DEFAULT_STRATEGY,
        "embedding_model": settings.embedding_model,
        "rag_backend": "Friend 2 DisasterDL",
        "friend2_root": str(FRIEND2_ROOT),
    }


@app.post("/search")
def search(req: SearchRequest):
    query = req.query.strip()

    if not query:
        raise HTTPException(status_code=400, detail="query is empty")

    if not 1 <= req.k <= 20:
        raise HTTPException(
            status_code=400,
            detail="k must be between 1 and 20",
        )

    strategy = req.strategy or DEFAULT_STRATEGY

    if strategy not in ("fixed", "section", "structure"):
        raise HTTPException(
            status_code=400,
            detail="strategy must be fixed, section, or structure",
        )

    # Translate Friend 1's strategy names to Friend 2's names.
    friend2_strategy = (
        "structure" if strategy in ("section", "structure") else "fixed"
    )

    topic = (
        req.topic
        if req.topic in ("fire", "flood", "structural", "general")
        else None
    )

    try:
        with RETRIEVAL_LOCK:
            chunks = retrieve(
                query,
                k=req.k,
                strategy=friend2_strategy,
                disaster_type=topic,
            )

        results = []

        for chunk in chunks:
            item = (
                chunk.model_dump()
                if hasattr(chunk, "model_dump")
                else dict(chunk)
            )

            chunk_id = str(item.get("chunk_id") or "").strip()

            # Friend 2 uses passage-level IDs such as
            # GEN-02:structure:0170, not Friend 1's FI/FL/ST entry IDs.
            # Use the real chunk ID as the citation anchor expected by
            # Friend 1's existing n8n citation-membership checks.
            results.append({
                "chunk_id": chunk_id,
                "text": item.get("text", ""),
                "source": item.get("source_id", ""),
                "page": item.get("page"),
                "section": item.get("heading", ""),
                "topic": item.get("disaster_type", "general"),
                "language": item.get("language", ""),
                "score": item.get("score", 0),
                "title": item.get("title", ""),
                "page_end": item.get("page_end"),
                "reliability": item.get("reliability"),
                "entry_ids": [chunk_id] if chunk_id else [],
            })

    except Exception as exc:
        settings = get_settings()
        db_path = settings.resolve(settings.chroma_path)

        raise HTTPException(
            status_code=503,
            detail=(
                "Friend 2 RAG retrieval failed. Check that ingestion "
                "completed and the ChromaDB index exists at "
                f"{db_path}. Error: {type(exc).__name__}: {exc}"
            ),
        ) from exc

    return {
        "query": query,
        "strategy": friend2_strategy,
        "topic_filter_applied": topic,
        "n_results": len(results),
        "results": results,
    }
