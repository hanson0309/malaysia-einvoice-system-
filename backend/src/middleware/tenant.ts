import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import mongoose from 'mongoose';

export const extractTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  req.tenantId = new mongoose.Types.ObjectId(req.user.tenant_id);
  next();
};
