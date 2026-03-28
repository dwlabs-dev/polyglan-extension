import type { Request, Response, NextFunction } from 'express';
import { contextStore } from '@lib/context.js';

/**
 * Middleware to ensure the request is authenticated with a Bearer token.
 * Extends the Request object with an accessToken property and wraps
 * the request chain in an AsyncLocalStorage context.
 */
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Token de Autenticação não fornecido'
    });
  }

  const accessToken = authHeader.split(' ')[1];

  (req as any).accessToken = accessToken;

  // Wrap the call to next() in the AsyncLocalStorage context.
  contextStore.run({ accessToken }, () => {
    next();
  });
};
