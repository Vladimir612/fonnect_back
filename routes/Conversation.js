import express from "express";
import Conversation from "../schemas/ConversationSchema.js";
import User from "../schemas/UserSchema.js";

const router = express.Router();

const initConversationRoutes = (io) => {
  router.post("/", async (req, res) => {
    try {
      const { name, username } = req.body;

      const user = await User.findOne({ username });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const newConversation = await Conversation.create({
        name: name || null,
        participants: [user._id],
        createdAt: new Date(),
      });

      io.emit("groupAdded", {
        _id: newConversation._id,
        name: newConversation.name,
      });
      res.status(201).json(newConversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/messages", async (req, res) => {
    try {
      const { senderUsername, receiverUsername, content, conversationId } =
        req.body;

      let conversation;

      if (senderUsername === receiverUsername) {
        const sender = await User.findOne({ username: senderUsername });
        if (!sender) {
          return res.status(404).json({ error: "User not found" });
        }

        conversation = await Conversation.findOne({
          participants: [sender._id],
          name: "",
        });

        if (!conversation) {
          conversation = await Conversation.create({
            name: "",
            participants: [sender._id],
            messages: [{ sender: sender._id, content }],
            createdAt: new Date(),
          });
        } else {
          conversation.messages.push({ sender: sender._id, content });
          await conversation.save();
        }

        const conversationWithPopulatedMessages = await Conversation.findById(
          conversation._id
        )
          .populate({
            path: "messages.sender",
            select: "username fullname color",
          })
          .exec();

        return res.status(201).json(conversationWithPopulatedMessages);
      }

      if (!conversationId) {
        const sender = await User.findOne({ username: senderUsername });
        const receiver = await User.findOne({ username: receiverUsername });

        if (!sender || !receiver) {
          return res
            .status(404)
            .json({ error: "Jedan ili oba korisnika nisu pronađena" });
        }

        conversation = await Conversation.findOne({
          $or: [
            { participants: [sender._id, receiver._id] },
            { participants: [receiver._id, sender._id] },
          ],
        });

        if (!conversation) {
          conversation = await Conversation.create({
            name: "",
            participants: [sender._id, receiver._id],
            messages: [{ sender: sender._id, content }],
            createdAt: new Date(),
          });
        } else {
          conversation.messages.push({ sender: sender._id, content });
          await conversation.save();
        }

        const receiverSocket = Array.from(io.sockets.sockets.values()).find(
          (socket) => socket.username === receiverUsername
        );

        if (receiverSocket) {
          receiverSocket.emit("newMessage", {
            message: { sender: sender, content },
            conversationId: conversation._id,
            type: "private",
          });
        }
      } else {
        conversation = await Conversation.findById(conversationId);
        const sender = await User.findOne({ username: senderUsername });

        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        if (!sender) {
          return res.status(404).json({ error: "Sender not found" });
        }

        conversation.messages.push({ sender: sender._id, content });
        await conversation.save();

        const participants = conversation.participants;

        let users = [];

        await Promise.all(
          participants.map(async (participantId) => {
            try {
              const user = await User.findById(participantId);
              if (user && user.username !== senderUsername) {
                users.push(user.username);
              }
            } catch (error) {
              console.error("Error fetching user:", error);
            }
          })
        );

        users.forEach((username) => {
          const receiverSocket = Array.from(io.sockets.sockets.values()).find(
            (socket) => socket.username === username
          );

          if (receiverSocket) {
            receiverSocket.emit("newMessage", {
              message: { sender: sender, content },
              conversationId: conversation._id,
              type: "groupchat",
            });
          }
        });
      }
      const conversationWithPopulatedMessages = await Conversation.findById(
        conversation._id
      )
        .populate({
          path: "messages.sender",
          select: "username fullname color",
        })
        .exec();

      res.status(201).json(conversationWithPopulatedMessages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.patch("/:conversationId/join", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { username } = req.body;

      const conversation = await Conversation.findById(conversationId)
        .populate("participants", "username fullname color")
        .populate({
          path: "messages.sender",
          select: "username fullname color",
        });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const user = await User.findOne({ username });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isParticipant = conversation.participants.some((participant) =>
        participant._id.equals(user._id)
      );

      if (isParticipant) {
        return res.status(400).json({
          error: "User is already a participant in this conversation",
        });
      }

      conversation.participants.push(user._id);
      await conversation.save();

      res.status(200).json(conversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/:conversationId/messages", async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { username } = req.query;

      const conversation = await Conversation.findById(conversationId)
        .populate("participants", "username fullname color")
        .populate({
          path: "messages.sender",
          select: "username fullname color",
        });

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const user = await User.findOne({ username });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isParticipant = conversation.participants.some((participant) =>
        participant._id.equals(user._id)
      );

      if (!isParticipant) {
        return res.status(403).json({
          error: "User is not a participant in this conversation",
        });
      }

      res.status(200).json(conversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/groups", async (_, res) => {
    try {
      const conversations = await Conversation.find(
        { name: { $ne: "" } },
        "_id name"
      );

      res.status(200).json(conversations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/private-convos", async (req, res) => {
    try {
      const { username } = req.query;

      const user = await User.findOne({ username });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const conversations = await Conversation.find(
        { name: "", participants: user._id },
        "_id participants"
      )
        .populate("participants", "username fullname color")
        .lean();

      const modifiedConversations = conversations.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.filter(
          (participant) => participant._id.toString() !== user._id.toString()
        ),
      }));

      res.status(200).json(modifiedConversations);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};

export default initConversationRoutes;
