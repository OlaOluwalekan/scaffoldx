import { StatusCodes } from "http-status-codes";
import User from "../models/User.model.js";

export const getUsers = async (req, res) => {
  const users = await User.find({});
  res.status(StatusCodes.OK).json(users);
};
