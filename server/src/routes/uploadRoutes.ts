import { Router } from 'express';
import { uploadMiddleware, uploadFile } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.post('/upload', uploadMiddleware(), uploadFile);

export default router;