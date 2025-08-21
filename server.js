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

const connectedUsers = new Map();

function getClientInfo(socket, clientData) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const realIP = socket.handshake.headers['x-real-ip'];
  const remoteAddress = socket.handshake.address;
  
  let ip = 'Unknown';
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIP) {
    ip = realIP;
  } else if (remoteAddress) {
    ip = remoteAddress.replace('::ffff:', '');
  }
  
  // Simple location detection based on IP patterns
  let location = 'Unknown';
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    location = 'Local Network';
  } else if (ip === '127.0.0.1' || ip === '::1') {
    location = 'Localhost';
  } else {
    location = 'External';
  }
  
  return {
    ...clientData,
    ip,
    location,
    joinTime: Date.now(),
    socketId: socket.id
  };
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('user joined', (clientData) => {
    const clientInfo = getClientInfo(socket, clientData);
    connectedUsers.set(socket.id, clientInfo);
    
    const userArray = Array.from(connectedUsers.entries());
    io.emit('active users', { 
      count: connectedUsers.size, 
      users: userArray 
    });
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
    connectedUsers.delete(socket.id);
    
    const userArray = Array.from(connectedUsers.entries());
    io.emit('active users', { 
      count: connectedUsers.size, 
      users: userArray 
    });
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});