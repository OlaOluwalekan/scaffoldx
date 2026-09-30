import { StatusCodes } from 'http-status-codes';

export const getHealth = (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'ok', uptime: process.uptime() });
};
