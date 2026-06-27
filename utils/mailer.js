const nodemailer = require('nodemailer');

// Lazy-create transporter so missing env vars don't crash on startup
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('[Mailer] SMTP credentials not configured — emails will not be sent.');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: parseInt(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false }
  });

  return _transporter;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@quranoitratacademy.com';
const FROM_EMAIL  = process.env.FROM_EMAIL  || `"Quran O Itrat Academy" <noreply@quranoitratacademy.com>`;
const SITE_URL    = process.env.SITE_URL    || 'http://localhost:5173';

// ── Shared email wrapper ────────────────────────────────────────────────────
const sendMail = async (options) => {
  const transporter = getTransporter();
  if (!transporter) return { skipped: true };
  try {
    const info = await transporter.sendMail({ from: FROM_EMAIL, ...options });
    console.log(`[Mailer] Sent "${options.subject}" → ${options.to} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error('[Mailer] Failed to send email:', err.message);
    return { error: err.message };
  }
};

// ── HTML shell ──────────────────────────────────────────────────────────────
const htmlShell = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5edd8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(10,61,46,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#0a3d2e;padding:28px 36px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
              Quran O Itrat Academy
            </h1>
            <p style="margin:6px 0 0;color:rgba(201,168,76,0.9);font-size:13px;letter-spacing:0.5px;">
              ${title}
            </p>
          </td>
        </tr>

        <!-- Gold bar -->
        <tr><td style="height:3px;background:linear-gradient(to right,#0a3d2e,#c9a84c,#0a3d2e);"></td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px;">${body}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f0;padding:20px 36px;text-align:center;border-top:1px solid rgba(10,61,46,0.08);">
            <p style="margin:0;color:#888;font-size:12px;">
              © ${new Date().getFullYear()} Quran O Itrat Academy · Lahore, Pakistan<br/>
              <a href="${SITE_URL}" style="color:#147a54;text-decoration:none;">Visit Website</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ── Field row helper ────────────────────────────────────────────────────────
const row = (label, value) =>
  value ? `
    <tr>
      <td style="padding:8px 0;vertical-align:top;width:140px;">
        <span style="font-size:12px;font-weight:600;color:#4a6357;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
      </td>
      <td style="padding:8px 0;vertical-align:top;">
        <span style="font-size:14px;color:#1c2e24;">${value}</span>
      </td>
    </tr>` : '';

// ── Section divider ─────────────────────────────────────────────────────────
const divider = (heading) => `
  <tr><td colspan="2" style="padding:16px 0 8px;">
    <p style="margin:0;font-size:11px;font-weight:700;color:#147a54;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid rgba(10,61,46,0.1);padding-bottom:6px;">${heading}</p>
  </td></tr>`;

// ── CONTACT FORM NOTIFICATION ───────────────────────────────────────────────
const sendContactNotification = async (contact) => {
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#1c2e24;">
      A new contact message has been submitted on the academy website.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:10px;padding:16px 20px;">
      ${divider('Sender Details')}
      ${row('Name', contact.name)}
      ${row('Email', `<a href="mailto:${contact.email}" style="color:#147a54;">${contact.email}</a>`)}
      ${row('Phone', contact.phone || '—')}
      ${divider('Message')}
      ${row('Subject', contact.subject)}
      <tr>
        <td colspan="2" style="padding:8px 0;">
          <div style="background:#fff;border:1px solid rgba(10,61,46,0.1);border-radius:8px;padding:14px;font-size:14px;color:#1c2e24;line-height:1.7;white-space:pre-wrap;">${contact.message}</div>
        </td>
      </tr>
      ${divider('Meta')}
      ${row('Submitted', new Date(contact.createdAt || Date.now()).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }))}
      ${row('Status', 'New')}
    </table>

    <p style="margin:24px 0 0;text-align:center;">
      <a href="${SITE_URL}/admin/contacts" style="display:inline-block;background:#0a3d2e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:100px;font-size:14px;font-weight:600;">
        View in Admin Panel
      </a>
    </p>
  `;

  return sendMail({
    to: ADMIN_EMAIL,
    subject: `📬 New Contact Message — ${contact.subject}`,
    html: htmlShell('New Contact Message', body),
    text: `New contact from ${contact.name} (${contact.email})\n\nSubject: ${contact.subject}\n\nMessage:\n${contact.message}`
  });
};

// ── AUTO-REPLY TO CONTACT SENDER ────────────────────────────────────────────
const sendContactAutoReply = async (contact) => {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#1c2e24;">
      As-salamu alaykum, <strong>${contact.name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#4a6357;line-height:1.7;">
      Thank you for reaching out to Quran O Itrat Academy. We have received your message and our team will get back to you within <strong>24 hours</strong>, in sha Allah.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:10px;padding:16px 20px;margin:20px 0;">
      ${divider('Your Message Summary')}
      ${row('Subject', contact.subject)}
      <tr>
        <td colspan="2" style="padding:8px 0;">
          <div style="background:#fff;border:1px solid rgba(10,61,46,0.1);border-radius:8px;padding:14px;font-size:14px;color:#1c2e24;line-height:1.7;white-space:pre-wrap;">${contact.message}</div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#4a6357;">For urgent queries you can also reach us at:</p>
    <p style="margin:0;font-size:14px;color:#147a54;font-weight:600;">+92 (328) 056-3616</p>

    <p style="margin:24px 0 0;font-size:13px;color:#888;">
      Jazak Allah Khayr<br/><strong style="color:#0a3d2e;">Quran O Itrat Academy Team</strong>
    </p>
  `;

  return sendMail({
    to: contact.email,
    subject: `✅ We received your message — Quran O Itrat Academy`,
    html: htmlShell('Message Received', body),
    text: `As-salamu alaykum ${contact.name},\n\nThank you for contacting Quran O Itrat Academy. We've received your message and will respond within 24 hours.\n\nSubject: ${contact.subject}\n\nJazak Allah Khayr,\nQuran O Itrat Academy Team`
  });
};

// ── ADMISSION NOTIFICATION ──────────────────────────────────────────────────
const sendAdmissionNotification = async (admission, courseName) => {
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#1c2e24;">
      A new admission application has been received for <strong>${courseName}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:10px;padding:16px 20px;">
      ${divider('Applicant Details')}
      ${row('Full Name', admission.name)}
      ${row('Email', `<a href="mailto:${admission.email}" style="color:#147a54;">${admission.email}</a>`)}
      ${row('Phone', admission.phone)}
      ${row('Age', admission.age)}
      ${row('Gender', admission.gender ? admission.gender.charAt(0).toUpperCase() + admission.gender.slice(1) : '—')}

      ${divider('Academic Background')}
      ${row('Education', admission.educationLevel || '—')}
      ${row('Experience', admission.previousExperience || 'None stated')}

      ${divider('Application Details')}
      ${row('Applied Course', `<strong>${courseName}</strong>`)}
      ${row('Motivation', admission.motivation || '—')}
      ${admission.message ? row('Additional Note', admission.message) : ''}
      ${divider('Meta')}
      ${row('Submitted', new Date(admission.createdAt || Date.now()).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }))}
      ${row('Status', 'Pending Review')}
    </table>

    <p style="margin:24px 0 0;text-align:center;">
      <a href="${SITE_URL}/admin/admissions" style="display:inline-block;background:#0a3d2e;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:100px;font-size:14px;font-weight:600;">
        Review Application
      </a>
    </p>
  `;

  return sendMail({
    to: ADMIN_EMAIL,
    subject: `🎓 New Admission Application — ${courseName} (${admission.name})`,
    html: htmlShell('New Admission Application', body),
    text: `New admission from ${admission.name} (${admission.email}) for ${courseName}.\n\nPhone: ${admission.phone}\nAge: ${admission.age}\nEducation: ${admission.educationLevel}\nMotivation: ${admission.motivation}`
  });
};

// ── AUTO-REPLY TO APPLICANT ─────────────────────────────────────────────────
const sendAdmissionAutoReply = async (admission, courseName) => {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#1c2e24;">
      As-salamu alaykum, <strong>${admission.name}</strong>,
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#4a6357;line-height:1.7;">
      We have successfully received your admission application for the <strong>${courseName}</strong> course. May Allah bless your intention to seek Islamic knowledge.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#4a6357;line-height:1.7;">
      Our admissions team will review your application and contact you within <strong>2–3 business days</strong>, in sha Allah.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-radius:10px;padding:16px 20px;margin:20px 0;">
      ${divider('Application Summary')}
      ${row('Applicant', admission.name)}
      ${row('Applied For', `<strong>${courseName}</strong>`)}
      ${row('Date', new Date(admission.createdAt || Date.now()).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }))}
    </table>

    <div style="background:#f0f9f4;border:1px solid rgba(20,122,84,0.2);border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#147a54;font-weight:600;">What happens next?</p>
      <ul style="margin:8px 0 0;padding-left:18px;color:#4a6357;font-size:13px;line-height:1.9;">
        <li>Our team will review your application</li>
        <li>You will receive a confirmation email with next steps</li>
        <li>For enquiries: <strong>+92 (328) 056-3616</strong></li>
      </ul>
    </div>

    <p style="margin:0;font-size:13px;color:#888;">
      Jazak Allah Khayr<br/><strong style="color:#0a3d2e;">Admissions Office, Quran O Itrat Academy</strong>
    </p>
  `;

  return sendMail({
    to: admission.email,
    subject: `✅ Application Received — ${courseName} | Quran O Itrat Academy`,
    html: htmlShell('Application Received', body),
    text: `As-salamu alaykum ${admission.name},\n\nYour admission application for "${courseName}" has been received.\n\nWe will contact you within 2-3 business days, in sha Allah.\n\nJazak Allah Khayr,\nAdmissions Office\nQuran O Itrat Academy`
  });
};

module.exports = {
  sendContactNotification,
  sendContactAutoReply,
  sendAdmissionNotification,
  sendAdmissionAutoReply
};
