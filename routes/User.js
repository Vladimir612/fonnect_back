import express from "express";
import User from "../schemas/UserSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isUserActive } from "../activeUsers.js";

const router = express.Router();

const initUserRoutes = (io) => {
  router.get("/", async (_, res) => {
    try {
      const users = await User.find();
      const formattedUsers = users.map((user) => ({
        fullname: user.fullname,
        username: user.username,
        color: user.color,
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.post("/register", async (req, res) => {
    try {
      const { username, fullname, password } = req.body;

      const existingUser = await User.findOne({ username });

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username,
        fullname,
        password: hashedPassword,
        color: getRandomColor(),
      });
      await newUser.save();

      const token = jwt.sign(
        {
          userId: newUser._id,
          username: newUser.username,
          fullname: newUser.fullname,
        },
        process.env.SECRET,
        { expiresIn: "24h" }
      );

      io.emit("userRegistered", {
        fullname: newUser.fullname,
        username: newUser.username,
        color: newUser.color,
        active: true,
      });

      res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (isUserActive(username)) {
        return res.status(401).json({ message: "User already logged in" });
      }

      const existingUser = await User.findOne({ username });

      if (!existingUser) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        existingUser.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        {
          userId: existingUser._id,
          username: existingUser.username,
          fullname: existingUser.fullname,
        },
        process.env.SECRET,
        { expiresIn: "24h" }
      );

      io.emit("userConnected", {
        userId: existingUser._id,
        username: existingUser.username,
        fullname: existingUser.fullname,
      });
      res.status(200).json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return router;
};

const getRandomColor = () => {
  const colors = ["#C63D96", "#11C098", "#FFCD67", "#004A7C", "#F3716D"];

  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
};

export default initUserRoutes;
