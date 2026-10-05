import { Router } from "express";
import {
  currentUser,
  login,
  register,
} from "./auth.controller";
import { authenticate } from "./auth.middleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, currentUser);

export default authRouter;
