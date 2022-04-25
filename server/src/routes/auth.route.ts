import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import AuthController from '@controllers/auth.controller';
import passport from 'passport';

class AuthRoute implements Routes {
  public path = '/api/slack';
  public router = Router();
  public authController = new AuthController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/auth`, passport.authorize('slack'));
    this.router.get(`${this.path}/auth/callback`, passport.authorize('slack', { failureRedirect: '/login' }), this.authController.callback);
  }
}

export default AuthRoute;
