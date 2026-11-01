/**
 * Cozy Cinema 2.5D Canvas Engine
 * Quản lý vẽ các hàng ghế rạp chiếu phim, nhân vật khán giả, hiệu ứng ánh sáng và tim bay.
 */

export class CinemaEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.seats = [];
    this.particles = [];
    this.animFrameId = null;
    this.lastTime = 0;

    // Cấu hình âm thanh (Web Audio API Synthesizer)
    this.audioCtx = null;
    this.ttsQueue = [];
    this.isPlayingTts = false;

    this.initCanvasSize();
    window.addEventListener('resize', () => this.initCanvasSize());
  }

  initCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  setSeats(seatsData) {
    this.seats = seatsData;
  }

  updateSeat(updatedSeat) {
    const idx = this.seats.findIndex(s => s.id === updatedSeat.id);
    if (idx !== -1) {
      this.seats[idx] = updatedSeat;
      // Kích hoạt hiệu ứng tim bay tại ghế vừa cập nhật
      this.spawnHeartAtSeat(updatedSeat.id);
    }
  }

  /**
   * Tạo hiệu ứng tim bay từ một vị trí ghế
   */
  spawnHeartAtSeat(seatId) {
    const pos = this.getSeatCoordinates(seatId);
    if (!pos) return;

    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 30,
        y: pos.y - 15,
        vx: (Math.random() - 0.5) * 2,
        vy: -2 - Math.random() * 3,
        alpha: 1,
        scale: 0.8 + Math.random() * 0.6,
        type: 'heart',
        color: ['#f43f5e', '#fb7185', '#fda4af', '#f472b6'][Math.floor(Math.random() * 4)]
      });
    }
  }

  /**
   * Tính toán tọa độ 2.5D Perspective cho 36 ghế (4 hàng x 9 cột)
   */
  getSeatCoordinates(seatId) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (w === 0 || h === 0) return null;

    const rowIdx = Math.floor((seatId - 1) / 9); // 0 (A), 1 (B), 2 (C), 3 (D)
    const colIdx = (seatId - 1) % 9; // 0 -> 8

    // Chiều sâu phối cảnh (Hàng A xa hơn -> hẹp hơn & nhỏ hơn; Hàng D gần hơn -> rộng hơn & to hơn)
    const perspectiveFactor = 0.72 + rowIdx * 0.1;
    const rowY = h * 0.22 + rowIdx * (h * 0.22);

    const rowWidth = w * (0.8 + rowIdx * 0.05);
    const startX = (w - rowWidth) / 2;
    const stepX = rowWidth / 9;
    const seatX = startX + colIdx * stepX + stepX / 2;

    return { x: seatX, y: rowY, scale: perspectiveFactor };
  }

  /**
   * Vòng lặp Render chính (60 FPS)
   */
  startRenderLoop() {
    const loop = (timestamp) => {
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopRenderLoop() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Vẽ nền sàn rạp có gradient và thảm đỏ ở lối đi giữa
    this.drawTheaterFloor(ctx, w, h);

    // 2. Vẽ 4 hàng ghế từ xa đến gần (Hàng 0 -> Hàng 3) để xếp lớp (Z-index sorting)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        const seatId = r * 9 + c + 1;
        const seat = this.seats.find(s => s.id === seatId) || { id: seatId, occupiedBy: null };
        const coord = this.getSeatCoordinates(seatId);
        if (coord) {
          this.drawSingleSeat(ctx, coord.x, coord.y, coord.scale, seat);
        }
      }
    }

    // 3. Cập nhật và vẽ các hạt hiệu ứng (Tim bay)
    this.updateAndDrawParticles(ctx);
  }

  drawTheaterFloor(ctx, w, h) {
    // Sàn gỗ bóng mờ
    const floorGrad = ctx.createLinearGradient(0, 0, 0, h);
    floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
    floorGrad.addColorStop(1, 'rgba(8, 10, 16, 0.95)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 0, w, h);

    // Lối đi thảm đỏ trung tâm 2.5D
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.46, 0);
    ctx.lineTo(w * 0.54, 0);
    ctx.lineTo(w * 0.58, h);
    ctx.lineTo(w * 0.42, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(136, 19, 55, 0.28)';
    ctx.fill();
    ctx.restore();
  }

  drawSingleSeat(ctx, x, y, scale, seat) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const isOccupied = !!seat.occupiedBy;
    const isVip = isOccupied && seat.occupiedBy.isVip;

    // 1. Vẽ bóng đổ của ghế (Drop shadow)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 32, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vẽ thân ghế rạp chiếu phim (Ghế nỉ rạp màu đỏ bordeaux hoặc màu xám sang trọng)
    const seatColor = isVip ? '#854d0e' : (isOccupied ? '#991b1b' : '#1e293b');
    const seatBorder = isVip ? '#facc15' : (isOccupied ? '#ef4444' : '#334155');

    // Lưng ghế (Backrest)
    ctx.fillStyle = seatColor;
    ctx.strokeStyle = seatBorder;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(-24, -20, 48, 42, 10);
    ctx.fill();
    ctx.stroke();

    // Đệm ngồi (Seat Cushion)
    ctx.fillStyle = isVip ? '#a16207' : (isOccupied ? '#7f1d1d' : '#0f172a');
    ctx.beginPath();
    ctx.roundRect(-26, 10, 52, 22, 7);
    ctx.fill();
    ctx.stroke();

    // Vẽ mã số ghế (Ví dụ: A1, B4)
    const rowChar = String.fromCharCode(65 + Math.floor((seat.id - 1) / 9));
    const colNum = ((seat.id - 1) % 9) + 1;
    ctx.fillStyle = isOccupied ? 'rgba(255, 255, 255, 0.35)' : 'rgba(148, 163, 184, 0.6)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${rowChar}${colNum}`, 0, -26);

    // 3. Nếu có người ngồi, vẽ nhân vật chibi khán giả
    if (isOccupied) {
      this.drawAudienceCharacter(ctx, seat.occupiedBy);
    }

    ctx.restore();
  }

  drawAudienceCharacter(ctx, user) {
    const role = user.role || 'normal';

    // Vẽ Hào quang VIP nếu có
    if (user.isVip) {
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, -5, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Vương miện VIP 👑
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -32);
    }

    // Vẽ cơ thể / áo của nhân vật
    ctx.fillStyle = user.isVip ? '#eab308' : (role === 'hoodie' ? '#0284c7' : '#475569');
    ctx.beginPath();
    ctx.roundRect(-16, 2, 32, 22, 8);
    ctx.fill();

    // Vẽ đầu nhân vật
    ctx.fillStyle = '#fed7aa'; // Màu da ấm
    ctx.beginPath();
    ctx.arc(0, -6, 15, 0, Math.PI * 2);
    ctx.fill();

    // Vẽ các đặc điểm riêng theo Role
    if (role === 'cat') {
      // Tai mèo 🐱
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(-12, -15);
      ctx.lineTo(-6, -26);
      ctx.lineTo(0, -18);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, -15);
      ctx.lineTo(6, -26);
      ctx.lineTo(0, -18);
      ctx.fill();
    } else if (role === 'female') {
      // Tóc dài + Nơ hồng 🎀
      ctx.fillStyle = '#331e17';
      ctx.beginPath();
      ctx.arc(0, -12, 16, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.font = '14px sans-serif';
      ctx.fillText('🎀', 12, -18);
    } else if (role === 'glasses') {
      // Kính mắt 👓
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(-9, -10, 7, 6);
      ctx.strokeRect(2, -10, 7, 6);
      ctx.beginPath();
      ctx.moveTo(-2, -7);
      ctx.lineTo(2, -7);
      ctx.stroke();
    } else if (role === 'hoodie') {
      // Mũ hoodie chùm
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -6, 17, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();
    }

    // Vẽ đôi mắt (Đang nhìn lên màn hình chiếu)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-5, -8, 2.2, 0, Math.PI * 2);
    ctx.arc(5, -8, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Vẽ đồ ăn vặt (Snack) nếu có
    if (user.snack) {
      let icon = '🍿';
      if (user.snack === 'drink' || user.snack === 'milktea') icon = '🥤';
      if (user.snack === 'beer') icon = '🍺';

      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, 18, 14);
    }

    // Vẽ tên người xem (Label)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const displayName = user.nickname.length > 8 ? user.nickname.substring(0, 7) + '..' : user.nickname;
    
    // Nền mờ cho tên dễ đọc
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.roundRect(-25, 30, 50, 15, 4);
    ctx.fill();

    ctx.fillStyle = user.isVip ? '#fde047' : '#f8fafc';
    ctx.fillText(displayName, 0, 41);
  }

  updateAndDrawParticles(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.02;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);

      if (p.type === 'heart') {
        ctx.fillStyle = p.color;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❤️', 0, 0);
      }
      ctx.restore();
    }
  }

  /**
   * Phát âm thanh chuông rạp "Kính Coong" bằng Web Audio Synthesizer
   */
  playChimeSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AudioContext();

      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.35); // A5

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.35);
      osc2.start(now + 0.35);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Thêm audio TTS Base64 vào hàng đợi để phát tuần tự
   */
  queueTTSAudio(base64Audio) {
    if (!base64Audio) return;
    this.ttsQueue.push(base64Audio);
    if (!this.isPlayingTts) {
      this.playNextTTS();
    }
  }

  playNextTTS() {
    if (this.ttsQueue.length === 0) {
      this.isPlayingTts = false;
      return;
    }

    this.isPlayingTts = true;
    const base64 = this.ttsQueue.shift();
    const audio = new Audio('data:audio/mp3;base64,' + base64);
    audio.onended = () => {
      this.playNextTTS();
    };
    audio.onerror = () => {
      this.playNextTTS();
    };
    audio.play().catch(() => this.playNextTTS());
  }
}
