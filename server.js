/**
 * James Shio Portfolio — Contact API v2
 * Fixed: Gmail SSL, CORS, debug endpoint, auto space-strip on password
 */

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── CORS — allow ALL origins ────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'] }));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── RATE LIMIT ──────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// ── CREATE TRANSPORTER (strips spaces from password) ────────
function makeTransporter() {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').replace(/\s/g, ''); // auto-remove spaces
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// Test on startup
const t0 = makeTransporter();
if (t0) {
  t0.verify(err => {
    if (err) {
      console.error('❌ Gmail error:', err.message);
      console.log('   EMAIL_USER:', process.env.EMAIL_USER);
      console.log('   EMAIL_PASS length:', (process.env.EMAIL_PASS||'').replace(/\s/g,'').length);
    } else {
      console.log('✅ Gmail ready — sending as:', process.env.EMAIL_USER);
    }
  });
} else {
  console.log('⚠️  EMAIL_USER / EMAIL_PASS not set');
}

// ── HEALTH CHECK ────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  status: 'ok', version: '2.0.0',
  email_user: process.env.EMAIL_USER || 'NOT SET',
  pass_length: (process.env.EMAIL_PASS||'').replace(/\s/g,'').length,
}));

// ── TEST EMAIL (open in browser to verify) ──────────────────
// https://james-portfolio-api.onrender.com/api/test-email
app.get('/api/test-email', async (req, res) => {
  const tr = makeTransporter();
  if (!tr) return res.json({ success: false, error: 'EMAIL_USER or EMAIL_PASS not set in Render environment' });
  try {
    await tr.sendMail({
      from: `"Portfolio Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: '✅ Portfolio API Test — It Works!',
      html: `<h2 style="color:#7C3AED">🎉 Email is working!</h2><p>Your James Shio portfolio contact form is correctly configured.</p><p>Time: ${new Date().toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}</p>`,
      text: 'Portfolio email test — it works!',
    });
    res.json({ success: true, message: `✅ Test email sent to ${process.env.EMAIL_USER} — check your inbox!` });
  } catch(err) {
    res.json({ success: false, error: err.message, tip: 'Make sure EMAIL_PASS is a 16-char Gmail App Password with no spaces' });
  }
});

// ── CONTACT FORM ────────────────────────────────────────────
app.post('/api/contact', limiter, async (req, res) => {
  const { name, email, subject, message, phone } = req.body;
  console.log(`📬 Contact: ${name} <${email}>`);

  if (!name || !email || !message)
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  if (message.length < 10)
    return res.status(400).json({ success: false, message: 'Message too short.' });

  const sub  = subject || 'New Portfolio Inquiry';
  const time = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

  const toJamesHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#04040C;color:#fff;margin:0;padding:20px}.wrap{max-width:560px;margin:0 auto;background:#0C0C18;border:1px solid rgba(124,58,237,.3);border-radius:16px;overflow:hidden}.head{background:linear-gradient(135deg,#7C3AED,#06B6D4);padding:26px 30px}.head h1{margin:0;font-size:1.3rem}.head p{margin:5px 0 0;opacity:.8;font-size:.82rem}.body{padding:26px 30px}.f{margin-bottom:16px}.l{font-size:.62rem;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.4);margin-bottom:5px}.v{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:11px 14px;font-size:.88rem;word-break:break-word;white-space:pre-wrap}.cta{display:inline-block;margin-top:18px;background:linear-gradient(135deg,#7C3AED,#06B6D4);color:#fff;text-decoration:none;padding:11px 26px;border-radius:50px;font-weight:700;font-size:.85rem}.foot{background:rgba(124,58,237,.06);padding:14px 30px;text-align:center;font-size:.7rem;color:rgba(255,255,255,.3);border-top:1px solid rgba(255,255,255,.05)}</style></head><body><div class="wrap"><div class="head"><h1>📬 New Portfolio Message</h1><p>${time} · Nairobi</p></div><div class="body"><div class="f"><div class="l">From</div><div class="v">${name} — ${email}</div></div>${phone?`<div class="f"><div class="l">Phone</div><div class="v">${phone}</div></div>`:''}<div class="f"><div class="l">Subject</div><div class="v">${sub}</div></div><div class="f"><div class="l">Message</div><div class="v">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div><a href="mailto:${email}?subject=Re: ${sub}" class="cta">↩ Reply to ${name}</a></div><div class="foot">James Shio Portfolio API v2</div></div></body></html>`;

  const toClientHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;background:#04040C;color:#fff;margin:0;padding:20px}.wrap{max-width:560px;margin:0 auto;background:#0C0C18;border:1px solid rgba(124,58,237,.2);border-radius:16px;overflow:hidden}.head{background:linear-gradient(135deg,#7C3AED,#4F46E5,#06B6D4);padding:34px 30px;text-align:center}.ava{width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:900;margin-bottom:12px;border:2px solid rgba(255,255,255,.3)}.head h1{margin:0;font-size:1.3rem}.head p{margin:5px 0 0;opacity:.85;font-size:.85rem}.body{padding:28px 30px}.body p{line-height:1.8;color:rgba(255,255,255,.8);margin-bottom:12px;font-size:.88rem}b{color:#fff}.info{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.ic{flex:1;min-width:120px;background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.2);border-radius:10px;padding:12px;text-align:center}.ic .i{font-size:1.2rem;margin-bottom:4px}.ic .il{font-size:.62rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px}.ic .iv{font-size:.82rem;font-weight:700}.foot{background:rgba(124,58,237,.05);padding:14px 30px;text-align:center;font-size:.7rem;color:rgba(255,255,255,.3);border-top:1px solid rgba(255,255,255,.05)}</style></head><body><div class="wrap"><div class="head"><div class="ava">JS</div><h1>Got your message, ${name}! 🎉</h1><p>I'll reply within 24 hours</p></div><div class="body"><p>Hey <b>${name}</b>,</p><p>Thanks for reaching out about <b>"${sub}"</b>. I'm excited to connect!</p><div class="info"><div class="ic"><div class="i">⏱</div><div class="il">Response</div><div class="iv">24h</div></div><div class="ic"><div class="i">📍</div><div class="il">Location</div><div class="iv">Nairobi, KE</div></div><div class="ic"><div class="i">✅</div><div class="il">Status</div><div class="iv">Available</div></div></div><p style="font-size:.8rem;color:rgba(255,255,255,.4)">Urgent? WhatsApp: +254 771 442 830</p></div><div class="foot">James Shio · AI & Full-Stack Engineer · Nairobi, Kenya</div></div></body></html>`;

  try {
    const tr = makeTransporter();
    if (!tr) {
      console.log('📋 [No email] Logged contact from:', name, email);
      return res.json({ success: true, message: 'Message received! James will contact you shortly.' });
    }
    await tr.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to:   process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
      replyTo: email,
      subject: `📬 [Portfolio] ${sub} — from ${name}`,
      html: toJamesHTML,
      text: `From: ${name} <${email}>\nSubject: ${sub}\n\n${message}`,
    });
    await tr.sendMail({
      from: `"James Shio" <${process.env.EMAIL_USER}>`,
      to:   email,
      subject: `Got your message, ${name}! 🚀`,
      html: toClientHTML,
      text: `Hi ${name}, thanks for reaching out! I'll reply within 24 hours.\n\n— James Shio\n+254 771 442 830`,
    });
    console.log(`✅ Emails sent to James + ${name}`);
    return res.json({ success: true, message: 'Message sent! Check your inbox for a confirmation.' });
  } catch(err) {
    console.error('❌ Email error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send. Please contact: jaymoh964@gmail.com or WhatsApp +254771442830', debug: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 James Shio Portfolio API v2  |  Port: ${PORT}`);
  console.log(`   EMAIL_USER : ${process.env.EMAIL_USER || '❌ NOT SET'}`);
  console.log(`   EMAIL_PASS : ${process.env.EMAIL_PASS ? '✅ ' + process.env.EMAIL_PASS.replace(/\s/g,'').length + ' chars' : '❌ NOT SET'}`);
  console.log(`   Test URL   : GET /api/test-email\n`);
});
