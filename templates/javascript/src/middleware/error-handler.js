import { StatusCodes } from "http-status-codes";

const errorHandlerMiddleware = (err, _req, res, _next) => {
  const customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message || "Something went wrong",
  };

  res.status(customError.statusCode).json({ message: customError.message });
};

export default errorHandlerMiddleware;
