from fastapi import APIRouter

from routes.learning.learning_data import router as data_router
from routes.learning.study_guide import router as study_guide_router
from routes.learning.ai_actions import router as ai_actions_router
from routes.learning.revision import router as revision_router

router = APIRouter(prefix="/learning", tags=["learning"])

router.include_router(data_router)
router.include_router(study_guide_router)
router.include_router(ai_actions_router)
router.include_router(revision_router)
