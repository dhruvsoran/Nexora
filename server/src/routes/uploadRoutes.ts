import { Router } from 'express';
import { uploadMiddleware, uploadFile } from '../controllers/uploadController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.post('/upload', uploadMiddleware(), uploadFile);

export default router;