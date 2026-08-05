import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import passport from "./config/passport.js";
import postRoutes from "./routes/posts.routes.js";
import userRoutes from "./routes/user.routes.js";
import messagingRoutes from "./routes/messaging.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import User from "./models/user.model.js";
import Message from "./models/message.model.js";
import Notification from "./models/notification.model.js";
import resumeRoutes from "./routes/resume.routes.js";
import skillsRoutes from "./routes/skills.routes.js";
import { registerAIInterviewHandlers } from "./controllers/ai-interview.controller.js";
import { startMarketAnalyzer } from "./utils/marketAnalyzer.js";
import avatarInterviewRoutes from "./routes/avatar-interview.routes.js";
import { registerAvatarInterviewHandlers } from "./controllers/avatar-interview.controller.js";
import { createAndEmitNotification } from "./utils/notificationHelper.js";

// --- SWAGGER IMPORTS ---
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9090;
const URL = process.env.MONGO_URL;

// --- 1. DETERMINE SERVER URL ---
const SERVER_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const corsOptions = {
    origin: ["http://localhost:3000", process.env.FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
};

app.use(cors(corsOptions));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || "supersecretkey",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Auth Routes
const CLIENT_URL = process.env.FRONTEND_URL || "http://localhost:3000";
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect(`${CLIENT_URL}/login?token=${req.user.token}`);
    }
);
app.get(
    "/auth/github",
    passport.authenticate("github", { scope: ["user:email"] })
);
app.get(
    "/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect(`${CLIENT_URL}/login?token=${req.user.token}`);
    }
);

// --- SWAGGER CONFIGURATION ---
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "LinkUps API Documentation",
            version: "1.0.0",
            description:
                "API documentation for the LinkUps Professional Network",
            contact: {
                name: "LinkUps Support",
            },
        },
        servers: [
            {
                url: SERVER_URL,
                description:
                    process.env.NODE_ENV === "production"
                        ? "Production Server"
                        : "Development Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ["./routes/*.js"],
};

const specs = swaggerJsDoc(swaggerOptions);

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "LinkUps API Docs",
    })
);

// --- SOCKET LOGIC ---
const userSocketMap = new Map();
let meetingMessages = {};

// Middleware to attach IO and SocketMap to Request
app.use((req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    next();
});

// --- API ROUTES ---
app.use(postRoutes);
app.use(userRoutes);
app.use(messagingRoutes);
app.use(notificationRoutes);
app.use(resumeRoutes);
app.use(skillsRoutes);
app.use(avatarInterviewRoutes);

io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // --- AI VOICE INTERVIEW HANDLERS ---
    registerAIInterviewHandlers(io, socket);

    // --- PHOTOREALISTIC AVATAR INTERVIEW HANDLERS ---
    registerAvatarInterviewHandlers(io, socket);

    socket.on("register-user", async (userId) => {
        if (userId) {
            userSocketMap.set(userId, socket.id);
            try {
                await User.findByIdAndUpdate(userId, { isOnline: true });
                io.emit("user-status-change", { userId, isOnline: true });

                const pendingMessages = await Message.find({
                    receiver: userId,
                    status: "sent",
                });
                if (pendingMessages.length > 0) {
                    await Message.updateMany(
                        { receiver: userId, status: "sent" },
                        {
                            $set: {
                                status: "delivered",
                                deliveredAt: Date.now(),
                            },
                        }
                    );
                    pendingMessages.forEach((msg) => {
                        const senderSocketId = userSocketMap.get(
                            msg.sender.toString()
                        );
                        if (senderSocketId) {
                            io.to(senderSocketId).emit(
                                "message-status-update",
                                { messageId: msg._id, status: "delivered" }
                            );
                        }
                    });
                }
            } catch (e) {
                console.error(e);
            }
        }
    });

    socket.on(
        "send-chat-message",
        async ({ senderId, receiverId, message }) => {
            const receiverSocketId = userSocketMap.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receive-chat-message", {
                    sender: senderId,
                    message,
                    status: "delivered",
                    createdAt: new Date().toISOString(),
                });
            }
        }
    );

    socket.on("mark-as-read", async ({ senderId, receiverId }) => {
        const senderSocketId = userSocketMap.get(senderId);
        if (senderSocketId)
            io.to(senderSocketId).emit("messages-read-update", { receiverId });
    });

    socket.on("edit-message", ({ messageId, newMessage, receiverId }) => {
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId)
            io.to(receiverSocketId).emit("message-updated", {
                messageId,
                newMessage,
                isEdited: true,
            });
    });

    socket.on("delete-message", ({ messageId, receiverId }) => {
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId)
            io.to(receiverSocketId).emit("message-deleted", {
                messageId,
                isDeleted: true,
                message: "This message was deleted",
            });
    });

    socket.on("start-call", async ({ fromUser, toUserId, roomUrl }) => {
        const toSocketId = userSocketMap.get(toUserId);

        if (toSocketId) {
            // User is Online -> Ring them
            io.to(toSocketId).emit("incoming-call", { fromUser, roomUrl });
        } else {
            // User is Offline -> Create Missed Call Notification via helper
            const callerUser = {
                _id: fromUser._id,
                name: fromUser.name,
                username: fromUser.username,
                profilePicture: fromUser.profilePicture,
            };
            await createAndEmitNotification(io, userSocketMap, {
                recipient: toUserId,
                sender:    callerUser,
                type:      "missed_call",
                message:   "tried to video call you.",
                priority:  "warning",
            });
        }
    });

    socket.on("join-call", (roomId, userId) => {
        const isPrivateRoom = /^[a-f\d]{24}-[a-f\d]{24}$/i.test(roomId);

        if (isPrivateRoom) {
            const allowedUsers = roomId.split("-");

            if (!userId) {
                socket.emit(
                    "call-denied",
                    "Authentication required for private calls."
                );
                return;
            }

            if (!allowedUsers.includes(userId)) {
                socket.emit(
                    "call-denied",
                    "Access Denied: You are not invited to this private meeting."
                );
                return;
            }
        }

        socket.join(roomId);
        socket.room = roomId;

        const clients = io.sockets.adapter.rooms.get(roomId);
        const clientsArr = clients ? Array.from(clients) : [];
        io.to(roomId).emit("user-joined", socket.id, clientsArr);

        if (meetingMessages[roomId]) {
            meetingMessages[roomId].forEach((msg) => {
                io.to(socket.id).emit(
                    "video-chat-message",
                    msg.data,
                    msg.sender,
                    msg.socketIdSender
                );
            });
        }
    });

    socket.on("signal", (toId, message) => {
        io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("video-chat-message", (data, sender) => {
        const room = socket.room;
        if (room) {
            if (!meetingMessages[room]) meetingMessages[room] = [];
            meetingMessages[room].push({
                sender,
                data,
                socketIdSender: socket.id,
            });
            io.to(room).emit("video-chat-message", data, sender, socket.id);
        }
    });

    socket.on("disconnect", () => {
        const room = socket.room;
        if (room) {
            io.to(room).emit("user-left", socket.id);
            setTimeout(() => {
                const clients = io.sockets.adapter.rooms.get(room);
                if (!clients || clients.size === 0) {
                    delete meetingMessages[room];
                }
            }, 1000);
        }

        for (let [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);

                // --- FIX STARTS HERE ---
                const now = new Date();
                // 1. Update DB with current time
                User.findByIdAndUpdate(userId, {
                    isOnline: false,
                    lastSeen: now,
                }).catch((e) => {});
                // 2. Emit new time to frontend immediately
                io.emit("user-status-change", {
                    userId,
                    isOnline: false,
                    lastSeen: now,
                });
                // --- FIX ENDS HERE ---

                break;
            }
        }
    });
});

const start = async () => {
    try {
        await mongoose.connect(URL);
        console.log("✅ MongoDB connected");
        console.log(`📄 Swagger Docs available at ${SERVER_URL}/api-docs`);

        // --- START MARKET ANALYZER CRON (after DB is ready) ---
        startMarketAnalyzer();

        httpServer.listen(PORT, () =>
            console.log(`🚀 Server running on port ${PORT}`)
        );
    } catch (err) {
        console.error(err);
    }
};
start();
