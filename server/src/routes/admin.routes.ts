import { Router } from "express";
import { authenticate, requireRole } from "../modules/auth/auth.middleware";
import { requireDatabase } from "../middleware/require-database";
import {
  createGeofence,
  getIncident,
  getOverview,
  updateGeofence,
  updateIncident,
  updateSos,
} from "../modules/admin/admin.controller";

const adminRouter = Router();

adminRouter.get("/access", authenticate, requireRole("admin"), (_request, response) => {
  response.status(200).json({ message: "Admin access granted." });
});

adminRouter.use(authenticate, requireRole("admin"), requireDatabase);

adminRouter.get("/overview", getOverview);
adminRouter.patch("/sos/:id", updateSos);
adminRouter.get("/incidents/:id", getIncident);
adminRouter.patch("/incidents/:id", updateIncident);
adminRouter.post("/geofences", createGeofence);
adminRouter.patch("/geofences/:id", updateGeofence);

export default adminRouter;
