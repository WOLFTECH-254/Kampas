
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getHousings, getHousing, saveHousing } from '../controllers/housing.controller.js';

const r = Router();

r.get('/', getHousings);
r.get('/:id', getHousing);
r.post('/:id/save', authenticate, saveHousing);

export default r;
