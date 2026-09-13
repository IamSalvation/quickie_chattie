const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 1.5e7 // 15 MB (10 MB file + base64 overhead + headroom)
});

app.set('trust proxy', 1); // For correct req.ip behind Render's proxy
app.use(express.json({ limit: '2mb' })); // For JSON body parsing on new endpoints

// ===== STATIC FILES (with PWA headers) =====
app.use(express.static('public', {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('manifest.json') || filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json');
        }
        if (filePath.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
        }
    }
}));

// ===== CONSTANTS =====
const MAX_FILE_BYTES = 10 * 1024 * 1024;      // 10 MB
const MAX_VOICE_SECONDS = 120;                 // 2 minutes
const MESSAGE_HISTORY_LIMIT = 200;             // last 200 messages per chat
const DEVICE_TOKEN_BYTES = 32;                 // 32 bytes = 64 hex chars
const MAX_TRUSTED_DEVICES = 5;                 // Per user

// ===== MONGODB CONNECTION =====
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickie';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('   Make sure MONGODB_URI env var is set correctly.');
    });

// ===== MONGOOSE SCHEMAS =====

// User
const userSchema = new mongoose.Schema({
    pin: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: '' },
    passwordHash: { type: String, default: '' },
    trustedDevices: [{
        tokenHash: String,
        createdAt: { type: Date, default: Date.now },
        lastUsedAt: { type: Date, default: Date.now }
    }],
    socketId: { type: String, default: null },
    status: { type: String, default: 'offline' },
    lastSeen: { type: Date, default: Date.now },
    chats: [{
        pin: String,
        name: String,
        chatId: String,
        phone: String
    }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Chat
const chatSchema = new mongoose.Schema({
    participants: { type: [String], required: true, index: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);

// Message (with read receipts + reply support)
const messageSchema = new mongoose.Schema({
    chatId: { type: String, required: true, index: true },
    id: { type: String, required: true },
    from: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'file', 'video', 'audio', 'voice'], required: true },
    text: String,
    image: String,
    fileData: String,
    fileName: String,
    fileSize: String,
    fileType: String,
    videoData: String,
    audioData: String,
    thumbnail: String,
    duration: Number,
    deleted: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
    // NEW: Read receipts
    deliveredTo: { type: [String], default: [] },   // pins of users who received it
    seenBy: { type: [String], default: [] },         // pins of users who saw it
    // NEW: Reply support
    replyTo: {
        id: String,
        text: String,
        from: String,
        type: String,
        image: String,
        fileName: String
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// Pending Request
const pendingSchema = new mongoose.Schema({
    fromPin: { type: String, required: true, index: true },
    toPin: { type: String, required: true, index: true },
    fromName: { type: String, default: 'User' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

const Pending = mongoose.model('Pending', pendingSchema);

// ===== HELPERS =====

function generatePIN() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pin = '';
    for (let i = 0; i < 8; i++) pin += chars.charAt(Math.floor(Math.random() * chars.length));
    return pin;
}

async function getUniquePIN() {
    let pin = generatePIN();
    let attempts = 0;
    while (attempts < 100) {
        const existing = await User.findOne({ pin });
        if (!existing) return pin;
        pin = generatePIN();
        attempts++;
    }
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

function isValidBase64Size(base64Data) {
    if (!base64Data || typeof base64Data !== 'string') return false;
    const commaIdx = base64Data.indexOf(',');
    const raw = commaIdx >= 0 ? base64Data.slice(commaIdx + 1) : base64Data;
    const approxBytes = Math.floor((raw.length * 3) / 4);
    return approxBytes <= MAX_FILE_BYTES;
}

function getMessagePreview(msg) {
    if (!msg || msg.deleted) return 'This message was deleted';
    switch (msg.type) {
        case 'text': return msg.text || '';
        case 'image': return '📸 Image';
        case 'video': return '🎬 Video';
        case 'audio': return '🎵 Audio';
        case 'voice': return '🎤 Voice';
        case 'file': return msg.fileName ? ('📎 ' + msg.fileName) : '📎 File';
        default: return 'Message';
    }
}

// Device token helpers
function generateDeviceToken() {
    return crypto.randomBytes(DEVICE_TOKEN_BYTES).toString('hex');
}

function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Password strength check (server-side mirror of client)
function isStrongPassword(password) {
    if (!password || typeof password !== 'string') return false;
    if (password.length < 8) return false;
    if (!/\d/.test(password)) return false; // at least one number
    return true;
}

// ===== API ROUTES =====

// 1) SIGNUP: create user with phone + password, auto-generate PIN, trust first device
app.post('/signup', async (req, res) => {
    try {
        const { phone, password } = req.body || {};
        if (!phone) return res.status(400).json({ error: 'Phone number required' });
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password must be 8+ characters with at least 1 number' });
        }

        const cleanPhone = String(phone).replace(/\s/g, '').replace(/-/g, '').replace(/\+/g, '');
        // Normalize: ensure it starts with 234 if it looks like a Nigerian local number
        let normalizedPhone = cleanPhone;
        if (normalizedPhone.startsWith('0')) normalizedPhone = '234' + normalizedPhone.slice(1);

        // Check if user exists
        const existing = await User.findOne({ phone: normalizedPhone });
        if (existing) {
            // Return existing PIN — user should use login flow, not signup
            return res.status(409).json({
                error: 'An account already exists for this number',
                pin: existing.pin,
                exists: true
            });
        }

        const pin = await getUniquePIN();
        const passwordHash = await bcrypt.hash(password, 10);
        const rawDeviceToken = generateDeviceToken();
        const tokenHash = hashDeviceToken(rawDeviceToken);

        await User.create({
            pin,
            phone: normalizedPhone,
            name: '',
            passwordHash,
            trustedDevices: [{ tokenHash }],
            socketId: null,
            chats: [],
            status: 'offline',
            lastSeen: new Date()
        });

        console.log(`✅ New user signed up: ${pin} (${normalizedPhone})`);

        return res.json({
            pin,
            phone: formatPhoneNumber(normalizedPhone),
            deviceToken: rawDeviceToken,
            message: 'Account created successfully'
        });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// 2) LOGIN CHECK: given PIN + deviceToken, decide if password is required
app.post('/login-check', async (req, res) => {
    try {
        const { pin, deviceToken } = req.body || {};
        if (!pin) return res.status(400).json({ error: 'PIN required' });

        const user = await User.findOne({ pin });
        if (!user) return res.status(404).json({ error: 'Invalid PIN' });

        // If user has no password (legacy — but we're wiping DB, so unlikely)
        if (!user.passwordHash) {
            return res.json({
                requiresPassword: true,
                requiresSetup: true,
                phone: formatPhoneNumber(user.phone)
            });
        }

        // Check if device is trusted
        if (deviceToken) {
            const tokenHash = hashDeviceToken(deviceToken);
            const trusted = user.trustedDevices.find(d => d.tokenHash === tokenHash);
            if (trusted) {
                trusted.lastUsedAt = new Date();
                await user.save();
                return res.json({
                    requiresPassword: false,
                    phone: formatPhoneNumber(user.phone)
                });
            }
        }

        return res.json({
            requiresPassword: true,
            requiresSetup: false,
            phone: formatPhoneNumber(user.phone)
        });
    } catch (err) {
        console.error('Login check error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// 3) LOGIN VERIFY: given PIN + password (+ optional deviceToken to reuse), verify and return fresh device token
app.post('/login-verify', async (req, res) => {
    try {
        const { pin, password, deviceToken } = req.body || {};
        if (!pin) return res.status(400).json({ error: 'PIN required' });
        if (!password) return res.status(400).json({ error: 'Password required' });

        const user = await User.findOne({ pin });
        if (!user) return res.status(404).json({ error: 'Invalid PIN' });
        if (!user.passwordHash) return res.status(400).json({ error: 'This account has no password set' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Incorrect password' });

        // Generate a new device token, add to trusted list
        const rawDeviceToken = generateDeviceToken();
        const tokenHash = hashDeviceToken(rawDeviceToken);

        user.trustedDevices = user.trustedDevices || [];
        user.trustedDevices.push({ tokenHash });

        // Cap device list at MAX_TRUSTED_DEVICES (drop oldest)
        if (user.trustedDevices.length > MAX_TRUSTED_DEVICES) {
            user.trustedDevices = user.trustedDevices.slice(-MAX_TRUSTED_DEVICES);
        }

        await user.save();

        console.log(`🔐 Login verified: ${pin}`);

        return res.json({
            success: true,
            deviceToken: rawDeviceToken,
            phone: formatPhoneNumber(user.phone)
        });
    } catch (err) {
        console.error('Login verify error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// 4) RECOVER PIN: given phone + password, return PIN
app.post('/recover-pin', async (req, res) => {
    try {
        const { phone, password } = req.body || {};
        if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

        const cleanPhone = String(phone).replace(/\s/g, '').replace(/-/g, '').replace(/\+/g, '');
        let normalizedPhone = cleanPhone;
        if (normalizedPhone.startsWith('0')) normalizedPhone = '234' + normalizedPhone.slice(1);

        const user = await User.findOne({ phone: normalizedPhone });
        if (!user) return res.status(404).json({ error: 'No account found for this number' });
        if (!user.passwordHash) return res.status(400).json({ error: 'This account has no password set' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Incorrect password' });

        return res.json({
            pin: user.pin,
            phone: formatPhoneNumber(user.phone),
            message: 'PIN recovered successfully'
        });
    } catch (err) {
        console.error('Recover PIN error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime()
    });
});

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', async ({ pin, phone, name }) => {
        try {
            const user = await User.findOne({ pin });
            if (!user) return socket.emit('error', 'Invalid PIN');

            // Single-device enforcement: kick existing socket for this PIN
            if (user.socketId && user.socketId !== socket.id) {
                const oldSocket = io.sockets.sockets.get(user.socketId);
                if (oldSocket) {
                    oldSocket.emit('kicked', {
                        reason: 'Another device logged in with your PIN.',
                        timestamp: Date.now()
                    });
                    setTimeout(() => {
                        try { oldSocket.disconnect(true); } catch (e) { }
                    }, 500);
                    console.log(`🔴 Kicked old session for ${pin}: ${user.socketId}`);
                }
            }

            user.socketId = socket.id;
            if (name) user.name = name;
            user.status = 'online';
            user.lastSeen = new Date();
            await user.save();

            socket.join(`user_${pin}`);
            console.log(`✅ User ${pin} registered - ONLINE (socket: ${socket.id})`);

            socket.emit('registered', {
                pin,
                name: user.name,
                phone: formatPhoneNumber(user.phone)
            });

            // Broadcast online status to chat partners + build chat statuses
            const chatStatuses = [];
            if (user.chats && user.chats.length > 0) {
                for (const chat of user.chats) {
                    const chatData = await Chat.findById(chat.chatId).catch(() => null);
                    if (chatData) {
                        const otherPin = chatData.participants.find(p => p !== pin);
                        if (otherPin) {
                            const otherUser = await User.findOne({ pin: otherPin });
                            const status = (otherUser && otherUser.socketId) ? 'online' : 'offline';
                            const lastSeen = otherUser ? otherUser.lastSeen : new Date();
                            chatStatuses.push({ chatId: chat.chatId, partnerPin: otherPin, status, lastSeen });
                            io.to(`user_${otherPin}`).emit('partner-status', {
                                pin,
                                status: 'online',
                                lastSeen: new Date()
                            });
                        }
                    }
                }
            }
            socket.emit('chat-statuses', chatStatuses);

            // Send authoritative chat list from database
            const serverChats = [];
            if (user.chats && user.chats.length > 0) {
                for (const chat of user.chats) {
                    let chatData = null;
                    try {
                        chatData = await Chat.findById(chat.chatId);
                    } catch (e) {
                        continue;
                    }
                    if (!chatData) continue;
                    if (!chatData.participants.includes(pin)) continue;

                    const lastMsg = await Message.findOne({ chatId: chat.chatId })
                        .sort({ timestamp: -1 });

                    serverChats.push({
                        pin: chat.pin,
                        name: chat.name,
                        chatId: chat.chatId,
                        phone: chat.phone,
                        lastMessage: lastMsg ? getMessagePreview(lastMsg) : 'Start chatting...',
                        lastTimestamp: lastMsg
                            ? lastMsg.timestamp.getTime()
                            : chatData.createdAt.getTime()
                    });
                }
            }
            socket.emit('server-chats', serverChats);

            // Always emit pending requests (even if empty)
            const pendingReqs = await Pending.find({ toPin: pin });
            socket.emit('pending-requests', pendingReqs.map(r => ({
                fromPin: r.fromPin,
                fromName: r.fromName,
                timestamp: r.timestamp.getTime()
            })));
        } catch (err) {
            console.error('Register error:', err);
            socket.emit('error', 'Server error during registration');
        }
    });

    socket.on('get-pending-requests', async ({ pin }) => {
        try {
            const pendingReqs = await Pending.find({ toPin: pin });
            socket.emit('pending-requests', pendingReqs.map(r => ({
                fromPin: r.fromPin,
                fromName: r.fromName,
                timestamp: r.timestamp.getTime()
            })));
        } catch (err) {
            console.error('Get pending error:', err);
        }
    });

    socket.on('get-user-status', async ({ pin }) => {
        try {
            const user = await User.findOne({ pin });
            if (user) {
                socket.emit('user-status', {
                    userId: pin,
                    status: user.socketId ? 'online' : 'offline',
                    lastSeen: user.lastSeen ? user.lastSeen.getTime() : Date.now()
                });
            }
        } catch (err) {
            console.error('Get user status error:', err);
        }
    });

    socket.on('get-partner-status', async ({ pin }) => {
        try {
            const user = await User.findOne({ pin });
            if (user) {
                socket.emit('partner-status', {
                    pin,
                    status: user.socketId ? 'online' : 'offline',
                    lastSeen: user.lastSeen ? user.lastSeen.getTime() : Date.now()
                });
            }
        } catch (err) {
            console.error('Get partner status error:', err);
        }
    });

    socket.on('update-name', async ({ pin, name }) => {
        try {
            await User.updateOne({ pin }, { name });
            socket.emit('name-updated', { name });
        } catch (err) {
            console.error('Update name error:', err);
        }
    });

    socket.on('send-request', async ({ fromPin, toPin, fromName }) => {
        try {
            const toUser = await User.findOne({ pin: toPin });
            if (!toUser) return socket.emit('error', 'User not found');
            if (fromPin === toPin) return socket.emit('error', 'Cannot add yourself');

            const fromUser = await User.findOne({ pin: fromPin });
            if (fromUser && fromUser.chats && fromUser.chats.some(c => c.pin === toPin)) {
                return socket.emit('error', 'Already friends');
            }

            const existingPending = await Pending.findOne({
                $or: [
                    { fromPin, toPin },
                    { fromPin: toPin, toPin: fromPin }
                ]
            });
            if (existingPending) return socket.emit('error', 'Request already pending');

            await Pending.create({ fromPin, toPin, fromName: fromName || 'User' });

            io.to(`user_${toPin}`).emit('new-request', {
                fromPin,
                fromName: fromName || 'User',
                timestamp: Date.now()
            });
            if (toUser.socketId) {
                const targetSocket = io.sockets.sockets.get(toUser.socketId);
                if (targetSocket) {
                    targetSocket.emit('new-request', {
                        fromPin,
                        fromName: fromName || 'User',
                        timestamp: Date.now()
                    });
                }
            }
            socket.emit('request-sent', { toPin, toName: toUser.name || 'User' });
        } catch (err) {
            console.error('Send request error:', err);
            socket.emit('error', 'Server error sending request');
        }
    });

    socket.on('accept-request', async ({ fromPin, toPin }) => {
        try {
            const request = await Pending.findOne({ fromPin, toPin });
            if (!request) return socket.emit('error', 'Request not found');

            await Pending.deleteOne({ _id: request._id });

            const fromUser = await User.findOne({ pin: fromPin });
            const toUser = await User.findOne({ pin: toPin });
            if (!fromUser || !toUser) return socket.emit('error', 'User not found');

            const chat = await Chat.create({ participants: [fromPin, toPin] });
            const chatId = chat._id.toString();

            fromUser.chats = fromUser.chats || [];
            fromUser.chats.push({
                pin: toPin,
                name: toUser.name || 'User',
                chatId,
                phone: formatPhoneNumber(toUser.phone)
            });
            await fromUser.save();

            toUser.chats = toUser.chats || [];
            toUser.chats.push({
                pin: fromPin,
                name: fromUser.name || 'User',
                chatId,
                phone: formatPhoneNumber(fromUser.phone)
            });
            await toUser.save();

            const statusFrom = fromUser.socketId ? 'online' : 'offline';
            const statusTo = toUser.socketId ? 'online' : 'offline';

            if (fromUser.socketId) {
                io.to(`user_${fromPin}`).emit('request-accepted', {
                    withPin: toPin,
                    withName: toUser.name || 'User',
                    chatId,
                    partnerStatus: statusTo
                });
            }
            if (toUser.socketId) {
                io.to(`user_${toPin}`).emit('request-accepted', {
                    withPin: fromPin,
                    withName: fromUser.name || 'User',
                    chatId,
                    partnerStatus: statusFrom
                });
            }
        } catch (err) {
            console.error('Accept request error:', err);
            socket.emit('error', 'Server error accepting request');
        }
    });

    socket.on('decline-request', async ({ fromPin, toPin }) => {
        try {
            const request = await Pending.findOne({ fromPin, toPin });
            if (!request) return socket.emit('error', 'Request not found');
            await Pending.deleteOne({ _id: request._id });

            const fromUser = await User.findOne({ pin: fromPin });
            if (fromUser && fromUser.socketId) {
                io.to(`user_${fromPin}`).emit('request-declined', { byPin: toPin, byName: 'User' });
            }
            socket.emit('request-declined-success');
        } catch (err) {
            console.error('Decline request error:', err);
        }
    });

    // ===== MESSAGE HANDLERS =====

    socket.on('chat-message', async ({ chatId, text, messageId, fromPin, replyTo }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return socket.emit('error', 'Chat not found');

            // deliveredTo starts with the sender
            const deliveredTo = [fromPin];

            const messageData = {
                chatId,
                id: String(messageId),
                text,
                from: fromPin,
                timestamp: new Date(),
                type: 'text',
                deleted: false,
                deliveredTo,
                seenBy: [fromPin],
                replyTo: replyTo || undefined
            };
            await Message.create(messageData);

            const payload = {
                ...messageData,
                timestamp: messageData.timestamp.getTime(),
                deliveredTo,
                seenBy: messageData.seenBy
            };
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('chat-message', payload);
            });

            // Mark as delivered for online recipients (excluding sender)
            for (const participant of chat.participants) {
                if (participant === fromPin) continue;
                const otherUser = await User.findOne({ pin: participant });
                if (otherUser && otherUser.socketId) {
                    await Message.updateOne(
                        { chatId, id: String(messageId) },
                        { $addToSet: { deliveredTo: participant } }
                    );
                    // Notify sender
                    io.to(`user_${fromPin}`).emit('message-delivered', {
                        chatId,
                        messageId: String(messageId),
                        byPin: participant
                    });
                }
            }
        } catch (err) {
            console.error('Chat message error:', err);
        }
    });

    socket.on('chat-image', async ({ chatId, image, fileName, messageId, fromPin, replyTo }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            if (!isValidBase64Size(image)) return socket.emit('error', 'Image exceeds 10 MB limit');

            const messageData = {
                chatId,
                id: String(messageId),
                image,
                fileName,
                from: fromPin,
                timestamp: new Date(),
                type: 'image',
                deleted: false,
                deliveredTo: [fromPin],
                seenBy: [fromPin],
                replyTo: replyTo || undefined
            };
            await Message.create(messageData);

            const payload = { ...messageData, timestamp: messageData.timestamp.getTime() };
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('chat-image', payload);
            });
        } catch (err) {
            console.error('Chat image error:', err);
        }
    });

    socket.on('chat-file', async ({ chatId, fileData, fileName, fileSize, fileType, messageId, fromPin, replyTo }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            if (!isValidBase64Size(fileData)) return socket.emit('error', 'File exceeds 10 MB limit');

            const messageData = {
                chatId,
                id: String(messageId),
                fileData,
                fileName,
                fileSize,
                fileType,
                from: fromPin,
                timestamp: new Date(),
                type: 'file',
                deleted: false,
                deliveredTo: [fromPin],
                seenBy: [fromPin],
                replyTo: replyTo || undefined
            };
            await Message.create(messageData);

            const payload = { ...messageData, timestamp: messageData.timestamp.getTime() };
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('chat-file', payload);
            });
        } catch (err) {
            console.error('Chat file error:', err);
        }
    });

    socket.on('chat-video', async ({ chatId, videoData, fileName, fileSize, messageId, fromPin, thumbnail, replyTo }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            if (!isValidBase64Size(videoData)) return socket.emit('error', 'Video exceeds 10 MB limit');

            const messageData = {
                chatId,
                id: String(messageId),
                videoData,
                fileName,
                fileSize,
                thumbnail: thumbnail || null,
                from: fromPin,
                timestamp: new Date(),
                type: 'video',
                deleted: false,
                deliveredTo: [fromPin],
                seenBy: [fromPin],
                replyTo: replyTo || undefined
            };
            await Message.create(messageData);

            const payload = { ...messageData, timestamp: messageData.timestamp.getTime() };
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('chat-video', payload);
            });
        } catch (err) {
            console.error('Chat video error:', err);
        }
    });

    socket.on('chat-audio', async ({ chatId, audioData, fileName, fileSize, messageId, fromPin, duration, replyTo }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            if (!isValidBase64Size(audioData)) return socket.emit('error', 'Audio exceeds 10 MB limit');

            const messageData = {
                chatId,
                id: String(messageId),
                audioData,
                fileName,
                fileSize,
                duration: duration || 0,
                from: fromPin,
                timestamp: new Date(),
                type: 'audio',
                deleted: false,
                deliveredTo: [fromPin],
                seenBy: [fromPin],
                replyTo: replyTo || undefined
            };
            await Message.create(messageData);

            const payload = { ...messageData, timestamp: messageData.timestamp.getTime() };
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('chat-audio', payload);
            });
        } catch (err) {
            console.error('Chat audio error:', err);
        }
    });

    socket.on('voice-message', async ({ chatId, audioData, duration, messageId, fromPin, replyTo }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            if (duration && duration > MAX_VOICE_SECONDS) {
                return socket.emit('error', `Voice message exceeds ${MAX_VOICE_SECONDS / 60} minute limit`);
            }
            if (!isValidBase64Size(audioData)) return socket.emit('error', 'Voice message exceeds 10 MB limit');

            const messageData = {
                chatId,
                id: String(messageId),
                audioData,
                duration,
                from: fromPin,
                timestamp: new Date(),
                type: 'voice',
                deleted: false,
                deliveredTo: [fromPin],
                seenBy: [fromPin],
                replyTo: replyTo || undefined
            };
            await Message.create(messageData);

            const payload = { ...messageData, timestamp: messageData.timestamp.getTime() };
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('voice-message', payload);
            });
        } catch (err) {
            console.error('Voice message error:', err);
        }
    });

    // ===== NEW: Delete message for everyone (hard delete) =====
    socket.on('delete-message', async ({ chatId, messageId, fromPin }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return socket.emit('error', 'Chat not found');

            const msg = await Message.findOne({ chatId, id: String(messageId) });
            if (!msg) return socket.emit('error', 'Message not found');
            if (msg.from !== fromPin) return socket.emit('error', 'You can only delete your own messages');

            await Message.deleteOne({ _id: msg._id });

            // Notify both users
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('message-deleted', {
                    chatId,
                    messageId: String(messageId)
                });
            });
        } catch (err) {
            console.error('Delete message error:', err);
        }
    });

    // ===== NEW: Mark messages as seen =====
    socket.on('mark-seen', async ({ chatId, pin }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            if (!chat.participants.includes(pin)) return;

            // Find messages where user is NOT in seenBy
            const messages = await Message.find({
                chatId,
                from: { $ne: pin },
                seenBy: { $ne: pin }
            }).select('id');

            if (messages.length === 0) return;

            const ids = messages.map(m => m.id);

            await Message.updateMany(
                { chatId, from: { $ne: pin }, seenBy: { $ne: pin } },
                { $addToSet: { seenBy: pin } }
            );

            // Notify the sender(s) that messages were seen
            chat.participants.forEach(participant => {
                if (participant === pin) return;
                io.to(`user_${participant}`).emit('messages-seen', {
                    chatId,
                    messageIds: ids,
                    seenBy: pin
                });
            });
        } catch (err) {
            console.error('Mark seen error:', err);
        }
    });

    // ===== Delete chat =====
    socket.on('delete-chat', async ({ chatId, pin }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return socket.emit('error', 'Chat not found');

            await User.updateOne({ pin }, { $pull: { chats: { chatId } } });

            chat.participants = chat.participants.filter(p => p !== pin);

            if (chat.participants.length === 0) {
                await Chat.deleteOne({ _id: chatId });
                await Message.deleteMany({ chatId });
            } else {
                await Message.deleteMany({ chatId });
                await chat.save();
            }

            socket.emit('chat-deleted', { chatId });
            chat.participants.forEach(participant => {
                io.to(`user_${participant}`).emit('partner-left-chat', { chatId });
            });
        } catch (err) {
            console.error('Delete chat error:', err);
        }
    });

    // ===== Chat history =====
    socket.on('get-chat-history', async ({ chatId }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return socket.emit('error', 'Chat not found');

            const messages = await Message.find({ chatId })
                .sort({ timestamp: -1 })
                .limit(MESSAGE_HISTORY_LIMIT);

            messages.reverse();

            const formatted = messages.map(m => ({
                id: m.id,
                text: m.text,
                image: m.image,
                fileData: m.fileData,
                fileName: m.fileName,
                fileSize: m.fileSize,
                fileType: m.fileType,
                videoData: m.videoData,
                audioData: m.audioData,
                thumbnail: m.thumbnail,
                duration: m.duration,
                from: m.from,
                timestamp: m.timestamp.getTime(),
                type: m.type,
                deleted: m.deleted,
                deliveredTo: m.deliveredTo || [],
                seenBy: m.seenBy || [],
                replyTo: m.replyTo || null
            }));

            socket.emit('chat-history', { chatId, messages: formatted });
        } catch (err) {
            console.error('Get chat history error:', err);
        }
    });

    socket.on('typing', async ({ chatId, isTyping, fromPin }) => {
        try {
            const chat = await Chat.findById(chatId).catch(() => null);
            if (!chat) return;
            chat.participants.forEach(participant => {
                if (participant !== fromPin) {
                    io.to(`user_${participant}`).emit('user-typing', { chatId, isTyping });
                }
            });
        } catch (err) {
            console.error('Typing error:', err);
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        try {
            const user = await User.findOne({ socketId: socket.id });
            if (!user) return;

            user.socketId = null;
            user.status = 'offline';
            user.lastSeen = new Date();
            await user.save();

            if (user.chats && user.chats.length > 0) {
                for (const chat of user.chats) {
                    const chatData = await Chat.findById(chat.chatId).catch(() => null);
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
                }
            }
        } catch (err) {
            console.error('Disconnect error:', err);
        }
    });
});

// ===== SERVER START =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Quickie is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing...');
    await mongoose.connection.close();
    server.close(() => process.exit(0));
});