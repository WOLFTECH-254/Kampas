import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

export const requireSeller = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'SELLER' && req.user.role !== 'BOTH')) {
    return res.status(403).json({ success: false, message: 'Seller access required' });
  }
  next();
};
