
import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from './auth.js';

export const requireVerified = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user!.id },
    select: { isVerified: true },
  });

  if (!user?.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before performing this action.',
      code:    'EMAIL_NOT_VERIFIED',
    });
  }

  next();
};
