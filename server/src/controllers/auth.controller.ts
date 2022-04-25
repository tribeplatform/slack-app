import { NextFunction, Request, Response } from 'express';
import passport from 'passport';

class AuthController {
  public webhookAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { networkId, redirect = '/' } = req.query;
      if (!networkId) {
        res.status(400).json({ success: false, message: '"networkId" is a mandatory param.' });
        return;
      }
      const state = Buffer.from(JSON.stringify({ n: networkId, r: redirect }), 'ascii').toString('base64');
      passport.authorize('webhook', {
        state,
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  };
  public webhookAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let buff = Buffer.from(String(req.query.state), 'base64');
      const { r: redirect } = JSON.parse(buff.toString('ascii')) as { r: string };

      if (!!redirect) {
        return res.redirect(redirect);
      }

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  };
  public webhookAuthFailure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let buff = Buffer.from(String(req.query.state), 'base64');
      const { r: redirect } = JSON.parse(buff.toString('ascii')) as { r: string };

      if (!!redirect) {
        return res.redirect(redirect);
      }
      res.status(200).json({
        success: false,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
