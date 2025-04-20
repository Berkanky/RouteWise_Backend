const sgMail = require("@sendgrid/mail");
const createVerifyCode = require("../MyFunctions/GenerateVerifyCode");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendGridFromEMailAddress = process.env.EMAIL_ADDRESS;
var VerificationId = createVerifyCode();

const LoginEmailVerification = async (EMailAddress) => {

  const msg = {
    to: EMailAddress,
    from: sendGridFromEMailAddress, 
    subject: "SnapNote+ - Giriş Doğrulama Kodu",
    html: `
      <div style="
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 0; 
        background-color: #f4f4f4;">
        <table 
          align="center" 
          border="0" 
          cellpadding="0" 
          cellspacing="0" 
          style="max-width: 600px; width: 100%; margin: 0 auto;">
          
          <!-- Başlık Kısmı -->
          <tr>
            <td 
              style="
                background-color: #4D2F7C; 
                padding: 20px; 
                text-align: center;">
              <h1 style="color: #ffffff; margin: 0;">SnapNote+ - Giriş Onaylama</h1>
            </td>
          </tr>
          
          <!-- Gövde Kısmı -->
          <tr>
            <td style="padding: 20px; background-color: #ffffff;">
              
              <p style="margin: 0; font-size: 16px;">
                Merhaba <strong>${EMailAddress}</strong>,
              </p>
              
              <p style="margin-top: 15px; font-size: 16px; line-height: 1.5;">
                Hesabına giriş yapmaya çalıştın. Devam edebilmek için aşağıdaki 
                doğrulama kodunu, uygulamadaki ilgili alana girmen gerekiyor.
              </p>
              
              <div style="
                  margin-top: 25px;
                  margin-bottom: 25px;
                  padding: 15px;
                  background-color: #f4f4f4;
                  border: 2px dashed #4D2F7C;
                  text-align: center;
                  font-size: 18px;
                  font-weight: bold;
                  color: #4D2F7C;
                ">
                ${VerificationId}
              </div> 
              <p style="margin-top: 15px; font-size: 16px; line-height: 1.5;">
                Eğer bu giriş talebi sana ait değilse, lütfen bu e-postayı dikkate alma.
              </p>
              <p style="margin-top: 15px; font-size: 16px; line-height: 1.5;">
                Yardıma ihtiyacın olursa bizimle iletişime geçmekten çekinme.
              </p>
              <p style="margin-top: 20px; font-size: 16px; line-height: 1.5;">
                Sevgiler,<br/>
                <strong>SnapNote+ Ekibi</strong>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #aaaaaa;">
                Bu e-posta ${new Date().toLocaleString("tr-TR")} tarihinde oluşturulmuştur.
              </p>
              
            </td>
          </tr>
          
          <!-- Alt Kısım -->
          <tr>
            <td 
              style="
                background-color: #f4f4f4; 
                padding: 20px; 
                text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #aaaaaa;">
                &copy; ${new Date().getFullYear()} SnapNote+. Tüm Hakları Saklıdır.
              </p>
            </td>
          </tr>
          
        </table>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return VerificationId;
  } catch (error) {
    console.error("E-posta gönderilemedi:", error);
    if (error.response) {
      console.error("Hata Detayları:", error.response.body);
    }
  }
};

module.exports = LoginEmailVerification;