import express from "express";
import { getUsers } from "../controllers/users.controller";

const userRoutes = express.Router();

userRoutes.get("/", getUsers);

export default userRoutes;
