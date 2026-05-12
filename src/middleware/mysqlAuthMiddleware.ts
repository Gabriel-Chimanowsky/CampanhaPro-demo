import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'campanhapro_super_secret_key_2024';

export function mysqlAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Se não tiver token, mas o ambiente permitir bypass (opcional para transição)
      return res.status(401).json({ error: 'Token de autenticação ausente.' });
    }

    const token = authHeader.substring(7);
    
    try {
      // Tenta validar como JWT customizado (MySQL)
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
      return next();
    } catch (jwtErr) {
      // Se falhar o JWT customizado, talvez seja um token do Supabase?
      // Por enquanto, rejeitamos.
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
  } catch (err: any) {
    console.error('[MySQL Auth Middleware] Erro:', err.message);
    return res.status(500).json({ error: 'Erro interno na autenticação.' });
  }
}
