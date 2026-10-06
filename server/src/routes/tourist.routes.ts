import { Router } from "express";
import { authenticate, requireRole } from "../modules/auth/auth.middleware";
import { requireDatabase } from "../middleware/require-database";
import {
  createIncident,
  createSos,
  getDigitalId,
  getOverview,
  getRisk,
  issueTouristDigitalId,
  listIncidents,
  listSos,
  revokeTouristDigitalId,
  saveLocation,
} from "../modules/tourist/tourist.controller";

const touristRouter = Router();

touristRouter.get(
  "/access",
  authenticate,
  requireRole("tourist"),
  (_request, response) => {
    response.status(200).json({ message: "Tourist access granted." });
  },
);

touristRouter.use(authenticate, requireRole("tourist"), requireDatabase);

touristRouter.get("/overview", getOverview);
touristRouter.get("/risk", getRisk);
touristRouter.post("/location", saveLocation);
touristRouter.post("/sos", createSos);
touristRouter.get("/sos", listSos);
touristRouter.post("/incidents", createIncident);
touristRouter.get("/incidents", listIncidents);
touristRouter.get("/digital-id", getDigitalId);
touristRouter.post("/digital-id", issueTouristDigitalId);
touristRouter.post("/digital-id/revoke", revokeTouristDigitalId);

export default touristRouter;
