import { Router } from 'express';
import {
  getBoard,
  updateBoard,
  archiveBoard,
} from '../controllers/boardController';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  moveTask,
  deleteTask,
  addComment,
  deleteComment,
  taskActivity,
  logTime,
  attachFile,
  addVoiceNote,
  deleteVoiceNote,
} from '../controllers/taskController';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/boards/:id', getBoard);
router.patch('/boards/:id', updateBoard);
router.delete('/boards/:id', archiveBoard);

router.post('/boards/:boardId/tasks', createTask);
router.get('/boards/:boardId/tasks', getTasks);
router.get('/boards/:boardId/tasks/:taskId', getTask);
router.patch('/boards/:boardId/tasks/:taskId', updateTask);
router.delete('/boards/:boardId/tasks/:taskId', deleteTask);
router.post('/boards/:boardId/tasks/:taskId/move', moveTask);
router.post('/boards/:boardId/tasks/:taskId/time', logTime);
router.post('/boards/:boardId/tasks/:taskId/attachments', attachFile);
router.post('/boards/:boardId/tasks/:taskId/voicenotes', addVoiceNote);
router.delete('/boards/:boardId/tasks/:taskId/voicenotes/:noteId', deleteVoiceNote);
router.get('/boards/:boardId/tasks/:taskId/activity', taskActivity);
router.post('/boards/:boardId/tasks/:taskId/comments', addComment);
router.delete('/boards/:boardId/comments/:commentId', deleteComment);

export default router;