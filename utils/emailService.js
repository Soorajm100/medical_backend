import nodemailer from "nodemailer";

export const sendEmergencyEmail = async (hospitalEmail, subject, message, userEmail) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,  
      },
    });

    // Send email *to hospital*, but *from the user’s email*
    const mailOptions = {
      from: `"Emergency Alert - ${userEmail}" <${process.env.EMAIL_USER}>`,
      replyTo: userEmail, // hospital can reply directly to the user
      to: hospitalEmail,
      subject,
      text: message,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent to hospital:", info.response);
    return true;
  } catch (err) {
    console.error("Error sending email:", err);
    return false;
  }
};
