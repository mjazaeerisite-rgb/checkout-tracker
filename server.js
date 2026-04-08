const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_URL = process.env.SITE_URL || 'https://www.perfumeuae.shop';

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.send('Checkout Tracker + Telegram Running!');
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

function esc(v) {
  return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const r = await fetch('https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const j = await r.json();
    if (!j.ok) console.error('Telegram error:', j);
  } catch (e) {
    console.error('Telegram failed:', e.message);
  }
}

function buildMsg(d) {
  var map = {
    page_view: '👀 زيارة Checkout',
    email_entered: '📧 إيميل جديد',
    button_click: '🖱️ نقرة زر',
    order_completed: '✅ طلب مكتمل'
  };
  var lines = [
    '<b>' + (map[d.type] || '📦 حدث') + '</b>',
    'الوقت: ' + esc(new Date(d.timestamp).toLocaleString('en-GB', { timeZone: 'Asia/Amman' })),
    'الصفحة: ' + esc(d.page || '')
  ];
  if (d.email) lines.push('الإيميل: ' + esc(d.email));
  if (d.buttonText) lines.push('الزر: ' + esc(d.buttonText));
  if (d.referrer) lines.push('المصدر: ' + esc(d.referrer));
  if (Array.isArray(d.cartItems) && d.cartItems.length) {
    var items = d.cartItems.slice(0, 5).map(function(item, i) {
      return (i+1) + ') ' + esc(item.name || 'منتج') + ' | ' + esc(item.price || '-');
    });
    lines.push('السلة:\n' + items.join('\n'));
  }
  return lines.join('\n');
}

app.post('/api/checkout-event', async (req, res) => {
  var data = req.body || {};
  data.timestamp = new Date().toISOString();
  console.log('event:', data.type);
  io.emit('checkout_event', data);
  await sendTelegram(buildMsg(data));
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);
  socket.on('disconnect', () => console.log('Disconnected:', socket.id));
});

server.listen(PORT, () => console.log('Running on port ' + PORT));
Commit new file
