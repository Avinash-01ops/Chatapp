const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow all origins
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let activeUsers = 0;

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('user joined', () => {
    activeUsers++;
    io.emit('active users', activeUsers);
  });

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
  });

  socket.on('reaction', (data) => {
    socket.broadcast.emit('reaction', data);
  });

  socket.on('mark read', ({ messageId }) => {
    socket.broadcast.emit('message read', { messageId });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    activeUsers = Math.max(0, activeUsers - 1);
    io.emit('active users', activeUsers);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});