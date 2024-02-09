import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectToDatabase from "./config/DatabaseConfig.js";
import apiRoutes from "./routes/index.js";
import { Server } from "socket.io";
import http from "http";

import { addUser, removeUser, emitActiveUsers } from "./activeUsers.js";

dotenv.config();

const app = express();

const port = process.env.PORT || 5000;
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Postavi na URL tvoje React aplikacije
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());

app.get("/", (_, res) => {
  res.send("Hello, World!");
});

io.on("connect", (socket) => {
  const { username } = socket.handshake.query;
  socket.username = username;

  addUser(username);
  emitActiveUsers(io);

  socket.on("disconnect", () => {
    removeUser(socket.username);
    emitActiveUsers(io);
  });
});

app.use("/api", apiRoutes(io));

server.listen(port, async () => {
  console.log(`Server is listening on port: ${port}`);
  connectToDatabase();
});
