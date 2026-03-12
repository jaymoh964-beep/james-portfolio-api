/**
 * James Shio Portfolio — Contact API Backend
 * Stack: Express + Nodemailer
 * Sends contact form submissions to James's email
 */

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit: max 5 contact messages per IP per 15 minutes
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages sent. Please try again later.' },
});

// ── EMAIL TRANSPORTER ───────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',  // Change to 'outlook', 'yahoo', etc. if needed
  auth: {
    user: process.env.EMAIL_USER,    // your Gmail address
    pass: process.env.EMAIL_PASS,    // Gmail App Password (not your login password)
  },
});

// Verify transporter on startup
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ Email transporter error:', err.message);
    console.log('   → Make sure EMAIL_USER and EMAIL_PASS are set in .env');
  } else {
    console.log('✅ Email transporter ready');
  }
});

// ── ROUTES ──────────────────────────────────────────────────

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'James Shio Portfolio API', version: '1.0.0' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    email: process.env.EMAIL_USER ? '✅ configured' : '❌ not configured',
    time: new Date().toISOString(),
  });
});

// ── CONTACT FORM ENDPOINT ───────────────────────────────────
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, subject, message, phone } = req.body;

  // Validate
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }
  if (message.length < 10) {
    return res.status(400).json({ success: false, message: 'Message is too short.' });
  }

  const subjectLine = subject || 'New Portfolio Inquiry';
  const timestamp   = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

  // ── EMAIL TO JAMES ─────────────────────────────────────────
  const toJamesHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #04040C; color: #fff; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #0C0C18; border: 1px solid rgba(124,58,237,0.3); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7C3AED, #4F46E5, #06B6D4); padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; opacity: 0.85; font-size: 0.9rem; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
    .value { font-size: 1rem; color: #fff; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; word-break: break-word; }
    .message-box { font-size: 0.95rem; line-height: 1.7; white-space: pre-wrap; }
    .footer { background: rgba(124,58,237,0.08); padding: 20px 32px; text-align: center; font-size: 0.78rem; color: rgba(255,255,255,0.35); border-top: 1px solid rgba(255,255,255,0.06); }
    .cta { display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #7C3AED, #06B6D4); color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 50px; font-weight: 700; font-size: 0.875rem; }
    .badge { display: inline-block; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #10B981; border-radius: 50px; padding: 3px 12px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📬 New Portfolio Inquiry</h1>
      <p>Someone reached out through jamesshio.dev</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">From</div>
        <div class="value">${name} &nbsp; <span style="color:rgba(255,255,255,0.4);font-size:0.85rem">${email}</span></div>
      </div>
      ${phone ? `<div class="field"><div class="label">Phone</div><div class="value">${phone}</div></div>` : ''}
      <div class="field">
        <div class="label">Subject</div>
        <div class="value">${subjectLine}</div>
      </div>
      <div class="field">
        <div class="label">Message</div>
        <div class="value message-box">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      </div>
      <div class="field">
        <div class="label">Received</div>
        <div class="value" style="font-size:0.85rem;color:rgba(255,255,255,0.6)">${timestamp} (Nairobi)</div>
      </div>
      <div style="text-align:center;margin-top:24px">
        <a href="mailto:${email}?subject=Re: ${subjectLine}" class="cta">↩ Reply to ${name}</a>
      </div>
    </div>
    <div class="footer">
      <span class="badge">Portfolio API v1.0</span><br>
      Sent automatically from your portfolio contact form
    </div>
  </div>
</body>
</html>`;

  // ── AUTO-REPLY TO CLIENT ───────────────────────────────────
  const toClientHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #04040C; color: #fff; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #0C0C18; border: 1px solid rgba(124,58,237,0.2); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7C3AED, #4F46E5, #06B6D4); padding: 40px 32px; text-align: center; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.2); display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; margin-bottom: 16px; border: 2px solid rgba(255,255,255,0.3); }
    .header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }
    .header p  { margin: 8px 0 0; opacity: 0.85; }
    .body { padding: 36px; }
    .body p { line-height: 1.8; color: rgba(255,255,255,0.8); margin-bottom: 16px; }
    .highlight { color: #fff; font-weight: 700; }
    .info-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 24px 0; }
    .info-card { flex: 1; min-width: 140px; background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; padding: 16px; text-align: center; }
    .info-card .icon { font-size: 1.4rem; margin-bottom: 6px; }
    .info-card .label { font-size: 0.72rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .info-card .val { font-size: 0.9rem; font-weight: 700; }
    .cta { display: block; text-align: center; margin: 24px 0 0; background: linear-gradient(135deg, #7C3AED, #06B6D4); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: 700; font-size: 0.9rem; }
    .footer { background: rgba(124,58,237,0.06); padding: 20px 32px; text-align: center; font-size: 0.78rem; color: rgba(255,255,255,0.3); border-top: 1px solid rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="avatar">JS</div>
      <h1>Got your message, ${name}! 🎉</h1>
      <p>I'll get back to you within 24 hours</p>
    </div>
    <div class="body">
      <p>Hey <span class="highlight">${name}</span>,</p>
      <p>Thanks for reaching out! I've received your message about <span class="highlight">"${subjectLine}"</span> and I'm excited to connect.</p>
      <p>I typically respond within <span class="highlight">24 hours</span>. In the meantime, feel free to explore my work or connect on socials.</p>
      <div class="info-row">
        <div class="info-card">
          <div class="icon">⏱</div>
          <div class="label">Response Time</div>
          <div class="val">Within 24h</div>
        </div>
        <div class="info-card">
          <div class="icon">📍</div>
          <div class="label">Based In</div>
          <div class="val">Nairobi, KE</div>
        </div>
        <div class="info-card">
          <div class="icon">✅</div>
          <div class="label">Status</div>
          <div class="val">Available</div>
        </div>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:0.85rem">If this is urgent, WhatsApp works fastest.</p>
      <a href="https://jamesshio.dev" class="cta">View My Portfolio →</a>
    </div>
    <div class="footer">
      James Shio · AI & Full-Stack Engineer · Nairobi, Kenya<br>
      © ${new Date().getFullYear()} James Shio
    </div>
  </div>
</body>
</html>`;

  try {
    // Send to James
    await transporter.sendMail({
      from:    `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to:      process.env.NOTIFY_EMAIL || process.env.EMAIL_USER,
      replyTo: email,
      subject: `📬 [Portfolio] ${subjectLine} — from ${name}`,
      html:    toJamesHTML,
      text:    `New message from ${name} (${email}):\n\n${message}`,
    });

    // Send auto-reply to client
    await transporter.sendMail({
      from:    `"James Shio" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Got your message, ${name}! 🚀`,
      html:    toClientHTML,
      text:    `Hi ${name}, thanks for reaching out! I'll get back to you within 24 hours.\n\n— James Shio`,
    });

    console.log(`✅ Contact from ${name} <${email}> → email sent`);
    return res.json({ success: true, message: 'Message sent! Check your inbox for a confirmation.' });

  } catch (err) {
    console.error('❌ Email send error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send message. Please email directly: james@jamesshio.dev' });
  }
});

// ── START ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   James Shio Portfolio API  v1.0     ║
║   Port: ${PORT}                          ║
║   Contact endpoint: /api/contact     ║
╚══════════════════════════════════════╝
  `);
});
