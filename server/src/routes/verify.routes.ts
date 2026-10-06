import { Router } from "express";
import { verifyDigitalId } from "../modules/verify/verify.controller";

const verifyRouter = Router();

verifyRouter.get("/:token", verifyDigitalId);

export default verifyRouter;
