import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Adresinizi Doğrulayın - Haftalık Kelime',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Haftalık Kelime - Email Doğrulama</h2>
        <p>Merhaba,</p>
        <p>Haftalık Kelime uygulamasına hoş geldiniz! Email adresinizi doğrulamak için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Email Adresimi Doğrula
          </a>
        </div>
        <p>Veya aşağıdaki linki tarayıcınızda açın:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>Bu link 24 saat boyunca geçerlidir.</p>
        <p>Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">
          Bu otomatik olarak gönderilmiş bir emaildir. Lütfen yanıtlamayınız.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return false;
  }
} 