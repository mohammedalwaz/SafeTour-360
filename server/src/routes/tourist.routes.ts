import { Router } from "express";
import { authenticate, requireRole } from "../modules/auth/auth.middleware";

const touristRouter = Router();

touristRouter.get(
  "/access",
  authenticate,
  requireRole("tourist"),
  (_request, response) => {
    response.status(200).json({ message: "Tourist access granted." });
  },
);

export default touristRouter;
