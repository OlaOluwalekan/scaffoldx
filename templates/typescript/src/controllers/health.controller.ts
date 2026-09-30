import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(StatusCodes.OK).json({ status: 'ok', uptime: process.uptime() });
};
