import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-email-secret');
    const expectedSecret = process.env.FRONTEND_EMAIL_SECRET;

    if (!expectedSecret || authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, text, html, sender_type = 'primary', category = 'default' } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine sender address based on category for primary domain
    let fromEmail = 'noreply@humorphichlabs.club';
    if (category === 'notifications') {
      fromEmail = 'notification@humorphichlabs.club';
    } else if (category === 'tasks') {
      fromEmail = 'tasks@humorphichlabs.club';
    } else if (category === 'meetings') {
      fromEmail = 'meetings@humorphichlabs.club';
    } else if (category === 'auth') {
      fromEmail = 'auth@humorphichlabs.club';
    }

    // --- PRIMARY SENDER: Resend HTTP API ---
    if (sender_type === 'primary') {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured on Vercel/Cloudflare' }, { status: 500 });
      }

      const resend = new Resend(resendApiKey);
      
      // In testing/onboarding mode, Resend requires using 'onboarding@resend.dev'
      const actualFrom = process.env.RESEND_FROM_EMAIL || fromEmail;
      
      const { data, error } = await resend.emails.send({
        from: actualFrom,
        to: [to],
        subject: subject,
        text: text || '',
        html: html || '',
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, messageId: data?.id });
    }

    // --- SECONDARY SENDER: Hotmail SMTP via Nodemailer ---
    if (sender_type === 'secondary') {
      const host = process.env.EMAIL_HOST || 'smtp-mail.outlook.com';
      const port = parseInt(process.env.EMAIL_PORT || '587');
      const user = process.env.EMAIL_HOST_USER;
      const pass = process.env.EMAIL_HOST_PASSWORD;

      if (!user || !pass) {
        return NextResponse.json({ error: 'Hotmail SMTP credentials not configured' }, { status: 500 });
      }

      let transporter;
      try {
        const nodemailer = await import('nodemailer');
        transporter = nodemailer.default.createTransport({
          host,
          port,
          secure: false, // TLS
          auth: { user, pass },
          tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
          }
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: 'SMTP sending is not supported on this platform/runtime (Edge Runtime). Use Resend (primary) instead.' },
          { status: 500 }
        );
      }

      const info = await transporter.sendMail({
        from: user,
        to,
        subject,
        text: text || '',
        html: html || '',
      });

      return NextResponse.json({ success: true, messageId: info.messageId });
    }

    // --- TERTIARY SENDER: Gmail SMTP via Nodemailer ---
    if (sender_type === 'tertiary') {
      const host = process.env.SECONDARY_EMAIL_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.SECONDARY_EMAIL_PORT || '587');
      const user = process.env.SECONDARY_EMAIL_HOST_USER;
      const pass = process.env.SECONDARY_EMAIL_HOST_PASSWORD;

      if (!user || !pass) {
        return NextResponse.json({ error: 'Gmail SMTP credentials not configured' }, { status: 500 });
      }

      let transporter;
      try {
        const nodemailer = await import('nodemailer');
        transporter = nodemailer.default.createTransport({
          host,
          port,
          secure: false, // TLS
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false
          }
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: 'SMTP sending is not supported on this platform/runtime (Edge Runtime). Use Resend (primary) instead.' },
          { status: 500 }
        );
      }

      const info = await transporter.sendMail({
        from: user,
        to,
        subject,
        text: text || '',
        html: html || '',
      });

      return NextResponse.json({ success: true, messageId: info.messageId });
    }

    return NextResponse.json({ error: 'Invalid sender_type' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in send-email API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
