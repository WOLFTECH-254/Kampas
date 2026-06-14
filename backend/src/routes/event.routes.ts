
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getEvents, getEvent, rsvpEvent, buyTicket, getMyTickets } from '../controllers/event.controller.js';

const r = Router();

r.get('/', getEvents);
r.get('/my/tickets', authenticate, getMyTickets);
r.get('/:id', getEvent);
r.post('/:id/rsvp', authenticate, rsvpEvent);
r.post('/:id/ticket', authenticate, buyTicket);

export default r;
