
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getChats, startChat, getMessages, sendMessage } from '../controllers/chat.controller.js';

const r = Router();
r.use(authenticate);

r.get('/', getChats);
r.post('/:sellerId', startChat);
r.get('/:chatId/messages', getMessages);
r.post('/:chatId/messages', sendMessage);

export default r;
