const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1.5e7 // 15 MB (10 MB file + base64 overhead + headroom)
});

app.use(express.static('public'));

// ===== STORES =====
const userStore = new Map();
const chatStore = new Map();
const pendingStore = new Map();

// ===== CONSTANTS =====
const MAX_FILE_BYTES = 10 * 1024 * 1024;      // 10 MB
const MAX_VOICE_SECONDS = 120;                 // 2 minutes
const MAX_BASE64_LEN = Math.ceil((MAX_FILE_BYTES * 4) / 3) + 1024; // ~13.3 MB + slack

// ===== HELPERS =====
function generatePIN() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pin = '';
    for (let i = 0; i < 8; i++) pin += chars.charAt(Math.floor(Math.random() * chars.length));
    return pin;
}

function isPINUnique(pin) {
    for (const [phone, user] of userStore) if (user.pin === pin) return false;
    return true;
}

function getUniquePIN() {
    let pin = generatePIN();
    let attempts = 0;
    while (!isPINUnique(pin) && attempts < 100) { pin = generatePIN(); attempts++; }
    return pin;
}

function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 0) return phone;
    if (cleaned.length <= 3) return '+' + cleaned;
    if (cleaned.length <= 6) return '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
    if (cleaned.length <= 9) return '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 6) + ' ' + cleaned.slice(6);
    return '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 6) + ' ' + cleaned.slice(6, 10);
}

// Check if a base64 payload is within the 10 MB decoded limit
function isValidBase64Size(base64Data) {
    if (!base64Data || typeof base64Data !== 'string') return false;
    // Strip data URL prefix if present
    const commaIdx = base64Data.indexOf(',');
    const raw = commaIdx >= 0 ? base64Data.slice(commaIdx + 1) : base64Data;
    // Rough decoded byte estimate
    const approxBytes = Math.floor((raw.length * 3) / 4);
    return approxBytes <= MAX_FILE_BYTES;
}

// Find user by pin (returns { phone, user } or null)
function findUserByPin(pin) {
    for (const [phone, user] of userStore) {
        if (user.pin === pin) return { phone, user };
    }
    return null;
}

// ===== API ROUTES =====
app.get('/pin', (req, res) => {
    const phone = req.query.phone;
    const action = req.query.action || 'generate';
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');

    if (userStore.has(cleanPhone)) {
        const user = userStore.get(cleanPhone);
        if (action === 'recover') return res.json({ pin: user.pin, exists: true, message: 'PIN recovered successfully' });
        return res.json({ pin: user.pin, exists: true, message: 'PIN already exists for this number' });
    }

    if (action === 'generate') {
        const pin = getUniquePIN();
        userStore.set(cleanPhone, { pin, name: '', socketId: null, chats: [], status: 'offline', lastSeen: Date.now() });
        return res.json({ pin, exists: false, message: 'New PIN generated successfully' });
    }

    if (action === 'recover') return res.status(404).json({ error: 'Phone number not found' });
    return res.status(400).json({ error: 'Invalid action' });
});

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', ({ pin, phone, name }) => {
        const found = findUserByPin(pin);
        if (!found) return socket.emit('error', 'Invalid PIN');

        const { phone: foundPhone, user } = found;
        user.socketId = socket.id;
        if (name) user.name = name;
        user.status = 'online';
        user.lastSeen = Date.now();
        userStore.set(foundPhone, user);
        socket.join(`user_${pin}`);
        console.log(`✅ User ${pin} registered - ONLINE`);

        socket.emit('registered', { pin, name: user.name, phone: formatPhoneNumber(foundPhone) });

        // Broadcast online status + chat list to the user
        const chatStatuses = [];
        if (user.chats && user.chats.length > 0) {
            user.chats.forEach(chat => {
                const chatData = chatStore.get(chat.chatId);
                if (chatData) {
                    const otherPin = chatData.participants.find(p => p !== pin);
                    if (otherPin) {
                        const otherUser = findUserByPin(otherPin);
                        const status = otherUser && otherUser.user.socketId ? 'online' : 'offline';
                        const lastSeen = otherUser ? (otherUser.user.lastSeen || Date.now()) : Date.now();
                        chatStatuses.push({ chatId: chat.chatId, partnerPin: otherPin, status, lastSeen });
                        io.to(`user_${otherPin}`).emit('partner-status', { pin, status: 'online', lastSeen: Date.now() });
                    }
                }
            });
        }
        socket.emit('chat-statuses', chatStatuses);

        // Send pending requests
        const pending = [];
        for (const [key, req] of pendingStore) {
            if (req.toPin === pin) pending.push({ fromPin: req.fromPin, fromName: req.fromName, timestamp: req.timestamp });
        }
        if (pending.length > 0) socket.emit('pending-requests', pending);
    });

    socket.on('get-pending-requests', ({ pin }) => {
        const pending = [];
        for (const [key, req] of pendingStore) {
            if (req.toPin === pin) pending.push({ fromPin: req.fromPin, fromName: req.fromName, timestamp: req.timestamp });
        }
        socket.emit('pending-requests', pending);
    });

    socket.on('get-user-status', ({ pin }) => {
        const found = findUserByPin(pin);
        if (found) {
            socket.emit('user-status', {
                userId: pin,
                status: found.user.socketId ? 'online' : 'offline',
                lastSeen: found.user.lastSeen || Date.now()
            });
        }
    });

    socket.on('get-partner-status', ({ pin }) => {
        const found = findUserByPin(pin);
        if (found) {
            socket.emit('partner-status', {
                pin,
                status: found.user.socketId ? 'online' : 'offline',
                lastSeen: found.user.lastSeen || Date.now()
            });
        }
    });

    socket.on('update-name', ({ pin, name }) => {
        const found = findUserByPin(pin);
        if (found) {
            found.user.name = name;
            userStore.set(found.phone, found.user);
        }
        socket.emit('name-updated', { name });
    });

    socket.on('send-request', ({ fromPin, toPin, fromName }) => {
        const toFound = findUserByPin(toPin);
        if (!toFound) return socket.emit('error', 'User not found');
        if (fromPin === toPin) return socket.emit('error', 'Cannot add yourself');

        const fromFound = findUserByPin(fromPin);
        if (fromFound && fromFound.user.chats && fromFound.user.chats.some(c => c.pin === toPin)) {
            return socket.emit('error', 'Already friends');
        }

        for (const [key, req] of pendingStore) {
            if ((req.fromPin === fromPin && req.toPin === toPin) || (req.fromPin === toPin && req.toPin === fromPin)) {
                return socket.emit('error', 'Request already pending');
            }
        }

        const requestId = `req_${Date.now()}`;
        pendingStore.set(requestId, { fromPin, toPin, fromName: fromName || 'User', timestamp: Date.now() });

        io.to(`user_${toPin}`).emit('new-request', { fromPin, fromName: fromName || 'User', timestamp: Date.now() });
        if (toFound.user.socketId) {
            const targetSocket = io.sockets.sockets.get(toFound.user.socketId);
            if (targetSocket) targetSocket.emit('new-request', { fromPin, fromName: fromName || 'User', timestamp: Date.now() });
        }
        socket.emit('request-sent', { toPin, toName: toFound.user.name || 'User' });
    });

    socket.on('accept-request', ({ fromPin, toPin }) => {
        let requestId = null, request = null;
        for (const [key, req] of pendingStore) {
            if (req.fromPin === fromPin && req.toPin === toPin) { requestId = key; request = req; break; }
        }
        if (!request) return socket.emit('error', 'Request not found');

        pendingStore.delete(requestId);
        const chatId = `chat_${Date.now()}`;
        chatStore.set(chatId, { participants: [fromPin, toPin], messages: [], createdAt: Date.now() });

        const fromFound = findUserByPin(fromPin);
        const toFound = findUserByPin(toPin);

        if (fromFound) {
            if (!fromFound.user.chats) fromFound.user.chats = [];
            fromFound.user.chats.push({
                pin: toPin,
                name: toFound ? toFound.user.name : 'User',
                chatId,
                phone: toFound ? formatPhoneNumber(toFound.phone) : ''
            });
            userStore.set(fromFound.phone, fromFound.user);
        }
        if (toFound) {
            if (!toFound.user.chats) toFound.user.chats = [];
            toFound.user.chats.push({
                pin: fromPin,
                name: fromFound ? fromFound.user.name : 'User',
                chatId,
                phone: fromFound ? formatPhoneNumber(fromFound.phone) : ''
            });
            userStore.set(toFound.phone, toFound.user);
        }

        const statusFrom = fromFound && fromFound.user.socketId ? 'online' : 'offline';
        const statusTo = toFound && toFound.user.socketId ? 'online' : 'offline';

        if (fromFound && fromFound.user.socketId) {
            io.to(`user_${fromPin}`).emit('request-accepted', {
                withPin: toPin,
                withName: toFound ? toFound.user.name : 'User',
                chatId,
                partnerStatus: statusTo
            });
        }
        if (toFound && toFound.user.socketId) {
            io.to(`user_${toPin}`).emit('request-accepted', {
                withPin: fromPin,
                withName: fromFound ? fromFound.user.name : 'User',
                chatId,
                partnerStatus: statusFrom
            });
        }
    });

    socket.on('decline-request', ({ fromPin, toPin }) => {
        let requestId = null;
        for (const [key, req] of pendingStore) {
            if (req.fromPin === fromPin && req.toPin === toPin) { requestId = key; break; }
        }
        if (!requestId) return socket.emit('error', 'Request not found');
        pendingStore.delete(requestId);

        const fromFound = findUserByPin(fromPin);
        if (fromFound && fromFound.user.socketId) {
            io.to(`user_${fromPin}`).emit('request-declined', { byPin: toPin, byName: 'User' });
        }
        socket.emit('request-declined-success');
    });

    // ===== TEXT =====
    socket.on('chat-message', ({ chatId, text, messageId, fromPin }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return socket.emit('error', 'Chat not found');
        const messageData = { id: messageId, text, from: fromPin, timestamp: Date.now(), type: 'text', deleted: false };
        chat.messages.push(messageData);
        chatStore.set(chatId, chat);
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('chat-message', { ...messageData, chatId });
        });
    });

    // ===== IMAGE (≤10 MB) =====
    socket.on('chat-image', ({ chatId, image, fileName, messageId, fromPin }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return;
        if (!isValidBase64Size(image)) {
            return socket.emit('error', 'Image exceeds 10 MB limit');
        }
        const messageData = { id: messageId, image, fileName, from: fromPin, timestamp: Date.now(), type: 'image', deleted: false };
        chat.messages.push(messageData);
        chatStore.set(chatId, chat);
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('chat-image', { ...messageData, chatId });
        });
    });

    // ===== FILE (≤10 MB) =====
    socket.on('chat-file', ({ chatId, fileData, fileName, fileSize, fileType, messageId, fromPin }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return;
        if (!isValidBase64Size(fileData)) {
            return socket.emit('error', 'File exceeds 10 MB limit');
        }
        const messageData = {
            id: messageId,
            fileData,
            fileName,
            fileSize,
            fileType,
            from: fromPin,
            timestamp: Date.now(),
            type: 'file',
            deleted: false
        };
        chat.messages.push(messageData);
        chatStore.set(chatId, chat);
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('chat-file', { ...messageData, chatId });
        });
    });

    // ===== VIDEO (≤10 MB) =====
    socket.on('chat-video', ({ chatId, videoData, fileName, fileSize, messageId, fromPin, thumbnail }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return;
        if (!isValidBase64Size(videoData)) {
            return socket.emit('error', 'Video exceeds 10 MB limit');
        }
        const messageData = {
            id: messageId,
            videoData,
            fileName,
            fileSize,
            thumbnail: thumbnail || null, // small base64 thumbnail (optional)
            from: fromPin,
            timestamp: Date.now(),
            type: 'video',
            deleted: false
        };
        chat.messages.push(messageData);
        chatStore.set(chatId, chat);
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('chat-video', { ...messageData, chatId });
        });
    });

    // ===== AUDIO FILE (≤10 MB) =====
    socket.on('chat-audio', ({ chatId, audioData, fileName, fileSize, messageId, fromPin, duration }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return;
        if (!isValidBase64Size(audioData)) {
            return socket.emit('error', 'Audio exceeds 10 MB limit');
        }
        const messageData = {
            id: messageId,
            audioData,
            fileName,
            fileSize,
            duration: duration || 0,
            from: fromPin,
            timestamp: Date.now(),
            type: 'audio',
            deleted: false
        };
        chat.messages.push(messageData);
        chatStore.set(chatId, chat);
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('chat-audio', { ...messageData, chatId });
        });
    });

    // ===== VOICE NOTE (≤2 min) =====
    socket.on('voice-message', ({ chatId, audioData, duration, messageId, fromPin }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return;
        if (duration && duration > MAX_VOICE_SECONDS) {
            return socket.emit('error', `Voice message exceeds ${MAX_VOICE_SECONDS / 60} minute limit`);
        }
        if (!isValidBase64Size(audioData)) {
            return socket.emit('error', 'Voice message exceeds 10 MB limit');
        }
        const messageData = {
            id: messageId,
            audioData,
            duration,
            from: fromPin,
            timestamp: Date.now(),
            type: 'voice',
            deleted: false
        };
        chat.messages.push(messageData);
        chatStore.set(chatId, chat);
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('voice-message', { ...messageData, chatId });
        });
    });

    // ===== DELETE CHAT =====
    socket.on('delete-chat', ({ chatId, pin }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return socket.emit('error', 'Chat not found');

        const found = findUserByPin(pin);
        if (found) {
            found.user.chats = found.user.chats.filter(c => c.chatId !== chatId);
            userStore.set(found.phone, found.user);
        }

        chat.participants = chat.participants.filter(p => p !== pin);
        if (chat.participants.length === 0) chatStore.delete(chatId);
        else { chat.messages = []; chatStore.set(chatId, chat); }

        socket.emit('chat-deleted', { chatId });
        chat.participants.forEach(participant => {
            io.to(`user_${participant}`).emit('partner-left-chat', { chatId });
        });
    });

    // ===== HISTORY =====
    socket.on('get-chat-history', ({ chatId }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return socket.emit('error', 'Chat not found');
        socket.emit('chat-history', { chatId, messages: chat.messages });
    });

    // ===== TYPING =====
    socket.on('typing', ({ chatId, isTyping, fromPin }) => {
        const chat = chatStore.get(chatId);
        if (!chat) return;
        chat.participants.forEach(participant => {
            if (participant !== fromPin) io.to(`user_${participant}`).emit('user-typing', { chatId, isTyping });
        });
    });

    // ===== DISCONNECT =====
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const [phone, user] of userStore) {
            if (user.socketId === socket.id) {
                user.socketId = null;
                user.status = 'offline';
                user.lastSeen = Date.now();
                userStore.set(phone, user);

                if (user.chats && user.chats.length > 0) {
                    user.chats.forEach(chat => {
                        const chatData = chatStore.get(chat.chatId);
                        if (chatData) {
                            const otherPin = chatData.participants.find(p => p !== user.pin);
                            if (otherPin) {
                                io.to(`user_${otherPin}`).emit('partner-status', {
                                    pin: user.pin,
                                    status: 'offline',
                                    lastSeen: Date.now()
                                });
                            }
                        }
                    });
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Quickie is running on port ${PORT}`);
});