
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createTicket, getUserTickets, getUserTicket, sendUserMessage } from '../controllers/support.controller.js';

const r = Router();
r.use(authenticate);

r.post('/tickets',                  createTicket);
r.get('/tickets',                   getUserTickets);
r.get('/tickets/:id',               getUserTicket);
r.post('/tickets/:id/messages',     sendUserMessage);

export default r;
