const nodemailer = require('nodemailer')

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    const mailOptions = {
      from: `"RealNest" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log(`Email sent: ${info.messageId}`)
    return info
  } catch (error) {
    console.error(`Email sending failed: ${error.message}`)
    throw error
  }
}

const welcomeEmail = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:40px 32px;text-align:center}
      .logo{width:52px;height:52px;background:white;border-radius:12px;display:inline-block;line-height:52px;font-size:24px;font-weight:800;color:#1d4ed8;margin-bottom:16px}
      .header h1{color:white;font-size:24px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:20px;display:block}
      .body h2{font-size:22px;color:#0f172a;margin:0 0 14px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .btn{display:inline-block;background:#1d4ed8;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">R</div>
          <h1>Welcome to RealNest!</h1>
          <p>Your journey to the perfect home starts here</p>
        </div>
        <div class="body">
          <span class="emoji">🏠</span>
          <h2>Hello, ${name}!</h2>
          <p>Your RealNest account has been created successfully. Start browsing thousands of properties today.</p>
          <a href="${process.env.CLIENT_URL}/login" class="btn">Start Exploring</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const brokerApplicationEmail = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:36px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 14px}
      .info-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;text-align:left;margin:20px 0}
      .info-box strong{display:block;font-size:15px;color:#1d4ed8;margin-bottom:8px}
      .info-box p{margin:0;font-size:14px;color:#1e40af}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Broker Application Received</h1>
          <p>Thank you for applying to join RealNest</p>
        </div>
        <div class="body">
          <span class="emoji">📋</span>
          <h2>Hello, ${name}!</h2>
          <p>We have received your broker application and our team is currently reviewing your details.</p>
          <div class="info-box">
            <strong>What happens next?</strong>
            <p>Our admin team will verify your professional details within 24 to 48 business hours. You will receive an approval or rejection email with further instructions.</p>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const adminBrokerNotificationEmail = ({ name, email, phone, city, experience }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#7c3aed,#0f172a);padding:32px;text-align:center}
      .header h1{color:white;font-size:20px;margin:0}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:8px 0 0}
      .body{padding:32px}
      .field{margin-bottom:16px}
      .field-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
      .field-value{font-size:15px;color:#0f172a;font-weight:500;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Broker Application</h1>
          <p>A new broker has applied and is waiting for your approval</p>
        </div>
        <div class="body">
          <div class="field"><div class="field-label">Full Name</div><div class="field-value">${name}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${email}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${phone || 'Not provided'}</div></div>
          <div class="field"><div class="field-label">City</div><div class="field-value">${city || 'Not provided'}</div></div>
          <div class="field"><div class="field-label">Experience</div><div class="field-value">${experience || 'Not provided'}</div></div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest Admin Notification</p></div>
      </div>
    </body>
    </html>
  `
}

const brokerApprovedEmail = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#059669,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:56px;margin-bottom:16px;display:block}
      .body h2{font-size:22px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .btn{display:inline-block;background:#059669;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Approved!</h1>
          <p>Congratulations! You are now a verified RealNest broker</p>
        </div>
        <div class="body">
          <span class="emoji">🎉</span>
          <h2>Congratulations, ${name}!</h2>
          <p>Your broker application has been approved. You can now log in to your broker dashboard and start listing properties.</p>
          <a href="${process.env.CLIENT_URL}/login" class="btn">Login to Your Dashboard</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const brokerRejectedEmail = ({ name, reason }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#dc2626,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 14px}
      .reason-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;text-align:left;margin:20px 0}
      .reason-box strong{display:block;color:#991b1b;margin-bottom:6px;font-size:14px}
      .reason-box p{margin:0;font-size:14px;color:#7f1d1d}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Not Approved</h1>
          <p>We were unable to approve your broker application</p>
        </div>
        <div class="body">
          <span class="emoji">😔</span>
          <h2>Dear ${name},</h2>
          <p>After reviewing your broker application, our team was unable to approve it at this time.</p>
          <div class="reason-box">
            <strong>Reason for rejection:</strong>
            <p>${reason || 'Your application did not meet our current requirements.'}</p>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const propertyApprovedEmail = ({ brokerName, propertyTitle, propertyCity }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#059669,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .property-box{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:20px;text-align:left;margin:20px 0}
      .property-box strong{display:block;font-size:16px;color:#065f46;margin-bottom:6px}
      .property-box p{margin:0;font-size:14px;color:#047857}
      .btn{display:inline-block;background:#059669;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Property Approved!</h1>
          <p>Your property listing is now live on RealNest</p>
        </div>
        <div class="body">
          <span class="emoji">🏠</span>
          <h2>Great news, ${brokerName}!</h2>
          <p>Your property listing has been reviewed and approved. It is now live and visible to buyers and tenants.</p>
          <div class="property-box">
            <strong>${propertyTitle}</strong>
            <p>📍 ${propertyCity}</p>
          </div>
          <a href="${process.env.CLIENT_URL}/dashboard/broker" class="btn">View Your Listings</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const propertyRejectedEmail = ({ brokerName, propertyTitle, reason }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#dc2626,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 14px}
      .reason-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;text-align:left;margin:16px 0}
      .reason-box strong{display:block;color:#991b1b;margin-bottom:6px;font-size:14px}
      .reason-box p{margin:0;font-size:14px;color:#7f1d1d}
      .btn{display:inline-block;background:#1d4ed8;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:12px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Property Not Approved</h1>
          <p>Your property listing needs some changes</p>
        </div>
        <div class="body">
          <span class="emoji">📋</span>
          <h2>Dear ${brokerName},</h2>
          <p>After reviewing your property listing, our admin team was unable to approve it at this time.</p>
          <div class="reason-box">
            <strong>Reason for rejection:</strong>
            <p>${reason || 'The listing did not meet our quality standards.'}</p>
          </div>
          <a href="${process.env.CLIENT_URL}/dashboard/broker" class="btn">Update Your Listing</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const tourConfirmedEmail = ({ userName, propertyTitle, tourDate, tourTime, brokerName, brokerPhone }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#059669,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .details-box{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:20px;text-align:left;margin:20px 0}
      .detail-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #d1fae5;font-size:14px;color:#065f46}
      .detail-row:last-child{border-bottom:none}
      .detail-label{font-weight:700;min-width:100px}
      .btn{display:inline-block;background:#059669;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Tour Confirmed!</h1>
          <p>Your property tour has been confirmed by the broker</p>
        </div>
        <div class="body">
          <span class="emoji">🎉</span>
          <h2>Great news, ${userName}!</h2>
          <p>Your tour request has been confirmed. Please find the details below.</p>
          <div class="details-box">
            <div class="detail-row"><span class="detail-label">🏠 Property:</span><span>${propertyTitle}</span></div>
            <div class="detail-row"><span class="detail-label">📅 Date:</span><span>${new Date(tourDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            <div class="detail-row"><span class="detail-label">⏰ Time:</span><span>${tourTime || '10:00 AM'}</span></div>
            <div class="detail-row"><span class="detail-label">👤 Broker:</span><span>${brokerName}</span></div>
            ${brokerPhone ? `<div class="detail-row"><span class="detail-label">📞 Contact:</span><span>${brokerPhone}</span></div>` : ''}
          </div>
          <a href="${process.env.CLIENT_URL}/dashboard/user/bookings" class="btn">View My Bookings</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const tourCancelledEmail = ({ userName, propertyTitle, tourDate, note }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#dc2626,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 14px}
      .details-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:left;margin:16px 0}
      .note-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;text-align:left;margin:16px 0}
      .note-box strong{display:block;color:#991b1b;margin-bottom:6px;font-size:14px}
      .note-box p{margin:0;font-size:14px;color:#7f1d1d}
      .btn{display:inline-block;background:#1d4ed8;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:12px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Tour Cancelled</h1></div>
        <div class="body">
          <span class="emoji">😔</span>
          <h2>Dear ${userName},</h2>
          <p>Your scheduled property tour has been cancelled by the broker.</p>
          <div class="details-box">
            <p>🏠 <strong>${propertyTitle}</strong></p>
            <p style="margin-top:6px">📅 ${new Date(tourDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          ${note ? `<div class="note-box"><strong>Reason:</strong><p>${note}</p></div>` : ''}
          <a href="${process.env.CLIENT_URL}/dashboard/user/browse" class="btn">Browse Properties</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const tourCompletedEmail = ({ userName, propertyTitle, brokerName }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#0d9488,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .review-box{background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:20px;margin:20px 0}
      .review-box p{margin:0;font-size:14px;color:#0f766e;line-height:1.7}
      .btn{display:inline-block;background:#0d9488;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Tour Completed!</h1></div>
        <div class="body">
          <span class="emoji">🏠</span>
          <h2>Thank you, ${userName}!</h2>
          <p>Your tour of <strong>${propertyTitle}</strong> with broker <strong>${brokerName}</strong> has been completed.</p>
          <div class="review-box">
            <p>⭐ We would love to hear your feedback! Please take a moment to rate your experience.</p>
          </div>
          <a href="${process.env.CLIENT_URL}/dashboard/user/bookings" class="btn">Leave a Review</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const tourBookedUserEmail = ({ userName, propertyTitle, propertyCity, tourDate, tourTime, brokerName }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#4f46e5,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:0}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .details-box{background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:20px;text-align:left;margin:20px 0}
      .detail-row{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #e0e7ff;font-size:14px;color:#3730a3}
      .detail-row:last-child{border-bottom:none}
      .detail-label{font-weight:700;min-width:110px;flex-shrink:0}
      .status-box{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:13px;color:#92400e;text-align:left}
      .btn{display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin:16px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Tour Booking Confirmed!</h1>
          <p>Your tour request has been submitted successfully</p>
        </div>
        <div class="body">
          <span class="emoji">📅</span>
          <h2>Hello, ${userName}!</h2>
          <p>Your tour booking request has been submitted. The broker will review and confirm your request shortly.</p>
          <div class="details-box">
            <div class="detail-row"><span class="detail-label">🏠 Property:</span><span>${propertyTitle}</span></div>
            <div class="detail-row"><span class="detail-label">📍 Location:</span><span>${propertyCity}</span></div>
            <div class="detail-row"><span class="detail-label">📅 Date:</span><span>${new Date(tourDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
            <div class="detail-row"><span class="detail-label">⏰ Time:</span><span>${tourTime || '10:00 AM'}</span></div>
            <div class="detail-row"><span class="detail-label">👤 Broker:</span><span>${brokerName}</span></div>
          </div>
          <div class="status-box">
            ⏳ <strong>Status: Pending Confirmation</strong><br/>
            The broker will confirm or suggest an alternate time. You will receive another email once confirmed.
          </div>
          <a href="${process.env.CLIENT_URL}/dashboard/user/bookings" class="btn">View My Bookings</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const tourBookedBrokerEmail = ({ brokerName, userName, userPhone, userEmail, propertyTitle, tourDate, tourTime, notes }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#0d9488,#0f172a);padding:32px;text-align:center}
      .header h1{color:white;font-size:20px;margin:0}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:8px 0 0}
      .body{padding:28px 32px}
      .greeting{font-size:16px;color:#0f172a;font-weight:600;margin-bottom:16px}
      .section-title{font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px}
      .field{margin-bottom:10px}
      .field-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px}
      .field-value{font-size:14px;color:#0f172a;font-weight:500;padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
      .notes-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:14px;color:#92400e;margin-top:10px;font-style:italic}
      .btn{display:inline-block;background:#0d9488;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:20px}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Tour Request Received</h1>
          <p>A client has requested to tour one of your properties</p>
        </div>
        <div class="body">
          <p class="greeting">Hello ${brokerName},</p>
          <p style="font-size:14px;color:#475569;margin-bottom:20px">You have received a new tour booking request. Please review the details and confirm or cancel from your broker dashboard.</p>

          <div class="section-title">Client Details</div>
          <div class="field"><div class="field-label">Name</div><div class="field-value">${userName}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${userEmail}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${userPhone || 'Not provided'}</div></div>

          <div class="section-title">Tour Details</div>
          <div class="field"><div class="field-label">Property</div><div class="field-value">${propertyTitle}</div></div>
          <div class="field"><div class="field-label">Preferred Date</div><div class="field-value">${new Date(tourDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
          <div class="field"><div class="field-label">Preferred Time</div><div class="field-value">${tourTime || '10:00 AM'}</div></div>

          ${notes ? `<div class="section-title">Special Notes</div><div class="notes-box">💬 "${notes}"</div>` : ''}

          <a href="${process.env.CLIENT_URL}/dashboard/broker/tours" class="btn">View in Dashboard →</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const bookingCancelledEmail = ({ brokerName, userName, propertyTitle, tourDate }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#dc2626,#0f172a);padding:32px;text-align:center}
      .header h1{color:white;font-size:20px;margin:0}
      .header p{color:rgba(255,255,255,0.75);font-size:14px;margin:8px 0 0}
      .body{padding:32px}
      .emoji{font-size:40px;margin-bottom:12px;display:block;text-align:center}
      .greeting{font-size:16px;color:#0f172a;font-weight:600;margin-bottom:12px;text-align:center}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin-bottom:16px;text-align:center}
      .details-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:16px 0}
      .detail-row{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569}
      .detail-row:last-child{border-bottom:none}
      .detail-label{font-weight:700;min-width:100px;flex-shrink:0;color:#0f172a}
      .btn{display:block;text-align:center;margin:0 auto}
      .btn a{display:inline-block;background:#1d4ed8;color:white;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Tour Booking Cancelled</h1>
          <p>A client has cancelled their tour booking</p>
        </div>
        <div class="body">
          <span class="emoji">❌</span>
          <p class="greeting">Hello ${brokerName},</p>
          <p>A client has cancelled their tour booking for one of your properties. The slot is now available for other bookings.</p>
          <div class="details-box">
            <div class="detail-row"><span class="detail-label">👤 Client:</span><span>${userName}</span></div>
            <div class="detail-row"><span class="detail-label">🏠 Property:</span><span>${propertyTitle}</span></div>
            <div class="detail-row"><span class="detail-label">📅 Was Scheduled:</span><span>${new Date(tourDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          </div>
          <div class="btn">
            <a href="${process.env.CLIENT_URL}/dashboard/broker/tours">View All Tour Requests →</a>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const otpEmail = ({ name, otp }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 14px}
      .otp-box{background:#eff6ff;border:2px solid #1d4ed8;border-radius:12px;padding:24px 32px;margin:24px 0;display:inline-block}
      .otp-code{font-size:42px;font-weight:800;color:#1d4ed8;letter-spacing:12px;font-family:monospace}
      .otp-note{font-size:13px;color:#64748b;margin-top:8px}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Password Reset OTP</h1></div>
        <div class="body">
          <span class="emoji">🔐</span>
          <h2>Hello, ${name}!</h2>
          <p>Use this OTP to reset your RealNest account password.</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-note">Valid for 10 minutes only</div>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const passwordChangedEmail = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#059669,#0f172a);padding:36px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .body{padding:40px 32px;text-align:center}
      .emoji{font-size:52px;margin-bottom:16px;display:block}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7;margin:0 0 14px}
      .btn{display:inline-block;background:#1d4ed8;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:12px 0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Password Changed Successfully</h1></div>
        <div class="body">
          <span class="emoji">✅</span>
          <h2>Hello, ${name}!</h2>
          <p>Your RealNest account password has been changed successfully.</p>
          <a href="${process.env.CLIENT_URL}/login" class="btn">Login to Your Account</a>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const contactNotificationEmail = ({ name, email, phone, subject, message }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0}
      .body{padding:32px}
      .field{margin-bottom:20px}
      .field-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
      .field-value{font-size:15px;color:#0f172a;font-weight:500;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>New Contact Form Submission</h1></div>
        <div class="body">
          <div class="field"><div class="field-label">Name</div><div class="field-value">${name}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${email}</div></div>
          <div class="field"><div class="field-label">Phone</div><div class="field-value">${phone || 'Not provided'}</div></div>
          <div class="field"><div class="field-label">Subject</div><div class="field-value">${subject}</div></div>
          <div class="field"><div class="field-label">Message</div><div class="field-value" style="white-space:pre-wrap">${message}</div></div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const contactConfirmationEmail = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:40px 32px;text-align:center}
      .header h1{color:white;font-size:22px;margin:0 0 8px}
      .body{padding:40px 32px;text-align:center}
      .icon{font-size:52px;margin-bottom:20px}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:15px;color:#475569;line-height:1.7;margin:0 0 16px}
      .footer{background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Thank You, ${name}!</h1></div>
        <div class="body">
          <div class="icon">✉️</div>
          <h2>Message Received Successfully</h2>
          <p>Thank you for reaching out to RealNest. Our team will get back to you within 24 hours.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

const newsletterConfirmationEmail = ({ email }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
      .container{max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
      .header{background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:32px;text-align:center}
      .header h1{color:white;font-size:20px;margin:0}
      .body{padding:32px;text-align:center}
      .icon{font-size:48px;margin-bottom:16px}
      .body h2{font-size:20px;color:#0f172a;margin:0 0 12px}
      .body p{font-size:14px;color:#475569;line-height:1.7}
      .footer{background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0}
      .footer p{font-size:12px;color:#94a3b8;margin:0}
    </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>Welcome to RealNest Newsletter</h1></div>
        <div class="body">
          <div class="icon">🏠</div>
          <h2>You are subscribed!</h2>
          <p>Thank you for subscribing with <strong>${email}</strong>.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} RealNest. All rights reserved.</p></div>
      </div>
    </body>
    </html>
  `
}

module.exports = {
  sendEmail,
  welcomeEmail,
  brokerApplicationEmail,
  adminBrokerNotificationEmail,
  brokerApprovedEmail,
  brokerRejectedEmail,
  propertyApprovedEmail,
  propertyRejectedEmail,
  tourConfirmedEmail,
  tourCancelledEmail,
  tourCompletedEmail,
  tourBookedUserEmail,
  tourBookedBrokerEmail,
  bookingCancelledEmail,
  otpEmail,
  passwordChangedEmail,
  contactNotificationEmail,
  contactConfirmationEmail,
  newsletterConfirmationEmail,
}