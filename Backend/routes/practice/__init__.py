from fastapi import APIRouter

from routes.practice.topics import router as topics_router
from routes.practice.session import router as session_router
from routes.practice.performance import router as performance_router

router = APIRouter(prefix="/practice", tags=["practice"])

router.include_router(topics_router)
router.include_router(session_router)
router.include_router(performance_router)
