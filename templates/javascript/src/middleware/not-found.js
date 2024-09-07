import { StatusCodes } from "http-status-codes";

const NotFound = (req, res) =>
  res
    .status(StatusCodes.NOT_FOUND)
    .send(`Route ${req.url} does not exist on method ${req.method}`);

export default NotFound;
