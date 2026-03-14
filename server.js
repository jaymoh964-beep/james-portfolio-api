/**
 * James Shio Portfolio — Contact API v3
 * Using Resend.com — works instantly, no Gmail issues
 */

const express  = require('express');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'] }));
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// ── SEND EMAIL VIA RESEND.COM API ───────────────────────────
async function sendEmail({ to, from, subject, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, reply_to: replyTo }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Resend API error');
  return data;
}

// ── HEALTH CHECK ────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  status: 'ok',
  version: '3.0.0',
  service: 'Resend.com',
  resend_configured: !!process.env.RESEND_API_KEY,
  notify_email: process.env.NOTIFY_EMAIL || 'NOT SET',
}));

// ── TEST EMAIL ──────────────────────────────────────────────
app.get('/api/test-email', async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.json({ success: false, error: 'RESEND_API_KEY not set in Render environment' });
  }
  try {
    await sendEmail({
      from: 'Portfolio <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL || 'jaymoh964@gmail.com',
      subject: '✅ Portfolio Test Email — It Works!',
      html: `<h2 style="color:#7C3AED">🎉 Your portfolio email is working!</h2>
             <p>Sent via Resend.com at ${new Date().toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}</p>`,
    });
    res.json({ success: true, message: `✅ Test email sent — check ${process.env.NOTIFY_EMAIL || 'jaymoh964@gmail.com'}` });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});

// ── CONTACT FORM ────────────────────────────────────────────
app.post('/api/contact', limiter, async (req, res) => {
  const { name, email, subject, message, phone } = req.body;
  console.log(`📬 Contact from: ${name} <${email}>`);

  if (!name || !email || !message)
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  if (message.length < 10)
    return res.status(400).json({ success: false, message: 'Message too short.' });

  const sub  = subject || 'New Portfolio Inquiry';
  const time = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  const notifyTo = process.env.NOTIFY_EMAIL || 'jaymoh964@gmail.com';

  const toJamesHTML = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0C0C18;color:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,.3)">
    <div style="background:linear-gradient(135deg,#7C3AED,#06B6D4);padding:26px 30px">
      <h1 style="margin:0;font-size:1.3rem">📬 New Portfolio Message</h1>
      <p style="margin:5px 0 0;opacity:.8;font-size:.82rem">${time} · Nairobi</p>
    </div>
    <div style="padding:26px 30px">
      <p style="margin:0 0 6px;font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.4)">FROM</p>
      <div style="background:rgba(255,255,255,.05);border-radius:9px;padding:12px 16px;margin-bottom:16px">${name} — ${email}</div>
      ${phone ? `<p style="margin:0 0 6px;font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.4)">PHONE</p><div style="background:rgba(255,255,255,.05);border-radius:9px;padding:12px 16px;margin-bottom:16px">${phone}</div>` : ''}
      <p style="margin:0 0 6px;font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.4)">SUBJECT</p>
      <div style="background:rgba(255,255,255,.05);border-radius:9px;padding:12px 16px;margin-bottom:16px">${sub}</div>
      <p style="margin:0 0 6px;font-size:.65rem;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.4)">MESSAGE</p>
      <div style="background:rgba(255,255,255,.05);border-radius:9px;padding:12px 16px;margin-bottom:20px;white-space:pre-wrap;line-height:1.7">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <a href="mailto:${email}?subject=Re: ${sub}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#06B6D4);color:#fff;text-decoration:none;padding:11px 26px;border-radius:50px;font-weight:700;font-size:.85rem">↩ Reply to ${name}</a>
    </div>
  </div>`;

  const toClientHTML = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0C0C18;color:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,.2)">
    <div style="background:linear-gradient(135deg,#7C3AED,#4F46E5,#06B6D4);padding:34px 30px;text-align:center">
      <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.2);display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:900;margin-bottom:12px;border:2px solid rgba(255,255,255,.3)">JS</div>
      <h1 style="margin:0;font-size:1.3rem">Got your message, ${name}! 🎉</h1>
      <p style="margin:6px 0 0;opacity:.85">I'll reply within 24 hours</p>
    </div>
    <div style="padding:28px 30px">
      <p style="line-height:1.8;color:rgba(255,255,255,.8);font-size:.9rem">Hey <strong>${name}</strong>,</p>
      <p style="line-height:1.8;color:rgba(255,255,255,.8);font-size:.9rem">Thanks for reaching out about <strong>"${sub}"</strong>. I'm excited to connect and will reply shortly!</p>
      <p style="font-size:.82rem;color:rgba(255,255,255,.4);margin-top:20px">Urgent? WhatsApp: <a href="https://wa.me/254771442830" style="color:#7C3AED">+254 771 442 830</a></p>
    </div>
    <div style="background:rgba(124,58,237,.05);padding:14px 30px;text-align:center;font-size:.7rem;color:rgba(255,255,255,.3);border-top:1px solid rgba(255,255,255,.05)">
      James Shio · AI & Full-Stack Engineer · Nairobi, Kenya
    </div>
  </div>`;

  try {
    // Send to James
    await sendEmail({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: notifyTo,
      replyTo: email,
      subject: `📬 [Portfolio] ${sub} — from ${name}`,
      html: toJamesHTML,
    });

    // Auto-reply to client
    await sendEmail({
      from: 'James Shio <onboarding@resend.dev>',
      to: email,
      subject: `Got your message, ${name}! 🚀`,
      html: toClientHTML,
    });

    console.log(`✅ Emails sent via Resend — ${name} <${email}>`);
    return res.json({ success: true, message: 'Message sent! Check your inbox for a confirmation.' });

  } catch(err) {
    console.error('❌ Resend error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to send. Please contact: jaymoh964@gmail.com or WhatsApp +254771442830',
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 James Shio Portfolio API v3  |  Port: ${PORT}`);
  console.log(`   Service     : Resend.com`);
  console.log(`   API Key     : ${process.env.RESEND_API_KEY ? '✅ set' : '❌ NOT SET'}`);
  console.log(`   Notify Email: ${process.env.NOTIFY_EMAIL || 'jaymoh964@gmail.com'}\n`);
});
