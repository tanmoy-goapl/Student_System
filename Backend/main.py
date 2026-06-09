from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import ALLOWED_ORIGINS
from routes import auth, upload, chat, settings, performance
from routes import homepage, career, practice, learning, documents, chat_sidebar
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Student System API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     tags=["auth"])
app.include_router(documents.router, tags=["documents"])
app.include_router(upload.router,   tags=["upload"])
app.include_router(chat.router,     tags=["chat"])
app.include_router(settings.router, tags=["settings"])
app.include_router(performance.router, tags=["performance"])
app.include_router(homepage.router, tags=["homepage"])
app.include_router(career.router, tags=["career"])
app.include_router(practice.router, tags=["practice"])
app.include_router(learning.router, tags=["learning"])
app.include_router(chat_sidebar.router, tags=["chat-sidebar"])


@app.get("/")
def root():
    return {"message": "Student System API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)