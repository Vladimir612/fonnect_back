import express from "express";
import initUserRoutes from "./User.js";
import initConversationRoutes from "./Conversation.js";

const router = express.Router();

const apiRoutes = (io) => {
  router.use("/users", initUserRoutes(io));
  router.use("/conversations", initConversationRoutes(io));

  return router;
};

export default apiRoutes;
