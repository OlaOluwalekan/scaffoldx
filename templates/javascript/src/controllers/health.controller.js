import { StatusCodes } from 'http-status-codes';

export const getHealth = (_req, res) => {
  res.status(StatusCodes.OK).json({ status: 'ok', uptime: process.uptime() });
};
