import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index';
import { authenticateToken, generateToken, generateRefreshToken, verifyRefreshToken } from '../middleware/auth';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username) as any;

  if (!user) {
    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
  }

  const tokenPayload = { id: user.id, username: user.username, role: user.role };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone
    }
  });
});

router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token gerekli' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(decoded.id) as any;

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    const tokenPayload = { id: user.id, username: user.username, role: user.role };
    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(403).json({ error: 'Geçersiz refresh token' });
  }
});

router.get('/me', authenticateToken, (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, username, full_name, role, phone, created_at FROM users WHERE id = ?').get(req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
  }
  res.json(user);
});

export default router;
