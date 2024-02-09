import express from "express";
import initUserRoutes from "./User.js";

const router = express.Router();

const apiRoutes = (io) => {
  router.use("/users", initUserRoutes(io));

  return router;
};

export default apiRoutes;
