import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import * as usersService from '../services/users.service';

export const getUsers = async (_req: Request, res: Response) => {
  const users = await usersService.getUsers();
  res.status(StatusCodes.OK).json(<% if (useDatabase) { %>users<% } else { %>{ users }<% } %>);
};
