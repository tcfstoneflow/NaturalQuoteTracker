import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { EmailJobData } from '../jobs/queue.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.gmail.com',
  port: env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendEmail(data: EmailJobData): Promise<void> {
  try {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured, skipping email send');
      return;
    }

    const mailOptions = {
      from: env.SMTP_USER,
      to: data.to,
      subject: data.subject,
      html: data.html,
      attachments: data.attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    logger.info('Email sent successfully', { 
      to: data.to, 
      subject: data.subject,
      messageId: result.messageId 
    });
  } catch (error) {
    logger.error('Failed to send email', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      to: data.to,
      subject: data.subject 
    });
    throw error;
  }
}