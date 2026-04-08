const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST"],
  },
});

async function sendTelegramMessage(text) {
  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram env vars are missing");
    return;
  }

  var url = "https://api.telegram.org/bot" + token + "/sendMessage";

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
  } catch (err) {
    console.error("Telegram send failed:", err.message);
  }
}

function formatTelegramMessage(data) {
  var lines = [
    "🛒 حدث جديد من Checkout",
    "النوع: " + (data.type || "غير معروف"),
    "الصفحة: " + (data.page || "-"),
    "الوقت: " + (data.timestamp || "-"),
  ];

  if (data.email) lines.push("الإيميل: " + data.email);
  if (data.buttonText) lines.push("الزر: " + data.buttonText);
  if (Array.isArray(data.cartItems) && data.cartItems.length) {
    lines.push("عدد المنتجات: " + data.cartItems.length);
  }

  return lines.join("\n");
}

app.get("/", function (req, res) {
  res.send("Checkout Tracker is running");
});

app.get("/health", function (req, res) {
  res.json({ ok: true, service: "checkout-live-dashboard" });
});

app.post("/api/checkout-event", async function (req, res) {
  var data = req.body || {};
  data.timestamp = new Date().toISOString();

  io.emit("checkout_event", data);

  var types = ["page_view", "email_entered", "button_click", "order_completed"];
  if (types.indexOf(data.type) !== -1) {
    await sendTelegramMessage(formatTelegramMessage(data));
  }

  res.json({ status: "ok" });
});

io.on("connection", function (socket) {
  console.log("Dashboard connected:", socket.id);
  socket.on("disconnect", function () {
    console.log("Dashboard disconnected:", socket.id);
  });
});

var PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", function () {
  console.log("Server running on port " + PORT);
});
