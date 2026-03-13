from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import ALLOWED_ORIGINS
from routes import auth, upload, chat, settings

app = FastAPI(title="Student System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     tags=["auth"])
app.include_router(upload.router,   tags=["upload"])
app.include_router(chat.router,     tags=["chat"])
app.include_router(settings.router, tags=["settings"])

@app.get("/")
def root():
    return {"message": "Student System API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
