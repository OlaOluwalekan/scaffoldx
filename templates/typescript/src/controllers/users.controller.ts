import { StatusCodes } from "http-status-codes";
import User from "../models/User.model.js";
import { Request, Response } from "express";

export const getUsers = async (req: Request, res: Response) => {
  const users = await User.find({});
  res.status(StatusCodes.OK).json(users);
};
