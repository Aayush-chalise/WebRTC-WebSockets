const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
console.log("hello");

app.get("/", (req, res) => {
  res.send("Signaling server is active!");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  console.log(`✅ Device connected: ${socket.id}`);

  socket.on("offer", (data) => {
    console.log(`📡 Offer sent from ${socket.id}`);
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", (data) => {
    console.log(`📞 Answer sent from ${socket.id}`);
    socket.broadcast.emit("answer", data);
  });

  socket.on("ice-candidate", (data) => {
    socket.broadcast.emit("ice-candidate", data);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Device disconnected: ${socket.id}`);
  });
});

// "0.0.0.0" is key for local network access
server.listen(3000, "0.0.0.0", () => {
  console.log("🚀 Server running on port 3000");
  console.log("Next step: Run 'ngrok http 3000' and copy the URL.");
});
