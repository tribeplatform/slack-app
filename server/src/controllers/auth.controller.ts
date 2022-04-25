import { NextFunction, Request, Response } from 'express';

class AuthController {
  public index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.send('Ok');
    } catch (error) {
      next(error);
    }
  };
  public callback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        success: true
      })
    } catch (error) {
      next(error);
    }
  };
}

export default AuthController;
