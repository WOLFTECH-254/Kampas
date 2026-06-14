
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCommunityMessages, sendCommunityMessage } from '../controllers/community.controller.js';

const r = Router();
r.use(authenticate);

r.get('/',  getCommunityMessages);
r.post('/', sendCommunityMessage);

export default r;
