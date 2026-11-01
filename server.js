import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebcastPushConnection } from 'tiktok-live-connector';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Phục vụ thư mục video gốc nếu có video chill
app.use('/media', express.static(path.join(__dirname, '..')));

// Quản lý trạng thái rạp chiếu
const cinemaState = {
  tiktokConnected: false,
  tiktokUsername: '',
  nowPlaying: {
    title: 'Gió Thoảng Mùa Thu - Lofi Chill Beats',
    type: 'video', // 'video' hoặc 'audio'
    src: '/media/Julia_Camping_Mua_Rung_ASMR_15Phut_9x16.mp4'
  },
  seats: Array.from({ length: 36 }, (_, i) => ({
    id: i + 1,
    row: String.fromCharCode(65 + Math.floor(i / 9)), // A, B, C, D
    col: (i % 9) + 1,
    occupiedBy: null, // { username, nickname, avatar, role, snack, isVip, joinedAt }
  })),
  historyGifts: []
};

// Quản lý kết nối TikTok Live
let tiktokLiveConnection = null;

// Khởi tạo Edge-TTS
let edgeTts = null;
try {
  edgeTts = new MsEdgeTTS();
} catch (e) {
  console.warn('[TTS] Khởi tạo Edge-TTS dự phòng');
}

/**
 * Gửi âm thanh đọc giọng AI (Text-to-speech)
 */
async function generateTTS(text, voice = 'vi-VN-HoaiMyNeural') {
  try {
    if (!edgeTts) edgeTts = new MsEdgeTTS();
    await edgeTts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const readable = edgeTts.toStream(text);
    
    const chunks = [];
    return new Promise((resolve, reject) => {
      readable.on('data', chunk => chunks.push(chunk));
      readable.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        resolve(audioBuffer.toString('base64'));
      });
      readable.on('error', err => reject(err));
    });
  } catch (err) {
    console.error('[TTS Error]', err.message);
    return null;
  }
}

/**
 * Broadcast dữ liệu tới toàn bộ client WebSocket (Overlay & Control)
 */
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Xử lý logic gán chỗ ngồi cho người xem
 */
function assignSeat(user, roleHint = 'normal', snack = null) {
  // Tìm xem user đã có ghế chưa
  let seat = cinemaState.seats.find(s => s.occupiedBy && s.occupiedBy.uniqueId === user.uniqueId);

  if (seat) {
    // Đã có ghế -> Cập nhật trạng thái
    if (roleHint && roleHint !== 'normal') seat.occupiedBy.role = roleHint;
    if (snack) seat.occupiedBy.snack = snack;
    return seat;
  }

  // Nếu chưa có, tìm ghế trống
  const emptySeats = cinemaState.seats.filter(s => !s.occupiedBy);
  if (emptySeats.length > 0) {
    // Ưu tiên chọn ghế ngẫu nhiên trong danh sách trống
    seat = emptySeats[Math.floor(Math.random() * emptySeats.length)];
    seat.occupiedBy = {
      uniqueId: user.uniqueId,
      nickname: user.nickname || user.uniqueId,
      profilePictureUrl: user.profilePictureUrl || '',
      role: roleHint,
      snack: snack,
      isVip: false,
      joinedAt: Date.now()
    };
    return seat;
  }

  // Nếu rạp đã đầy ghế (36 ghế), thay thế ghế của người vào lâu nhất
  const sorted = [...cinemaState.seats].sort((a, b) => a.occupiedBy.joinedAt - b.occupiedBy.joinedAt);
  seat = sorted[0];
  seat.occupiedBy = {
    uniqueId: user.uniqueId,
    nickname: user.nickname || user.uniqueId,
    profilePictureUrl: user.profilePictureUrl || '',
    role: roleHint,
    snack: snack,
    isVip: false,
    joinedAt: Date.now()
  };
  return seat;
}

/**
 * Kết nối phòng TikTok Live
 */
function connectTikTokLive(username) {
  if (tiktokLiveConnection) {
    tiktokLiveConnection.disconnect();
  }

  tiktokLiveConnection = new WebcastPushConnection(username);

  tiktokLiveConnection.connect().then(state => {
    console.log(`[TikTok] Đã kết nối tới Live Room của @${username} (Room ID: ${state.roomId})`);
    cinemaState.tiktokConnected = true;
    cinemaState.tiktokUsername = username;
    broadcast('TIKTOK_STATUS', { connected: true, username });
  }).catch(err => {
    console.error(`[TikTok] Kết nối thất bại tới @${username}:`, err.message);
    cinemaState.tiktokConnected = false;
    broadcast('TIKTOK_STATUS', { connected: false, error: err.message });
  });

  // 1. Lắng nghe bình luận
  tiktokLiveConnection.on('chat', async data => {
    const comment = (data.comment || '').trim().toLowerCase();
    const user = {
      uniqueId: data.uniqueId,
      nickname: data.nickname,
      profilePictureUrl: data.profilePictureUrl
    };

    let role = 'normal';
    let snack = null;

    // Nhận diện role skin
    if (comment.includes('meo') || comment.includes('mèo')) role = 'cat';
    else if (comment.includes('nu') || comment.includes('nữ')) role = 'female';
    else if (comment.includes('nam')) role = 'male';
    else if (comment.includes('hoodie')) role = 'hoodie';
    else if (comment.includes('kinh') || comment.includes('kính')) role = 'glasses';

    // Nhận diện order đồ ăn vặt
    if (comment.includes('!bap') || comment.includes('bắp') || comment.includes('popcorn')) snack = 'popcorn';
    else if (comment.includes('!nuoc') || comment.includes('nước') || comment.includes('coca') || comment.includes('pepsi')) snack = 'drink';
    else if (comment.includes('!bia') || comment.includes('beer')) snack = 'beer';
    else if (comment.includes('!tra') || comment.includes('trà')) snack = 'milktea';

    const seat = assignSeat(user, role, snack);
    broadcast('SEAT_UPDATE', { seat, comment: data.comment, user });
  });

  // 2. Lắng nghe thả tim
  tiktokLiveConnection.on('like', data => {
    broadcast('USER_LIKE', {
      uniqueId: data.uniqueId,
      nickname: data.nickname,
      likeCount: data.likeCount,
      totalLikes: data.totalLikeCount
    });
  });

  // 3. Lắng nghe tặng quà (Gifts)
  tiktokLiveConnection.on('gift', async data => {
    if (data.giftType === 1 && !data.repeatEnd) {
      // Bỏ qua các chuỗi streak quà đang tích lũy dở dang
      return;
    }

    const user = {
      uniqueId: data.uniqueId,
      nickname: data.nickname,
      profilePictureUrl: data.profilePictureUrl
    };

    // Nâng cấp ghế thành VIP
    const seat = assignSeat(user, 'vip');
    if (seat && seat.occupiedBy) {
      seat.occupiedBy.isVip = true;
    }

    const giftInfo = {
      giftId: data.giftId,
      giftName: data.giftName,
      diamondCount: data.diamondCount * (data.repeatCount || 1),
      repeatCount: data.repeatCount || 1,
      user
    };

    cinemaState.historyGifts.unshift(giftInfo);
    if (cinemaState.historyGifts.length > 20) cinemaState.historyGifts.pop();

    // Sinh giọng đọc AI xướng danh
    const ttsText = `Rạp phim xin trân trọng cảm ơn bạn ${user.nickname} đã ủng hộ ${giftInfo.giftName}. Chúc bạn xem phim vui vẻ!`;
    const audioBase64 = await generateTTS(ttsText);

    broadcast('GIFT_EVENT', {
      giftInfo,
      seat,
      ttsAudio: audioBase64,
      ttsText
    });
  });
}

// WebSocket Connection Handlers
wss.on('connection', ws => {
  // Gửi trạng thái ban đầu của rạp cho client mới kết nối
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    payload: cinemaState
  }));

  ws.on('message', async rawData => {
    try {
      const msg = JSON.parse(rawData);

      // Xử lý lệnh từ Control Panel (Admin Dashboard / Simulator)
      if (msg.type === 'CONNECT_TIKTOK') {
        connectTikTokLive(msg.payload.username);
      } else if (msg.type === 'DISCONNECT_TIKTOK') {
        if (tiktokLiveConnection) tiktokLiveConnection.disconnect();
        cinemaState.tiktokConnected = false;
        broadcast('TIKTOK_STATUS', { connected: false });
      } else if (msg.type === 'SIMULATE_EVENT') {
        // Mock dữ liệu để test khi chưa phát trực tiếp
        handleSimulatedEvent(msg.payload);
      } else if (msg.type === 'CHANGE_MEDIA') {
        cinemaState.nowPlaying = msg.payload;
        broadcast('MEDIA_CHANGED', cinemaState.nowPlaying);
      } else if (msg.type === 'RESET_SEATS') {
        cinemaState.seats.forEach(s => s.occupiedBy = null);
        broadcast('SEATS_RESET', cinemaState.seats);
      }
    } catch (e) {
      console.error('[WS Message Error]', e.message);
    }
  });
});

/**
 * Xử lý sự kiện giả lập (Dành cho việc test rạp offline)
 */
async function handleSimulatedEvent(event) {
  const randomNames = ['Minh_Thu', 'Hoang_Anh', 'Gamer_99', 'Lofi_Girl', 'Meo_Beo', 'Cyber_Pug'];
  const name = event.username || randomNames[Math.floor(Math.random() * randomNames.length)];
  const mockUser = {
    uniqueId: name.toLowerCase(),
    nickname: name,
    profilePictureUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
  };

  if (event.action === 'join_or_chat') {
    const seat = assignSeat(mockUser, event.role || 'normal', event.snack || null);
    broadcast('SEAT_UPDATE', { seat, comment: event.comment || 'Chào cả rạp nhé!', user: mockUser });
  } else if (event.action === 'like') {
    broadcast('USER_LIKE', { uniqueId: mockUser.uniqueId, nickname: mockUser.nickname, likeCount: 5 });
  } else if (event.action === 'gift') {
    const seat = assignSeat(mockUser, 'vip');
    if (seat && seat.occupiedBy) seat.occupiedBy.isVip = true;

    const ttsText = `Cảm ơn bạn ${mockUser.nickname} đã bao trọn bắp nước cho rạp!`;
    const audioBase64 = await generateTTS(ttsText);

    broadcast('GIFT_EVENT', {
      giftInfo: {
        giftName: event.giftName || 'Bỏng Ngô Khổng Lồ',
        diamondCount: 99,
        repeatCount: 1,
        user: mockUser
      },
      seat,
      ttsAudio: audioBase64,
      ttsText
    });
  }
}

// Khởi chạy máy chủ
server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`🎬 COZY CINEMA LIVE SERVER ĐANG CHẠY!`);
  console.log(`👉 Màn hình chiếu (OBS Overlay): http://localhost:${PORT}/overlay.html`);
  console.log(`👉 Bảng điều khiển (Control Panel): http://localhost:${PORT}/control.html`);
  console.log(`👉 Chạy thử độc lập (Standalone Preview): http://localhost:${PORT}/standalone.html`);
  console.log(`=======================================================`);
});
