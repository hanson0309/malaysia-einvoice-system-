import { Request } from 'express';
import mongoose from 'mongoose';

export interface JWTPayload {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
  tenantId?: mongoose.Types.ObjectId;
}
