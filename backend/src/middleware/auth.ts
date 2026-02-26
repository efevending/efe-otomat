import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'efe-otomat-secret-key-2024';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme gerekli' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function generateRefreshToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET + '-refresh', { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET + '-refresh') as AuthUser;
}

export { JWT_SECRET };
