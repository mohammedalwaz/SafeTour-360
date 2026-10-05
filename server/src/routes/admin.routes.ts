import { Router } from "express";
import { authenticate, requireRole } from "../modules/auth/auth.middleware";

const adminRouter = Router();

adminRouter.get("/access", authenticate, requireRole("admin"), (_request, response) => {
  response.status(200).json({ message: "Admin access granted." });
});

export default adminRouter;
