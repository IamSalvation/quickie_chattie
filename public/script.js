(function () {
    console.log('🚀 Quickie app started!');

    // ===== DOM References =====
    const loginScreen = document.getElementById('loginScreen');
    const chatMenu = document.getElementById('chatMenu');
    const phoneInput = document.getElementById('phoneInput');
    const generatePinBtn = document.getElementById('generatePinBtn');
    const recoverPinBtn = document.getElementById('recoverPinBtn');
    const pinDisplayArea = document.getElementById('pinDisplayArea');
    const pinDisplay = document.getElementById('pinDisplay');
    const copyPinBtn = document.getElementById('copyPinBtn');
    const loginAfterGenerateBtn = document.getElementById('loginAfterGenerateBtn');
    const loginPinInput = document.getElementById('loginPinInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const userPinDisplay = document.getElementById('userPinDisplay');
    const userPhoneDisplay = document.getElementById('userPhoneDisplay');
    const userNameInput = document.getElementById('userNameInput');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const pendingList = document.getElementById('pendingList');
    const chatListContainer = document.getElementById('chatListContainer');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const partnerName = document.getElementById('partnerName');
    const partnerPin = document.getElementById('partnerPin');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const messageList = document.getElementById('messageList');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const leaveBtn = document.getElementById('leaveBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    const searchCloseBtn = document.getElementById('searchCloseBtn');
    const searchResults = document.getElementById('searchResults');
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiSearch = document.getElementById('emojiSearch');
    const emojiTabs = document.getElementById('emojiTabs');
    const emojiBody = document.getElementById('emojiBody');
    const imageBtn = document.getElementById('imageBtn');
    const imageInput = document.getElementById('imageInput');
    const fileBtn = document.getElementById('fileBtn');
    const fileInput = document.getElementById('fileInput');
    const videoBtn = document.getElementById('videoBtn');
    const videoInput = document.getElementById('videoInput');
    const audioBtn = document.getElementById('audioBtn');
    const audioInput = document.getElementById('audioInput');
    const voiceBtn = document.getElementById('voiceBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const refreshBtn = document.getElementById('refreshBtn');

    // ===== Add Friend Inline =====
    const addFriendSection = document.getElementById('addFriendSection');
    const addFriendToggle = document.getElementById('addFriendToggle');
    const hintPin = document.getElementById('hintPin');
    const inlineFriendPin = document.getElementById('inlineFriendPin');
    const inlineFriendName = document.getElementById('inlineFriendName');
    const inlineSendRequestBtn = document.getElementById('inlineSendRequestBtn');

    // ===== State =====
    let socket = null;
    let myPin = null;
    let myPhone = null;
    let myName = '';
    let currentChatId = null;
    let currentPartnerPin = null;
    let currentPartnerName = '';
    let allChats = [];
    let allMessages = [];
    let pendingRequests = [];
    let typingTimeout = null;
    let messageIdCounter = 0;
    let isFirstHistoryLoad = true;
    let mediaRecorder = null;
    let audioChunks = [];
    let recordingTimer = null;
    let recordingSeconds = 0;
    let isRecording = false;
    let currentEmojiCategory = 'recent';

    const partnerStatuses = new Map();
    const MAX_FILE_BYTES = 10 * 1024 * 1024;
    const MAX_VOICE_SECONDS = 120;

    // ===== LUCIDE ICON HELPER =====
    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // ===== EMOJI DATA =====
    const EMOJI_DATA = {
        smileys: [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹', '😊', '😇', '🙂', '🙃', '😉', '😌',
            '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳',
            '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
            '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫',
            '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵',
            '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩'
        ],
        people: [
            '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
            '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
            '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️',
            '👅', '👄', '💋', '🩸', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵',
            '🙍', '🙎', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '🥷', '👷', '🤴',
            '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛'
        ],
        animals: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵',
            '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
            '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️',
            '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',
            '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃'
        ],
        food: [
            '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
            '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐',
            '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭',
            '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜',
            '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧',
            '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯'
        ],
        activity: [
            '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
            '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
            '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽',
            '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹',
            '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻'
        ],
        travel: [
            '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
            '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋',
            '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️',
            '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏',
            '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋'
        ],
        objects: [
            '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼',
            '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
            '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸',
            '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️',
            '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️'
        ],
        symbols: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
            '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈',
            '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️',
            '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹',
            '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️'
        ]
    };

    // ===== RECENT EMOJIS =====
    const RECENT_KEY = 'quickie_recent_emojis';
    const RECENT_LIMIT = 16;

    function getRecentEmojis() {
        try {
            return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        } catch (e) { return []; }
    }

    function addRecentEmoji(emoji) {
        let recent = getRecentEmojis();
        recent = recent.filter(e => e !== emoji);
        recent.unshift(emoji);
        recent = recent.slice(0, RECENT_LIMIT);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch (e) { }
    }

    // ===== DARK MODE =====
    function initDarkMode() {
        if (!darkModeToggle) return;
        const isDark = localStorage.getItem('darkMode') === 'enabled';
        if (isDark) document.body.classList.add('dark-mode');
        updateDarkModeIcon();

        darkModeToggle.addEventListener('click', function (e) {
            e.preventDefault();
            document.body.classList.toggle('dark-mode');
            const nowDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', nowDark ? 'enabled' : 'disabled');
            updateDarkModeIcon();
        });
    }

    function updateDarkModeIcon() {
        if (!darkModeToggle) return;
        const isDark = document.body.classList.contains('dark-mode');
        darkModeToggle.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i>`;
        refreshIcons();
    }

    function setError(msg) {
        loginError.textContent = msg;
        if (msg) setTimeout(() => { loginError.textContent = ''; }, 5000);
    }

    function cleanPhone(phone) {
        return phone.replace(/\s/g, '').replace(/-/g, '');
    }

    function copyToClipboard(text, successMsg) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setError(successMsg || '✅ Copied!');
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setError(successMsg || '✅ Copied!');
        });
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ===== FILE ICON MAPPING =====
    function getFileIconInfo(fileName, fileType) {
        const ext = (fileName || '').split('.').pop().toLowerCase();
        const t = (fileType || '').toLowerCase();

        if (t.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
            return { name: 'image', colorClass: 'icon-image' };
        }
        if (t.startsWith('video/') || ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
            return { name: 'video', colorClass: 'icon-video' };
        }
        if (t.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
            return { name: 'music', colorClass: 'icon-audio' };
        }
        if (ext === 'pdf') return { name: 'file-text', colorClass: 'icon-pdf' };
        if (['doc', 'docx'].includes(ext)) return { name: 'file-text', colorClass: 'icon-doc' };
        if (['xls', 'xlsx', 'csv'].includes(ext)) return { name: 'file-spreadsheet', colorClass: 'icon-sheet' };
        if (['ppt', 'pptx'].includes(ext)) return { name: 'file-presentation', colorClass: 'icon-slides' };
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { name: 'file-archive', colorClass: 'icon-archive' };
        if (['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'rb', 'go', 'rs'].includes(ext)) {
            return { name: 'file-code', colorClass: 'icon-code' };
        }
        return { name: 'file', colorClass: '' };
    }

    function createFileIconEl(fileName, fileType) {
        const info = getFileIconInfo(fileName, fileType);
        const wrap = document.createElement('div');
        wrap.className = 'file-icon ' + info.colorClass;
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', info.name);
        wrap.appendChild(icon);
        return wrap;
    }

    // ===== DOWNLOAD HELPERS =====
    function downloadDataUrl(dataUrl, filename) {
        try {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename || 'quickie-file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error('Download failed:', e);
            setError('Download failed');
        }
    }

    function makeVoiceFilename(timestamp) {
        return `quickie-voice-${timestamp || Date.now()}.webm`;
    }

    function makeImageFilename(timestamp) {
        return `quickie-image-${timestamp || Date.now()}.jpg`;
    }

    // ===== PIN Generation =====
    async function handlePinAction(action) {
        const phone = cleanPhone(phoneInput.value);
        if (!phone || phone.length < 7) {
            setError('Please enter a valid phone number');
            return;
        }
        try {
            const res = await fetch(`/pin?phone=${encodeURIComponent(phone)}&action=${action}`);
            const data = await res.json();
            if (res.ok) {
                myPin = data.pin;
                myPhone = phone;
                pinDisplay.textContent = myPin;
                pinDisplayArea.classList.remove('hidden');
                copyPinBtn.classList.remove('hidden');
                loginAfterGenerateBtn.classList.remove('hidden');
                setError(data.message);
                if (action === 'generate') loginWithPin(myPin);
            } else {
                setError(data.error || 'Something went wrong');
            }
        } catch (e) {
            setError('Network error. Is the server running?');
        }
    }

    generatePinBtn.addEventListener('click', () => handlePinAction('generate'));
    recoverPinBtn.addEventListener('click', () => handlePinAction('recover'));

    copyPinBtn.addEventListener('click', function () {
        copyToClipboard(myPin, '✅ PIN copied!');
    });

    loginAfterGenerateBtn.addEventListener('click', function () {
        if (myPin) loginWithPin(myPin);
    });

    // ===== Login =====
    loginBtn.addEventListener('click', function () {
        const pin = loginPinInput.value.trim().toUpperCase();
        if (!pin || pin.length !== 8) {
            setError('Please enter a valid 8-character PIN');
            return;
        }
        loginWithPin(pin);
    });

    loginPinInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') loginBtn.click();
    });

    let loginAttempted = false;

    function loginWithPin(pin) {
        myPin = pin;
        loginAttempted = true;
        if (socket && socket.connected) {
            socket.emit('register', { pin, phone: myPhone, name: myName });
        } else {
            connectSocket();
        }
    }

    // ===== Socket Connection =====
    function connectSocket() {
        socket = io();

        socket.on('connect', () => {
            console.log('✅ Socket connected');
            if (myPin && loginAttempted) {
                socket.emit('register', { pin: myPin, phone: myPhone, name: myName });
                loginAttempted = false;
            }
        });

        socket.on('connect_error', () => {
            setError('⚠️ Cannot reach server. Make sure server is running.');
        });

        socket.on('registered', ({ pin, name, phone }) => {
            console.log('✅ Registered:', pin, name);
            myName = name || '';
            myPhone = phone || myPhone;
            loginScreen.style.display = 'none';
            chatMenu.classList.add('active');
            const pinSpan = userPinDisplay.querySelector('span');
            if (pinSpan) pinSpan.textContent = pin;
            userPinDisplay.dataset.pin = pin;
            if (myPhone) userPhoneDisplay.textContent = myPhone;
            if (myName) userNameInput.value = myName;
            if (hintPin) hintPin.textContent = pin;
            setError('');

            // Chats will arrive via 'server-chats' event — no localStorage load needed
            if (socket) socket.emit('get-pending-requests', { pin: myPin });
            refreshIcons();
        });

        // ===== SERVER-SYNCED CHAT LIST =====
        socket.on('server-chats', (serverChats) => {
            console.log('📥 Received', serverChats.length, 'chats from server');
            allChats = serverChats || [];
            saveChatsToLocal();
            renderChatList();

            // If current chat no longer exists on server, clear it
            if (currentChatId && !allChats.find(c => c.chatId === currentChatId)) {
                currentChatId = null;
                currentPartnerPin = null;
                currentPartnerName = '';
                partnerName.textContent = 'Select a chat';
                partnerPin.textContent = '';
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Offline';
                messageList.innerHTML = '';
                allMessages = [];
            }
        });

        socket.on('chat-statuses', (statuses) => {
            statuses.forEach(s => partnerStatuses.set(s.partnerPin, s.status));
            renderChatList();
        });

        socket.on('partner-status', ({ pin, status }) => {
            partnerStatuses.set(pin, status);
            if (currentPartnerPin === pin) updateHeaderStatus(status);
            renderChatList();
        });

        socket.on('pending-requests', (requests) => {
            pendingRequests = requests;
            renderPendingRequests();
        });

        socket.on('new-request', ({ fromPin, fromName, timestamp }) => {
            const exists = pendingRequests.some(r => r.fromPin === fromPin);
            if (!exists) {
                pendingRequests.push({ fromPin, fromName, timestamp });
                renderPendingRequests();
                playNotificationSound();
                setError(`📨 New request from ${fromName || fromPin}!`);
            }
        });

        socket.on('request-accepted', ({ withPin, withName, chatId, partnerStatus }) => {
            setError(`✅ ${withName || withPin} accepted your request!`);
            const chat = {
                pin: withPin,
                name: withName || withPin,
                chatId: chatId,
                lastMessage: 'Chat started!',
                lastTimestamp: Date.now()
            };
            if (!allChats.find(c => c.chatId === chatId)) allChats.push(chat);
            if (partnerStatus) partnerStatuses.set(withPin, partnerStatus);
            renderChatList();
            saveChatsToLocal();
            switchChat(chatId, withPin, withName || withPin);
            playNotificationSound();
        });

        socket.on('request-declined', ({ byPin, byName }) => {
            setError(`❌ ${byName || byPin} declined your request.`);
            pendingRequests = pendingRequests.filter(r => r.fromPin !== byPin);
            renderPendingRequests();
        });

        socket.on('request-cancelled', ({ fromPin }) => {
            pendingRequests = pendingRequests.filter(r => r.fromPin !== fromPin);
            renderPendingRequests();
        });

        socket.on('request-expired', ({ fromPin }) => {
            if (fromPin) {
                pendingRequests = pendingRequests.filter(r => r.fromPin !== fromPin);
                renderPendingRequests();
            }
        });

        socket.on('chat-history', ({ chatId, messages }) => {
            if (isFirstHistoryLoad) {
                messageList.innerHTML = '';
                allMessages = [];
                isFirstHistoryLoad = false;
            }
            allMessages = messages || [];
            allMessages.forEach(msg => displayMessage(msg));
            refreshIcons();
            scrollToBottom();
        });

        socket.on('chat-message', (msg) => {
            if (msg.from === myPin) return;
            if (msg.deleted) {
                appendMessage('This message was deleted', 'other', msg.id, msg.timestamp);
                return;
            }
            allMessages.push(msg);
            if (msg.chatId === currentChatId) {
                displayMessage(msg);
            }
            updateChatPreview(msg.chatId, msg.text || 'Message', msg.timestamp);
            playNotificationSound();
        });

        socket.on('chat-image', (msg) => {
            if (msg.from === myPin) return;
            if (msg.deleted) {
                appendMessage('Image was deleted', 'other', msg.id, msg.timestamp);
                return;
            }
            const data = { id: msg.id, image: msg.image, fileName: msg.fileName, from: msg.from, timestamp: msg.timestamp, type: 'image', deleted: false };
            allMessages.push(data);
            if (msg.chatId === currentChatId) appendImage(msg.image, 'other', msg.id, msg.timestamp, msg.fileName);
            updateChatPreview(msg.chatId, '📸 Image', msg.timestamp);
            playNotificationSound();
        });

        socket.on('chat-file', (msg) => {
            if (msg.from === myPin) return;
            if (msg.deleted) {
                appendMessage('File was deleted', 'other', msg.id, msg.timestamp);
                return;
            }
            const data = {
                id: msg.id, fileData: msg.fileData, fileName: msg.fileName, fileSize: msg.fileSize,
                fileType: msg.fileType, from: msg.from, timestamp: msg.timestamp, type: 'file', deleted: false
            };
            allMessages.push(data);
            if (msg.chatId === currentChatId) {
                appendFileMessage(msg.fileData, msg.fileName, msg.fileSize, msg.fileType, 'other', msg.id, msg.timestamp);
            }
            updateChatPreview(msg.chatId, `📎 ${msg.fileName}`, msg.timestamp);
            playNotificationSound();
        });

        socket.on('chat-video', (msg) => {
            if (msg.from === myPin) return;
            if (msg.deleted) {
                appendMessage('Video was deleted', 'other', msg.id, msg.timestamp);
                return;
            }
            const data = {
                id: msg.id, videoData: msg.videoData, fileName: msg.fileName, fileSize: msg.fileSize,
                thumbnail: msg.thumbnail, from: msg.from, timestamp: msg.timestamp, type: 'video', deleted: false
            };
            allMessages.push(data);
            if (msg.chatId === currentChatId) {
                appendVideoMessage(msg.videoData, msg.fileName, msg.fileSize, msg.thumbnail, 'other', msg.id, msg.timestamp);
            }
            updateChatPreview(msg.chatId, '🎬 Video', msg.timestamp);
            playNotificationSound();
        });

        socket.on('chat-audio', (msg) => {
            if (msg.from === myPin) return;
            if (msg.deleted) {
                appendMessage('Audio was deleted', 'other', msg.id, msg.timestamp);
                return;
            }
            const data = {
                id: msg.id, audioData: msg.audioData, fileName: msg.fileName, fileSize: msg.fileSize,
                duration: msg.duration || 0, from: msg.from, timestamp: msg.timestamp, type: 'audio', deleted: false
            };
            allMessages.push(data);
            if (msg.chatId === currentChatId) appendAudioMessage(msg.audioData, msg.fileName, msg.fileSize, msg.duration, 'other', msg.id, msg.timestamp);
            updateChatPreview(msg.chatId, '🎵 Audio', msg.timestamp);
            playNotificationSound();
        });

        socket.on('voice-message', (msg) => {
            if (msg.from === myPin) return;
            if (msg.deleted) {
                appendMessage('Voice was deleted', 'other', msg.id, msg.timestamp);
                return;
            }
            const data = { id: msg.id, audioData: msg.audioData, duration: msg.duration || 0, from: msg.from, timestamp: msg.timestamp, type: 'voice', deleted: false };
            allMessages.push(data);
            if (msg.chatId === currentChatId) appendVoiceMessage(msg.audioData, msg.duration, 'other', msg.id, msg.timestamp);
            updateChatPreview(msg.chatId, '🎤 Voice', msg.timestamp);
            playNotificationSound();
        });

        socket.on('partner-left-chat', ({ chatId }) => {
            if (chatId === currentChatId) {
                appendMessage('👋 The other user left this chat', 'system');
                allChats = allChats.filter(c => c.chatId !== chatId);
                renderChatList();
                saveChatsToLocal();
                if (currentChatId === chatId) {
                    currentChatId = null;
                    currentPartnerPin = null;
                    currentPartnerName = '';
                    partnerName.textContent = 'Select a chat';
                    partnerPin.textContent = '';
                    statusDot.className = 'status-dot offline';
                    statusText.textContent = 'Offline';
                    messageList.innerHTML = '';
                    allMessages = [];
                }
            }
        });

        socket.on('chat-deleted', ({ chatId }) => {
            allChats = allChats.filter(c => c.chatId !== chatId);
            renderChatList();
            saveChatsToLocal();
            if (currentChatId === chatId) {
                currentChatId = null;
                currentPartnerPin = null;
                currentPartnerName = '';
                partnerName.textContent = 'Select a chat';
                partnerPin.textContent = '';
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Offline';
                messageList.innerHTML = '';
                allMessages = [];
            }
        });

        socket.on('user-typing', ({ chatId, isTyping }) => {
            if (chatId !== currentChatId) return;
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                if (isTyping) typingIndicator.classList.add('show');
                else typingIndicator.classList.remove('show');
            }
        });

        socket.on('name-updated', ({ name }) => {
            myName = name;
            renderChatList();
        });

        socket.on('error', (msg) => {
            console.error('❌ Server error:', msg);
            setError('❌ ' + msg);
        });

        socket.on('request-sent', ({ toPin }) => {
            setError(`✅ Request sent to ${toPin}!`);
        });
    }

    // ===== Load Chats =====
    // Now mostly a cache; server sends authoritative list on register
    function loadChats() {
        const saved = localStorage.getItem('quickie_chats_' + myPin);
        if (saved) {
            try { allChats = JSON.parse(saved); } catch (e) { allChats = []; }
        }
        renderChatList();
    }

    function saveChatsToLocal() {
        if (myPin) localStorage.setItem('quickie_chats_' + myPin, JSON.stringify(allChats));
    }

    function updateChatPreview(chatId, message, timestamp) {
        const chat = allChats.find(c => c.chatId === chatId);
        if (chat) {
            chat.lastMessage = message;
            chat.lastTimestamp = timestamp || Date.now();
            renderChatList();
            saveChatsToLocal();
        }
    }

    // ===== Header Status =====
    function updateHeaderStatus(status) {
        if (!statusDot || !statusText) return;
        if (status === 'online') {
            statusDot.classList.add('online');
            statusDot.classList.remove('offline');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.add('offline');
            statusDot.classList.remove('online');
            statusText.textContent = 'Offline';
        }
    }

    // ===== Render Pending Requests =====
    function renderPendingRequests() {
        pendingList.innerHTML = '';
        if (pendingRequests.length === 0) {
            pendingList.innerHTML = '<div class="no-requests">No pending requests</div>';
            return;
        }
        pendingRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'request-item';
            const time = new Date(req.timestamp);
            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            item.innerHTML = `
        <div class="request-info">
          <div class="request-name">${req.fromName || req.fromPin}</div>
          <div class="request-pin">PIN: ${req.fromPin}</div>
          <div class="request-time">${timeStr}</div>
        </div>
        <div class="request-actions">
          <button class="btn-small accept-btn" data-pin="${req.fromPin}">Accept</button>
          <button class="btn-small decline-btn" data-pin="${req.fromPin}">Decline</button>
        </div>
      `;
            item.querySelector('.accept-btn').addEventListener('click', function () {
                const fromPin = this.dataset.pin;
                socket.emit('accept-request', { fromPin, toPin: myPin });
                pendingRequests = pendingRequests.filter(r => r.fromPin !== fromPin);
                renderPendingRequests();
            });
            item.querySelector('.decline-btn').addEventListener('click', function () {
                const fromPin = this.dataset.pin;
                socket.emit('decline-request', { fromPin, toPin: myPin });
                pendingRequests = pendingRequests.filter(r => r.fromPin !== fromPin);
                renderPendingRequests();
            });
            pendingList.appendChild(item);
        });
    }

    // ===== Render Chat List =====
    function renderChatList() {
        chatListContainer.innerHTML = '';

        if (allChats.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
        <div class="empty-state-emoji">👋</div>
        <div class="empty-state-title">Welcome to Quickie!</div>
        <div class="empty-state-text">You have no chats yet. Share your PIN with friends or add someone using the form below.</div>
        <div class="empty-state-pin-card">
          <div class="empty-state-pin-label">YOUR PIN</div>
          <div class="empty-state-pin-display">${myPin || '--------'}</div>
          <button class="btn-small empty-copy-pin-btn"><i data-lucide="copy"></i> Copy PIN</button>
        </div>
      `;
            chatListContainer.appendChild(emptyState);

            emptyState.querySelector('.empty-copy-pin-btn').addEventListener('click', function () {
                copyToClipboard(myPin, '✅ PIN copied!');
            });
            refreshIcons();
            return;
        }

        const chatList = document.createElement('div');
        chatList.className = 'chat-list';
        chatList.innerHTML = '<div class="section-title"><i data-lucide="message-circle"></i> Active Chats</div>';

        const sortedChats = [...allChats].sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

        sortedChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'chat-item';
            if (chat.chatId === currentChatId) item.classList.add('active');

            const avatarWrap = document.createElement('div');
            avatarWrap.className = 'chat-item-avatar-wrap';

            const avatar = document.createElement('div');
            avatar.className = 'chat-item-avatar';
            avatar.textContent = (chat.name || chat.pin).charAt(0).toUpperCase();
            avatar.style.background = getGradientFromString(chat.pin);

            const statusBadge = document.createElement('span');
            statusBadge.className = 'chat-item-status ' + (partnerStatuses.get(chat.pin) === 'online' ? 'online' : 'offline');

            avatarWrap.appendChild(avatar);
            avatarWrap.appendChild(statusBadge);

            const info = document.createElement('div');
            info.className = 'chat-item-info';

            const name = document.createElement('div');
            name.className = 'chat-item-name';
            name.innerHTML = `${chat.name || chat.pin} <span class="chat-pin">(${chat.pin})</span>`;

            const preview = document.createElement('div');
            preview.className = 'chat-item-preview';
            preview.textContent = chat.lastMessage || 'Start chatting...';

            info.appendChild(name);
            info.appendChild(preview);

            const right = document.createElement('div');
            right.className = 'chat-item-right';

            const time = document.createElement('span');
            time.className = 'chat-item-time';
            if (chat.lastTimestamp) time.textContent = formatTime(chat.lastTimestamp);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'chat-delete-btn';
            deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
            deleteBtn.title = 'Delete this chat';
            deleteBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (confirm('Delete this chat? All messages will be permanently deleted.')) {
                    socket.emit('delete-chat', { chatId: chat.chatId, pin: myPin });
                    allChats = allChats.filter(c => c.chatId !== chat.chatId);
                    renderChatList();
                    saveChatsToLocal();
                    if (currentChatId === chat.chatId) {
                        currentChatId = null;
                        currentPartnerPin = null;
                        currentPartnerName = '';
                        partnerName.textContent = 'Select a chat';
                        partnerPin.textContent = '';
                        statusDot.className = 'status-dot offline';
                        statusText.textContent = 'Offline';
                        messageList.innerHTML = '';
                        allMessages = [];
                    }
                }
            });

            right.appendChild(time);
            right.appendChild(deleteBtn);

            item.appendChild(avatarWrap);
            item.appendChild(info);
            item.appendChild(right);

            item.addEventListener('click', function () {
                switchChat(chat.chatId, chat.pin, chat.name || chat.pin);
                closeSidebar();
            });

            chatList.appendChild(item);
        });

        chatListContainer.appendChild(chatList);
        refreshIcons();
    }

    function switchChat(chatId, pin, name) {
        console.log('🔀 Switching to chat:', chatId, pin, name);
        currentChatId = chatId;
        currentPartnerPin = pin;
        currentPartnerName = name;
        partnerName.textContent = name || pin;
        partnerPin.textContent = pin;
        updateHeaderStatus(partnerStatuses.get(pin) || 'offline');
        messageList.innerHTML = '';
        allMessages = [];
        isFirstHistoryLoad = true;
        socket.emit('get-chat-history', { chatId });
        socket.emit('get-partner-status', { pin });
        renderChatList();
    }

    // ===== Add Friend Inline Toggle =====
    function toggleAddFriendForm() {
        if (!addFriendSection) return;
        addFriendSection.classList.toggle('expanded');
        if (addFriendSection.classList.contains('expanded')) {
            setTimeout(() => { if (inlineFriendPin) inlineFriendPin.focus(); }, 350);
        } else {
            if (inlineFriendPin) inlineFriendPin.value = '';
            if (inlineFriendName) inlineFriendName.value = '';
        }
    }

    function collapseAddFriendForm() {
        if (addFriendSection && addFriendSection.classList.contains('expanded')) {
            addFriendSection.classList.remove('expanded');
            if (inlineFriendPin) inlineFriendPin.value = '';
            if (inlineFriendName) inlineFriendName.value = '';
        }
    }

    addFriendToggle.addEventListener('click', toggleAddFriendForm);

    inlineSendRequestBtn.addEventListener('click', function () {
        const toPin = inlineFriendPin.value.trim().toUpperCase();
        const fromName = inlineFriendName.value.trim() || myName || 'User';
        if (!toPin || toPin.length !== 8) { setError('Please enter a valid 8-character PIN'); return; }
        if (toPin === myPin) { setError('You cannot add yourself!'); return; }
        socket.emit('send-request', { fromPin: myPin, toPin, fromName });
        inlineFriendPin.value = '';
        inlineFriendName.value = '';
        collapseAddFriendForm();
    });

    inlineFriendPin.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') inlineSendRequestBtn.click();
    });
    inlineFriendName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') inlineSendRequestBtn.click();
    });

    userPinDisplay.addEventListener('click', function () {
        if (myPin) copyToClipboard(myPin, '✅ Your PIN copied!');
    });

    // ===== Logout (FULL UI RESET) =====
    logoutBtn.addEventListener('click', function () {
        if (confirm('Logout?')) {
            const savedPin = myPin;
            myPin = null;
            myPhone = null;
            myName = '';
            allChats = [];
            allMessages = [];
            pendingRequests = [];
            currentChatId = null;
            currentPartnerPin = null;
            currentPartnerName = '';
            partnerStatuses.clear();
            loginAttempted = false;

            // === FULL UI RESET ===
            chatMenu.classList.remove('active');
            loginScreen.style.display = 'flex';

            // Reset main chat header
            partnerName.textContent = 'Select a chat';
            partnerPin.textContent = '';
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Offline';

            // Reset message list
            messageList.innerHTML = '';

            // Reset input
            chatInput.value = '';
            chatInput.style.height = 'auto';

            // Reset sidebar lists
            chatListContainer.innerHTML = '';
            pendingList.innerHTML = '';

            // Reset login form
            loginPinInput.value = '';
            loginPinInput.focus();
            pinDisplay.textContent = '- - - - - - - -';
            pinDisplayArea.classList.add('hidden');
            copyPinBtn.classList.add('hidden');
            loginAfterGenerateBtn.classList.add('hidden');

            // Reset add friend section
            if (addFriendSection) addFriendSection.classList.remove('expanded');

            // Close emoji picker if open
            if (emojiPicker) emojiPicker.classList.remove('show');

            // Close search if open
            if (searchBar) searchBar.classList.remove('show');
            if (searchResults) searchResults.classList.remove('show');
            if (searchInput) searchInput.value = '';

            // Disconnect socket
            if (socket) socket.disconnect();

            // Clear cached chats
            if (savedPin) localStorage.removeItem('quickie_chats_' + savedPin);

            console.log('👋 Logged out');
        }
    });

    saveNameBtn.addEventListener('click', function () {
        const name = userNameInput.value.trim();
        if (name) {
            myName = name;
            if (socket && socket.connected) socket.emit('update-name', { pin: myPin, name });
            setError('✅ Name saved!');
        }
    });

    function openSidebar() {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('show');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    }
    function toggleSidebar() {
        if (sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
    }
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarCloseBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // ===== Send Message =====
    function sendMessage() {
        const text = chatInput.value.trim();

        if (!text) return;
        if (!socket || !socket.connected) {
            setError('⚠️ Not connected to server');
            return;
        }
        if (!currentChatId) {
            setError('⚠️ Please select a chat from the sidebar first');
            return;
        }

        const messageId = ++messageIdCounter;
        const messageData = { id: messageId, text, from: myPin, timestamp: Date.now(), type: 'text', deleted: false };
        allMessages.push(messageData);
        appendMessage(text, 'me', messageId);

        const chat = allChats.find(c => c.chatId === currentChatId);
        if (chat) {
            chat.lastMessage = text;
            chat.lastTimestamp = Date.now();
            renderChatList();
            saveChatsToLocal();
        }

        socket.emit('chat-message', { chatId: currentChatId, text, messageId, fromPin: myPin });
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.focus();
    }

    sendBtn.addEventListener('click', sendMessage);

    chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        if (currentChatId && socket) {
            const hasText = this.value.trim().length > 0;
            socket.emit('typing', { chatId: currentChatId, isTyping: hasText, fromPin: myPin });
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit('typing', { chatId: currentChatId, isTyping: false, fromPin: myPin });
            }, 2000);
        }
    });

    leaveBtn.addEventListener('click', function () {
        if (!currentChatId) return;
        if (confirm('Leave this chat?')) {
            allChats = allChats.filter(c => c.chatId !== currentChatId);
            renderChatList();
            saveChatsToLocal();
            currentChatId = null;
            currentPartnerPin = null;
            currentPartnerName = '';
            partnerName.textContent = 'Select a chat';
            partnerPin.textContent = '';
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Offline';
            messageList.innerHTML = '';
            allMessages = [];
        }
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            if (!currentChatId || !socket) return;
            messageList.innerHTML = '';
            allMessages = [];
            isFirstHistoryLoad = true;
            socket.emit('get-chat-history', { chatId: currentChatId });
        });
    }

    // ===== Search =====
    searchBtn.addEventListener('click', function () {
        searchBar.classList.toggle('show');
        if (searchBar.classList.contains('show')) searchInput.focus();
        else { searchInput.value = ''; searchResults.classList.remove('show'); }
    });

    searchCloseBtn.addEventListener('click', function () {
        searchBar.classList.remove('show');
        searchInput.value = '';
        searchResults.classList.remove('show');
    });

    searchInput.addEventListener('input', function () {
        const query = this.value.trim();
        if (!query) { searchResults.classList.remove('show'); return; }
        const results = allMessages.filter(msg =>
            msg.type === 'text' && !msg.deleted && msg.text && msg.text.toLowerCase().includes(query.toLowerCase())
        );
        searchResults.innerHTML = '';
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No messages found</div>';
            searchResults.classList.add('show');
            return;
        }
        results.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            const highlightedText = msg.text.replace(new RegExp(query, 'gi'), m => `<span class="highlight">${m}</span>`);
            const sender = msg.from === myPin ? 'You' : (currentPartnerName || 'Partner');
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            item.innerHTML = `<div class="result-sender">${sender} · ${time}</div><div>${highlightedText}</div>`;
            item.addEventListener('click', function () {
                const wrapper = document.querySelector(`[data-message-id="${msg.id}"]`);
                if (wrapper) {
                    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    wrapper.style.background = 'rgba(139, 92, 246, 0.15)';
                    setTimeout(() => { wrapper.style.background = ''; }, 2000);
                }
                searchBar.classList.remove('show');
                searchResults.classList.remove('show');
                searchInput.value = '';
            });
            searchResults.appendChild(item);
        });
        searchResults.classList.add('show');
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            searchBar.classList.remove('show');
            searchResults.classList.remove('show');
            searchInput.value = '';
        }
    });

    // ===== Display Message =====
    function displayMessage(msg) {
        if (msg.deleted) {
            appendMessage('This message was deleted', msg.from === myPin ? 'me' : 'other', msg.id, msg.timestamp);
            return;
        }
        const type = msg.from === myPin ? 'me' : 'other';
        if (msg.type === 'image') appendImage(msg.image, type, msg.id, msg.timestamp, msg.fileName);
        else if (msg.type === 'voice') appendVoiceMessage(msg.audioData, msg.duration, type, msg.id, msg.timestamp);
        else if (msg.type === 'file') appendFileMessage(msg.fileData, msg.fileName, msg.fileSize, msg.fileType, type, msg.id, msg.timestamp);
        else if (msg.type === 'video') appendVideoMessage(msg.videoData, msg.fileName, msg.fileSize, msg.thumbnail, type, msg.id, msg.timestamp);
        else if (msg.type === 'audio') appendAudioMessage(msg.audioData, msg.fileName, msg.fileSize, msg.duration, type, msg.id, msg.timestamp);
        else appendMessage(msg.text, type, msg.id, msg.timestamp);
    }

    function appendMessage(text, type, messageId = null, timestamp = null) {
        if (!messageList) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        if (messageId) wrapper.dataset.messageId = messageId;
        const div = document.createElement('div');
        div.className = 'message ' + type;
        if (text === 'This message was deleted') div.classList.add('deleted');
        const content = document.createElement('div');
        content.textContent = text;
        div.appendChild(content);
        const time = document.createElement('span');
        time.className = 'timestamp';
        if (timestamp) time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        else time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);
        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        scrollToBottom();
    }

    function appendImage(imageData, type, messageId = null, timestamp = null, fileName = null) {
        if (!messageList) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        if (messageId) wrapper.dataset.messageId = messageId;
        const div = document.createElement('div');
        div.className = 'message ' + type;
        const imgWrap = document.createElement('div');
        imgWrap.className = 'image-message-wrap';

        const img = document.createElement('img');
        img.src = imageData;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        img.style.borderRadius = '12px';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => openImageModal(imageData, fileName));

        const dlBtn = document.createElement('button');
        dlBtn.className = 'image-download-btn';
        dlBtn.title = 'Download image';
        dlBtn.innerHTML = '<i data-lucide="download"></i>';
        dlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = fileName || makeImageFilename(timestamp);
            downloadDataUrl(imageData, name);
        });

        imgWrap.appendChild(img);
        imgWrap.appendChild(dlBtn);
        div.appendChild(imgWrap);

        const time = document.createElement('span');
        time.className = 'timestamp';
        if (timestamp) time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        else time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);
        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        refreshIcons();
        scrollToBottom();
    }

    function appendFileMessage(fileData, fileName, fileSize, fileType, type, messageId = null, timestamp = null) {
        if (!messageList) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        if (messageId) wrapper.dataset.messageId = messageId;

        const div = document.createElement('div');
        div.className = 'message ' + type;

        const fileBox = document.createElement('div');
        fileBox.className = 'file-message';

        fileBox.appendChild(createFileIconEl(fileName, fileType));

        const meta = document.createElement('div');
        meta.className = 'file-meta';
        const nameEl = document.createElement('div');
        nameEl.className = 'file-name';
        nameEl.textContent = fileName || 'file';
        const sizeEl = document.createElement('div');
        sizeEl.className = 'file-size';
        sizeEl.textContent = fileSize || '';
        meta.appendChild(nameEl);
        meta.appendChild(sizeEl);

        const dl = document.createElement('button');
        dl.className = 'file-download-btn';
        dl.innerHTML = '<i data-lucide="download"></i>';
        dl.title = 'Download';
        dl.addEventListener('click', () => downloadDataUrl(fileData, fileName || 'quickie-file'));

        fileBox.appendChild(meta);
        fileBox.appendChild(dl);
        div.appendChild(fileBox);

        const time = document.createElement('span');
        time.className = 'timestamp';
        time.textContent = timestamp
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);

        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        refreshIcons();
        scrollToBottom();
    }

    function appendVideoMessage(videoData, fileName, fileSize, thumbnail, type, messageId = null, timestamp = null) {
        if (!messageList) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        if (messageId) wrapper.dataset.messageId = messageId;

        const div = document.createElement('div');
        div.className = 'message ' + type;

        const videoBox = document.createElement('div');
        videoBox.className = 'video-message';

        const video = document.createElement('video');
        video.className = 'video-player';
        video.src = videoData;
        video.controls = true;
        video.preload = 'metadata';
        video.playsInline = true;
        if (thumbnail) video.poster = thumbnail;
        videoBox.appendChild(video);

        const meta = document.createElement('div');
        meta.className = 'video-meta';

        const nameWrap = document.createElement('div');
        nameWrap.style.flex = '1';
        nameWrap.style.minWidth = '0';
        const nameEl = document.createElement('div');
        nameEl.className = 'file-name';
        nameEl.textContent = fileName || 'video';
        const sizeEl = document.createElement('div');
        sizeEl.className = 'file-size';
        sizeEl.textContent = fileSize || '';
        nameWrap.appendChild(nameEl);
        nameWrap.appendChild(sizeEl);

        const actions = document.createElement('div');
        actions.className = 'video-actions';
        const dlBtn = document.createElement('button');
        dlBtn.className = 'video-download-btn';
        dlBtn.title = 'Download video';
        dlBtn.innerHTML = '<i data-lucide="download"></i>';
        dlBtn.addEventListener('click', () => downloadDataUrl(videoData, fileName || 'quickie-video.mp4'));
        actions.appendChild(dlBtn);

        meta.appendChild(nameWrap);
        meta.appendChild(actions);
        videoBox.appendChild(meta);

        div.appendChild(videoBox);

        const time = document.createElement('span');
        time.className = 'timestamp';
        time.textContent = timestamp
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);

        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        refreshIcons();
        scrollToBottom();
    }

    function appendAudioMessage(audioData, fileName, fileSize, duration, type, messageId = null, timestamp = null) {
        if (!messageList) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        if (messageId) wrapper.dataset.messageId = messageId;

        const div = document.createElement('div');
        div.className = 'message ' + type;

        const audioBox = document.createElement('div');
        audioBox.className = 'audio-message';

        const waveform = document.createElement('div');
        waveform.className = 'audio-waveform';
        for (let i = 0; i < 12; i++) waveform.appendChild(document.createElement('span'));

        const audio = document.createElement('audio');
        audio.src = audioData;
        audio.preload = 'metadata';

        const playBtn = document.createElement('button');
        playBtn.className = 'audio-play-btn';
        playBtn.innerHTML = '<i data-lucide="play"></i>';
        let isPlaying = false;

        playBtn.addEventListener('click', function () {
            if (isPlaying) {
                audio.pause();
                playBtn.innerHTML = '<i data-lucide="play"></i>';
                waveform.classList.remove('playing');
                isPlaying = false;
            } else {
                document.querySelectorAll('.audio-message audio').forEach(a => {
                    if (a !== audio) {
                        a.pause();
                        const btn = a.closest('.audio-message')?.querySelector('.audio-play-btn');
                        if (btn) btn.innerHTML = '<i data-lucide="play"></i>';
                        const wf = a.closest('.audio-message')?.querySelector('.audio-waveform');
                        if (wf) wf.classList.remove('playing');
                    }
                });
                audio.play().catch(err => console.error('Play:', err));
                playBtn.innerHTML = '<i data-lucide="pause"></i>';
                waveform.classList.add('playing');
                isPlaying = true;
            }
            refreshIcons();
        });

        audio.addEventListener('ended', () => {
            playBtn.innerHTML = '<i data-lucide="play"></i>';
            waveform.classList.remove('playing');
            isPlaying = false;
            refreshIcons();
        });

        const controls = document.createElement('div');
        controls.className = 'audio-controls';
        controls.appendChild(playBtn);
        controls.appendChild(waveform);
        controls.appendChild(audio);

        const meta = document.createElement('div');
        meta.className = 'audio-meta';

        const nameWrap = document.createElement('div');
        nameWrap.style.flex = '1';
        nameWrap.style.minWidth = '0';
        const nameEl = document.createElement('div');
        nameEl.className = 'file-name';
        nameEl.textContent = fileName || 'audio';
        const sizeEl = document.createElement('div');
        sizeEl.className = 'file-size';
        sizeEl.textContent = fileSize || '';
        nameWrap.appendChild(nameEl);
        nameWrap.appendChild(sizeEl);

        const dlBtn = document.createElement('button');
        dlBtn.className = 'audio-download-btn';
        dlBtn.title = 'Download audio';
        dlBtn.innerHTML = '<i data-lucide="download"></i>';
        dlBtn.addEventListener('click', () => downloadDataUrl(audioData, fileName || 'quickie-audio.mp3'));

        meta.appendChild(nameWrap);
        meta.appendChild(dlBtn);

        audioBox.appendChild(controls);
        audioBox.appendChild(meta);
        div.appendChild(audioBox);

        const time = document.createElement('span');
        time.className = 'timestamp';
        time.textContent = timestamp
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);

        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        refreshIcons();
        scrollToBottom();
    }

    function appendVoiceMessage(audioData, duration, type, messageId = null, timestamp = null) {
        if (!messageList) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        if (messageId) wrapper.dataset.messageId = messageId;
        const div = document.createElement('div');
        div.className = 'message ' + type;

        const audioContainer = document.createElement('div');
        audioContainer.style.display = 'flex';
        audioContainer.style.alignItems = 'center';
        audioContainer.style.gap = '0.5rem';
        audioContainer.style.flexWrap = 'wrap';

        const playBtn = document.createElement('button');
        playBtn.className = 'audio-play-btn';
        playBtn.innerHTML = '<i data-lucide="play"></i>';

        const audioEl = document.createElement('audio');
        audioEl.style.display = 'none';

        let audioUrl = null;
        if (audioData && typeof audioData === 'string') {
            if (audioData.startsWith('data:audio')) audioUrl = audioData;
            else audioUrl = 'data:audio/webm;codecs=opus;base64,' + audioData;
        }

        if (!audioUrl) {
            const fallback = document.createElement('span');
            fallback.textContent = '🎤 Voice (unavailable)';
            fallback.style.opacity = '0.5';
            fallback.style.fontSize = '0.85rem';
            audioContainer.appendChild(fallback);
            div.appendChild(audioContainer);
            const time = document.createElement('span');
            time.className = 'timestamp';
            time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            div.appendChild(time);
            wrapper.appendChild(div);
            messageList.appendChild(wrapper);
            refreshIcons();
            scrollToBottom();
            return;
        }

        audioEl.src = audioUrl;
        let isPlaying = false;

        playBtn.addEventListener('click', function () {
            if (isPlaying) {
                audioEl.pause();
                playBtn.innerHTML = '<i data-lucide="play"></i>';
                isPlaying = false;
            } else {
                document.querySelectorAll('.message audio').forEach(function (a) {
                    if (a !== audioEl && !a.paused) {
                        a.pause();
                        const btn = a.closest('.message-wrapper')?.querySelector('.audio-play-btn');
                        if (btn) btn.innerHTML = '<i data-lucide="play"></i>';
                    }
                });
                audioEl.play().catch(function (err) { console.error('❌ Play:', err); });
                playBtn.innerHTML = '<i data-lucide="pause"></i>';
                isPlaying = true;
            }
            refreshIcons();
        });

        audioEl.addEventListener('ended', function () {
            playBtn.innerHTML = '<i data-lucide="play"></i>';
            isPlaying = false;
            refreshIcons();
        });

        const durationSpan = document.createElement('span');
        const mins = Math.floor((duration || 0) / 60);
        const secs = Math.floor((duration || 0) % 60);
        durationSpan.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        durationSpan.style.fontSize = '0.8rem';
        durationSpan.style.opacity = '0.7';
        durationSpan.style.minWidth = '35px';

        const progressBar = document.createElement('input');
        progressBar.type = 'range';
        progressBar.min = 0;
        progressBar.max = 100;
        progressBar.value = 0;
        progressBar.style.flex = '1';
        progressBar.style.minWidth = '60px';
        progressBar.style.maxWidth = '120px';
        progressBar.style.height = '4px';
        progressBar.style.accentColor = '#764ba2';

        audioEl.addEventListener('timeupdate', function () {
            if (this.duration) progressBar.value = (this.currentTime / this.duration) * 100;
        });
        progressBar.addEventListener('input', function () {
            if (audioEl.duration) audioEl.currentTime = (this.value / 100) * audioEl.duration;
        });

        audioContainer.appendChild(playBtn);
        audioContainer.appendChild(progressBar);
        audioContainer.appendChild(durationSpan);
        audioContainer.appendChild(audioEl);

        div.appendChild(audioContainer);

        const dlRow = document.createElement('div');
        dlRow.className = 'voice-actions-row';
        const dlBtn = document.createElement('button');
        dlBtn.className = 'voice-download-btn';
        dlBtn.title = 'Download voice message';
        dlBtn.innerHTML = '<i data-lucide="download"></i>';
        dlBtn.addEventListener('click', () => downloadDataUrl(audioUrl, makeVoiceFilename(timestamp)));
        dlRow.appendChild(dlBtn);
        div.appendChild(dlRow);

        const time = document.createElement('span');
        time.className = 'timestamp';
        time.textContent = timestamp
            ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.appendChild(time);

        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        refreshIcons();
        scrollToBottom();
    }

    // ===== UPLOAD PROGRESS BUBBLE =====
    function createProgressBubble(fileName, fileType) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper upload-wrapper';

        const div = document.createElement('div');
        div.className = 'message me upload-message';

        div.appendChild(createFileIconEl(fileName, fileType));

        const body = document.createElement('div');
        body.className = 'upload-body';

        const nameEl = document.createElement('div');
        nameEl.className = 'file-name';
        nameEl.textContent = fileName;

        const bar = document.createElement('div');
        bar.className = 'upload-progress-bar';
        const fill = document.createElement('div');
        fill.className = 'upload-progress-fill';
        bar.appendChild(fill);

        const text = document.createElement('div');
        text.className = 'upload-progress-text';
        text.textContent = '0%';

        body.appendChild(nameEl);
        body.appendChild(bar);
        body.appendChild(text);

        div.appendChild(body);
        wrapper.appendChild(div);
        messageList.appendChild(wrapper);
        refreshIcons();
        scrollToBottom();

        return {
            wrapper,
            setProgress(percent, loaded, total) {
                fill.style.width = Math.min(100, percent) + '%';
                text.textContent = percent.toFixed(0) + '% · ' + formatBytes(loaded) + ' / ' + formatBytes(total);
            },
            complete() { wrapper.remove(); },
            fail(reason) {
                bar.classList.add('failed');
                text.textContent = reason || 'Upload failed';
            }
        };
    }

    function readFileWithProgress(file, onProgress) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onprogress = (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress((e.loaded / e.total) * 100, e.loaded, e.total);
                }
            };
            reader.onload = () => {
                if (onProgress) onProgress(100, file.size, file.size);
                resolve(reader.result);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    function extractVideoThumbnail(file) {
        return new Promise((resolve) => {
            try {
                const url = URL.createObjectURL(file);
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.muted = true;
                video.playsInline = true;
                video.src = url;

                const cleanup = () => { URL.revokeObjectURL(url); video.remove(); };
                const timeout = setTimeout(() => { cleanup(); resolve(null); }, 4000);

                video.addEventListener('loadedmetadata', () => {
                    const target = Math.min(1, (video.duration || 1) / 2);
                    try { video.currentTime = target; } catch (e) { }
                });

                video.addEventListener('seeked', () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const w = video.videoWidth || 320;
                        const h = video.videoHeight || 180;
                        const scale = Math.min(1, 320 / w);
                        canvas.width = Math.round(w * scale);
                        canvas.height = Math.round(h * scale);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const thumb = canvas.toDataURL('image/jpeg', 0.7);
                        clearTimeout(timeout); cleanup(); resolve(thumb);
                    } catch (e) { clearTimeout(timeout); cleanup(); resolve(null); }
                });

                video.addEventListener('error', () => { clearTimeout(timeout); cleanup(); resolve(null); });
            } catch (e) { resolve(null); }
        });
    }

    // ===== IMAGE UPLOAD =====
    imageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;
        imageInput.value = '';
        if (!currentChatId) { setError('Please select a chat first'); return; }
        if (file.size > MAX_FILE_BYTES) { setError(`Image too large. Max ${formatBytes(MAX_FILE_BYTES)}`); return; }

        const messageId = Date.now() + '_img';
        const progress = createProgressBubble(file.name, file.type);

        try {
            const imageData = await readFileWithProgress(file, (p, l, t) => progress.setProgress(p, l, t));
            progress.complete();
            const data = { id: messageId, image: imageData, fileName: file.name, from: myPin, timestamp: Date.now(), type: 'image', deleted: false };
            allMessages.push(data);
            appendImage(imageData, 'me', messageId, Date.now(), file.name);
            const chat = allChats.find(c => c.chatId === currentChatId);
            if (chat) { chat.lastMessage = '📸 Image'; chat.lastTimestamp = Date.now(); renderChatList(); saveChatsToLocal(); }
            socket.emit('chat-image', { chatId: currentChatId, image: imageData, fileName: file.name, messageId, fromPin: myPin });
        } catch (err) {
            console.error(err);
            progress.fail('Read failed');
            setError('Failed to read image');
        }
    });

    // ===== FILE UPLOAD =====
    fileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;
        fileInput.value = '';
        if (!currentChatId) { setError('Please select a chat first'); return; }
        if (file.size > MAX_FILE_BYTES) { setError(`File too large. Max ${formatBytes(MAX_FILE_BYTES)}`); return; }

        const messageId = Date.now() + '_file';
        const progress = createProgressBubble(file.name, file.type);

        try {
            const fileData = await readFileWithProgress(file, (p, l, t) => progress.setProgress(p, l, t));
            progress.complete();
            const fileSize = formatBytes(file.size);
            const data = { id: messageId, fileData, fileName: file.name, fileType: file.type, fileSize, from: myPin, timestamp: Date.now(), type: 'file', deleted: false };
            allMessages.push(data);
            appendFileMessage(fileData, file.name, fileSize, file.type, 'me', messageId);
            const chat = allChats.find(c => c.chatId === currentChatId);
            if (chat) {
                chat.lastMessage = `📎 ${file.name}`;
                chat.lastTimestamp = Date.now();
                renderChatList(); saveChatsToLocal();
            }
            socket.emit('chat-file', { chatId: currentChatId, fileData, fileName: file.name, fileType: file.type, fileSize, messageId, fromPin: myPin });
        } catch (err) {
            console.error(err);
            progress.fail('Read failed');
            setError('Failed to read file');
        }
    });

    // ===== VIDEO UPLOAD =====
    videoBtn.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;
        videoInput.value = '';
        if (!currentChatId) { setError('Please select a chat first'); return; }
        if (file.size > MAX_FILE_BYTES) { setError(`Video too large. Max ${formatBytes(MAX_FILE_BYTES)}`); return; }

        const messageId = Date.now() + '_vid';
        const progress = createProgressBubble(file.name, file.type);

        let thumbnail = null;
        try { thumbnail = await extractVideoThumbnail(file); } catch (e) { }

        try {
            const videoData = await readFileWithProgress(file, (p, l, t) => progress.setProgress(p, l, t));
            progress.complete();
            const fileSize = formatBytes(file.size);
            const data = { id: messageId, videoData, fileName: file.name, fileSize, thumbnail, from: myPin, timestamp: Date.now(), type: 'video', deleted: false };
            allMessages.push(data);
            appendVideoMessage(videoData, file.name, fileSize, thumbnail, 'me', messageId);
            const chat = allChats.find(c => c.chatId === currentChatId);
            if (chat) { chat.lastMessage = '🎬 Video'; chat.lastTimestamp = Date.now(); renderChatList(); saveChatsToLocal(); }
            socket.emit('chat-video', { chatId: currentChatId, videoData, fileName: file.name, fileSize, thumbnail, messageId, fromPin: myPin });
        } catch (err) {
            console.error(err);
            progress.fail('Read failed');
            setError('Failed to read video');
        }
    });

    // ===== AUDIO UPLOAD =====
    audioBtn.addEventListener('click', () => audioInput.click());
    audioInput.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;
        audioInput.value = '';
        if (!currentChatId) { setError('Please select a chat first'); return; }
        if (file.size > MAX_FILE_BYTES) { setError(`Audio too large. Max ${formatBytes(MAX_FILE_BYTES)}`); return; }

        const messageId = Date.now() + '_aud';
        const progress = createProgressBubble(file.name, file.type);

        try {
            const audioData = await readFileWithProgress(file, (p, l, t) => progress.setProgress(p, l, t));
            progress.complete();
            const fileSize = formatBytes(file.size);
            let duration = 0;
            try { duration = await getAudioDuration(audioData); } catch (e) { }
            const data = { id: messageId, audioData, fileName: file.name, fileSize, duration, from: myPin, timestamp: Date.now(), type: 'audio', deleted: false };
            allMessages.push(data);
            appendAudioMessage(audioData, file.name, fileSize, duration, 'me', messageId);
            const chat = allChats.find(c => c.chatId === currentChatId);
            if (chat) { chat.lastMessage = '🎵 Audio'; chat.lastTimestamp = Date.now(); renderChatList(); saveChatsToLocal(); }
            socket.emit('chat-audio', { chatId: currentChatId, audioData, fileName: file.name, fileSize, duration, messageId, fromPin: myPin });
        } catch (err) {
            console.error(err);
            progress.fail('Read failed');
            setError('Failed to read audio');
        }
    });

    function getAudioDuration(src) {
        return new Promise((resolve) => {
            const audio = document.createElement('audio');
            audio.preload = 'metadata';
            audio.src = src;
            const timeout = setTimeout(() => resolve(0), 3000);
            audio.addEventListener('loadedmetadata', () => { clearTimeout(timeout); resolve(audio.duration || 0); });
            audio.addEventListener('error', () => { clearTimeout(timeout); resolve(0); });
        });
    }

    // ===== VOICE RECORDING =====
    voiceBtn.addEventListener('click', function () {
        if (!currentChatId) { setError('Please select a chat first'); return; }
        if (isRecording) stopRecording();
        else startRecording();
    });

    function startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function (stream) {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
                audioChunks = [];
                recordingSeconds = 0;
                isRecording = true;
                voiceBtn.classList.add('recording');
                const voiceModal = document.getElementById('voiceModal');
                voiceModal.classList.add('show');
                if (recordingTimer) clearInterval(recordingTimer);
                recordingTimer = setInterval(function () {
                    recordingSeconds++;
                    const mins = Math.floor(recordingSeconds / 60);
                    const secs = recordingSeconds % 60;
                    const timer = document.getElementById('voiceTimer');
                    if (timer) timer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
                    if (recordingSeconds >= MAX_VOICE_SECONDS) stopRecording();
                }, 1000);
                mediaRecorder.ondataavailable = function (event) {
                    if (event.data.size > 0) audioChunks.push(event.data);
                };
                mediaRecorder.onstop = function () {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
                    const reader = new FileReader();
                    reader.onload = function () {
                        const audioData = reader.result;
                        const messageId = Date.now() + '_voice';
                        const data = { id: messageId, audioData, duration: recordingSeconds, from: myPin, timestamp: Date.now(), type: 'voice', deleted: false };
                        allMessages.push(data);
                        appendVoiceMessage(audioData, recordingSeconds, 'me', messageId);
                        const chat = allChats.find(c => c.chatId === currentChatId);
                        if (chat) { chat.lastMessage = '🎤 Voice'; chat.lastTimestamp = Date.now(); renderChatList(); saveChatsToLocal(); }
                        socket.emit('voice-message', { chatId: currentChatId, audioData, duration: recordingSeconds, messageId, fromPin: myPin });
                        const voiceModal = document.getElementById('voiceModal');
                        voiceModal.classList.remove('show');
                        voiceBtn.classList.remove('recording');
                    };
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(t => t.stop());
                    isRecording = false;
                    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
                };
                mediaRecorder.start(100);
            })
            .catch(function (err) {
                console.error('❌ Mic error:', err);
                alert('Microphone access is required for voice messages.');
            });
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) mediaRecorder.stop();
    }

    const stopRecordingBtn = document.getElementById('stopRecordingBtn');
    const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');
    if (stopRecordingBtn) stopRecordingBtn.addEventListener('click', stopRecording);
    if (cancelRecordingBtn) {
        cancelRecordingBtn.addEventListener('click', function () {
            if (mediaRecorder && isRecording) {
                mediaRecorder.onstop = function () {
                    mediaRecorder.stream.getTracks().forEach(t => t.stop());
                    isRecording = false;
                    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
                    document.getElementById('voiceModal').classList.remove('show');
                    voiceBtn.classList.remove('recording');
                };
                mediaRecorder.stop();
            }
        });
    }

    // ===== EMOJI PICKER =====
    function renderEmojiBody(category, searchTerm) {
        emojiBody.innerHTML = '';

        let emojis = [];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const all = Object.values(EMOJI_DATA).flat();
            if (lower.length > 0) {
                const matchedCats = Object.keys(EMOJI_DATA).filter(c => c.includes(lower));
                if (matchedCats.length > 0) {
                    matchedCats.forEach(c => emojis.push(...EMOJI_DATA[c]));
                } else {
                    emojis = all;
                }
            }
        } else if (category === 'recent') {
            emojis = getRecentEmojis();
            if (emojis.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'emoji-empty';
                empty.textContent = 'No recent emojis yet. Pick some!';
                emojiBody.appendChild(empty);
                return;
            }
        } else {
            emojis = EMOJI_DATA[category] || [];
        }

        if (emojis.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'emoji-empty';
            empty.textContent = 'No emojis found';
            emojiBody.appendChild(empty);
            return;
        }

        emojis.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-item';
            btn.type = 'button';
            btn.textContent = emoji;
            btn.addEventListener('click', function () {
                const cursorPos = chatInput.selectionStart;
                const text = chatInput.value;
                chatInput.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
                chatInput.focus();
                chatInput.selectionStart = chatInput.selectionEnd = cursorPos + emoji.length;
                addRecentEmoji(emoji);
                chatInput.dispatchEvent(new Event('input'));
            });
            emojiBody.appendChild(btn);
        });
    }

    emojiBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        emojiPicker.classList.toggle('show');
        if (emojiPicker.classList.contains('show')) {
            renderEmojiBody(currentEmojiCategory, '');
            emojiSearch.value = '';
            setTimeout(() => emojiSearch.focus(), 100);
        }
        refreshIcons();
    });

    emojiTabs.addEventListener('click', function (e) {
        const tab = e.target.closest('.emoji-tab');
        if (!tab) return;
        emojiTabs.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentEmojiCategory = tab.dataset.cat;
        emojiSearch.value = '';
        renderEmojiBody(currentEmojiCategory, '');
    });

    if (emojiSearch) {
        emojiSearch.addEventListener('input', function () {
            const term = this.value.trim();
            if (term.length === 0) {
                renderEmojiBody(currentEmojiCategory, '');
            } else {
                renderEmojiBody(currentEmojiCategory, term);
            }
        });
    }

    document.addEventListener('click', function (e) {
        if (emojiPicker && emojiBtn && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });

    // ===== MODALS =====
    document.getElementById('closeModal').addEventListener('click', function () {
        document.getElementById('imageModal').classList.remove('show');
    });
    document.getElementById('imageModal').addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('show');
    });
    document.getElementById('closeAudioBtn').addEventListener('click', function () {
        document.getElementById('audioPlayerModal').classList.remove('show');
        const ap = document.getElementById('audioPlayer');
        if (ap) ap.pause();
    });

    document.querySelectorAll('.quick-reply').forEach(function (btn) {
        btn.addEventListener('click', function () {
            chatInput.value = this.dataset.text;
            sendMessage();
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.getElementById('imageModal').classList.remove('show');
            document.getElementById('audioPlayerModal').classList.remove('show');
            const ap = document.getElementById('audioPlayer');
            if (ap) ap.pause();
            searchBar.classList.remove('show');
            searchResults.classList.remove('show');
            searchInput.value = '';
            emojiPicker.classList.remove('show');
        }
    });

    phoneInput.addEventListener('input', function () {
        const cleaned = this.value.replace(/\D/g, '');
        if (cleaned.length > 0) {
            let formatted = '+' + cleaned;
            if (cleaned.length > 3) formatted = '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
            if (cleaned.length > 6) formatted = '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 6) + ' ' + cleaned.slice(6);
            if (cleaned.length > 10) formatted = '+' + cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 6) + ' ' + cleaned.slice(6, 10);
            this.value = formatted;
        }
    });

    function scrollToBottom() {
        if (messageList) messageList.scrollTop = messageList.scrollHeight;
    }

    function getGradientFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        const gradients = [
            'linear-gradient(135deg, #667eea, #764ba2)',
            'linear-gradient(135deg, #f093fb, #f5576c)',
            'linear-gradient(135deg, #4facfe, #00f2fe)',
            'linear-gradient(135deg, #43e97b, #38f9d7)',
            'linear-gradient(135deg, #fa709a, #fee140)',
            'linear-gradient(135deg, #30cfd0, #330867)',
        ];
        return gradients[Math.abs(hash) % gradients.length];
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (msgDate.getTime() === today.getTime()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function playNotificationSound() {
        try {
            const ac = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.value = 0.1;
            osc.start();
            setTimeout(() => osc.stop(), 150);
        } catch (e) { }
    }

    function openImageModal(imageData, fileName) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const downloadBtn = document.getElementById('downloadBtn');
        modal.classList.add('show');
        modalImg.src = imageData;
        downloadBtn.href = imageData;
        downloadBtn.download = fileName || makeImageFilename();
    }

    // ===== INIT =====
    console.log('✅ Quickie app initialized!');
    initDarkMode();
    loginPinInput.focus();
    connectSocket();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refreshIcons);
    } else {
        refreshIcons();
    }
    setTimeout(refreshIcons, 500);

    // ===== REGISTER SERVICE WORKER (PWA) =====
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('✅ Service Worker registered:', reg.scope))
                .catch((err) => console.warn('⚠️ Service Worker registration failed:', err));
        });
    }



})();