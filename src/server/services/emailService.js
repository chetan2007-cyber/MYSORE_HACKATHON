const nodemailer = require('nodemailer');
const env = require('../config/env');

/**
 * Creates and returns configured Nodemailer SMTP transporter.
 */
const createTransporter = () => {
  const { host, port, user, password } = env.smtp;
  const secure = port === 465;

  if (user && password) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password
      }
    });
  }

  // Fallback transport
  return {
    sendMail: async (options) => {
      if (env.isProduction || !env.otpDevMode) {
        console.log(`[CivicTrack SMTP] Email dispatched to: ${options.to} | Subject: ${options.subject}`);
      } else {
        // Development simulation mode: display OTP in console
        console.log(`\n======================================================`);
        console.log(` [CivicTrack SMTP Simulation - Development Mode]`);
        console.log(` To:      ${options.to}`);
        console.log(` Subject: ${options.subject}`);
        console.log(` OTP Code Dispatched via Email:`);
        const otpMatch = options.text?.match(/\b\d{6}\b/);
        const code = otpMatch ? otpMatch[0] : 'N/A';
        console.log(` >>> ${code} <<<`);
        console.log(`======================================================\n`);
      }
      return { messageId: `simulated-${Date.now()}` };
    }
  };
};

/**
 * Sends a 6-digit OTP verification code via email.
 */
const sendOtpEmail = async ({ to, name, otp }) => {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || '"CivicTrack Verification" <noreply@civictrack.gov.in>';

    const subject = `CivicTrack Verification Code: ${otp}`;
    const textContent = `Hello ${name},\n\nYour 6-digit verification code for CivicTrack is: ${otp}\n\nThis code expires in 10 minutes.\n\nThank you,\nCivicTrack Operational Team`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .header { background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff; }
          .logo { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8; }
          .tagline { font-size: 12px; color: #94a3b8; margin-top: 4px; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
          .lead { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .otp-box { background: #f0f9ff; border: 1.5px dashed #0284c7; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0369a1; }
          .otp-sub { font-size: 11px; color: #0284c7; margin-top: 6px; font-weight: 500; }
          .expiry-notice { font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-top: 20px; text-align: center; }
          .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CivicTrack</div>
            <div class="tagline">From reported to resolved.</div>
          </div>
          <div class="content">
            <div class="greeting">Hello ${name || 'Citizen'},</div>
            <p class="lead">
              Thank you for registering on <strong>CivicTrack</strong>. To complete your account verification and access the civic issue reporting workflow, please enter the single-use verification code below:
            </p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="otp-sub">VALID FOR 10 MINUTES</div>
            </div>

            <div class="expiry-notice">
              Security Notice: Never share this verification code with municipal officers or third parties. CivicTrack staff will never ask for your code.
            </div>
          </div>
          <div class="footer">
            Municipal Governance &amp; Civic Issue Accountability Platform<br>&copy; 2026 CivicTrack. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[CivicTrack Email Error]: ${error.message}`);
    // If SMTP fails, don't crash registration; log OTP for fallback
    console.log(`[CivicTrack Fallback OTP Log] Code for ${to}: ${otp}`);
    return { success: false, error: error.message };
  }
};

/**
 * Sends an official staff invitation email with a secure one-time setup link.
 */
const sendStaffInvitationEmail = async ({ to, name, role, departmentName, setupUrl }) => {
  try {
    const transporter = createTransporter();
    const from = process.env.SMTP_FROM || '"CivicTrack Operations" <admin@civictrack.gov.in>';
    const roleLabel = role ? role.replace('_', ' ') : 'Staff Member';

    const subject = `CivicTrack Invitation: Activate your ${roleLabel} Account`;
    const textContent = `Hello ${name},\n\nYou have been invited by a CivicTrack Administrator to join the municipal operations team as ${roleLabel}${departmentName ? ` in the ${departmentName} Department` : ''}.\n\nPlease activate your account and configure your secure credentials using the link below:\n\n${setupUrl}\n\nThis invitation link expires in 48 hours.\n\nThank you,\nCivicTrack Operational Administration`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
          .badge { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-top: 6px; }
          .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .cta-box { text-align: center; margin: 28px 0; }
          .cta-btn { display: inline-block; background: #0f172a; color: #ffffff !important; font-size: 13px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CivicTrack</div>
            <div class="badge">Official Municipal Staff Invitation</div>
          </div>
          <div class="greeting">Hello ${name},</div>
          <div class="body-text">
            You have been provisioned by an administrator to join the CivicTrack municipal operations system as a <strong>${roleLabel}</strong>${departmentName ? ` in the <strong>${departmentName}</strong> Department` : ''}.
          </div>
          <div class="body-text">
            Click the secure link below to establish your password and complete your operational profile:
          </div>
          <div class="cta-box">
            <a href="${setupUrl}" class="cta-btn">Establish Password &amp; Activate Account</a>
          </div>
          <div class="body-text" style="font-size: 12px; color: #64748b; text-align: center;">
            Or copy and paste this link into your browser:<br>
            <span style="font-family: monospace; color: #0284c7; word-break: break-all;">${setupUrl}</span>
          </div>
          <div class="footer">
            This invitation link expires in 48 hours.<br>
            Municipal Governance &amp; Civic Issue Accountability Platform<br>&copy; 2026 CivicTrack. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    if (env.isProduction) {
      console.log(`[CivicTrack Staff Invitation] Invitation dispatched to ${to} for role ${roleLabel}`);
    } else {
      console.log(`\n======================================================`);
      console.log(` [CivicTrack Staff Invitation Dispatched]`);
      console.log(` To:         ${to} (${name})`);
      console.log(` Role:       ${roleLabel}`);
      console.log(` Department: ${departmentName || 'N/A'}`);
      console.log(` Setup URL:  ${setupUrl}`);
      console.log(`======================================================\n`);
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[CivicTrack Staff Invitation Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOtpEmail,
  sendStaffInvitationEmail
};
