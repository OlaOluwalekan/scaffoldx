import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

const NotFound = (req: Request, res: Response) =>
  res
    .status(StatusCodes.NOT_FOUND)
    .send(`Route ${req.url} does not exist on method ${req.method}`);

export default NotFound;
