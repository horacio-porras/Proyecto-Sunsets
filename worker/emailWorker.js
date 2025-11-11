require('dotenv').config();
const Queue = require('bull');
const nodemailer = require('nodemailer');

const redisConfig = process.env.REDIS_URL ? process.env.REDIS_URL : {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASS || undefined
};

const emailQueue = new Queue('emailQueue', redisConfig);

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE === 'true'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  console.warn('No SMTP config found: email worker will not be able to send emails. Configure SMTP_HOST and SMTP_USER in environment.');
}

console.log('Email worker started, listening for jobs...');

emailQueue.process('sendEmail', async (job) => {
  const { to, subject, html, text, from } = job.data;
  if (!transporter) {
    throw new Error('No SMTP transporter configured');
  }

  try {
    await transporter.sendMail({
      from: from || process.env.EMAIL_FROM || 'no-reply@sunsets.local',
      to,
      subject,
      text,
      html
    });
    console.log(`Email enviado a ${to}`);
    return Promise.resolve();
  } catch (err) {
    console.error('Error al enviar email en worker:', err.message || err);
    throw err;
  }
});

// Manejo de errores
emailQueue.on('failed', (job, err) => {
  console.error(`Job failed for ${job.id}:`, err.message || err);
});

process.on('SIGINT', async () => {
  console.log('Shutting down email worker...');
  await emailQueue.close();
  process.exit(0);
});
