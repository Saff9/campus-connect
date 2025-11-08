const Message = require('../models/Message');
const User = require('../models/User');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Join group rooms
    socket.on('join_groups', (groupIds) => {
      if (Array.isArray(groupIds)) {
        groupIds.forEach(groupId => {
          socket.join(groupId.toString());
          console.log(`User ${socket.id} joined group: ${groupId}`);
        });
      }
    });

    // Join specific channel
    socket.on('join_channel', ({ groupId, channel }) => {
      const roomId = `${groupId}-${channel}`;
      socket.join(roomId);
      console.log(`User ${socket.id} joined channel: ${roomId}`);
    });

    // Handle sending messages
    socket.on('send_message', async (messageData) => {
      try {
        const message = new Message(messageData);
        await message.save();
        
        // Populate sender info
        await message.populate('sender', 'firstName lastName avatar');
        
        const roomId = `${messageData.group}-${messageData.channel}`;
        io.to(roomId).emit('new_message', message);
        
        console.log(`📨 Message sent to ${roomId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', ({ groupId, channel, user }) => {
      const roomId = `${groupId}-${channel}`;
      socket.to(roomId).emit('user_typing', { user, typing: true });
    });

    socket.on('typing_stop', ({ groupId, channel, user }) => {
      const roomId = `${groupId}-${channel}`;
      socket.to(roomId).emit('user_typing', { user, typing: false });
    });

    // Handle user status updates
    socket.on('user_online', async (userId) => {
      await User.findByIdAndUpdate(userId, { 
        status: 'online',
        lastSeen: new Date()
      });
      socket.broadcast.emit('user_status_changed', { userId, status: 'online' });
    });

    socket.on('user_away', async (userId) => {
      await User.findByIdAndUpdate(userId, { status: 'away' });
      socket.broadcast.emit('user_status_changed', { userId, status: 'away' });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`🔌 User disconnected: ${socket.id} - ${reason}`);
      
      // Note: In production, you'd want to track which user this socket belongs to
      // and update their status accordingly
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

module.exports = { setupSocketHandlers };
