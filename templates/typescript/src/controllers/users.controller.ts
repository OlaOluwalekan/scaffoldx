import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import * as usersService from '../services/users.service.js';

export const getUsers = async (req: Request, res: Response) => {
  const users = await usersService.getUsers();
  res.status(StatusCodes.OK).json(<% if (useDatabase) { %>users<% } else { %>{ users }<% } %>);
};
