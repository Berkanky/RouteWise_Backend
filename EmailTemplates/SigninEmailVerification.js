const sgMail = require("@sendgrid/mail");
const createVerifyCode = require("../MyFunctions/GenerateVerifyCode"); // Bu fonksiyonun string döndürdüğünü varsayıyoruz

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

var sendGridFromEMailAddress = process.env.EMAIL_ADDRESS;

const LoginEmailVerification = async (EMailAddress) => {
  var verificationCode = createVerifyCode();
  var verificationCodeString = String(verificationCode);
  var verificationDigits = verificationCodeString.split("");

  var codeSpans = verificationDigits
    .map(
      (digit) =>
        `<span style="display: inline-block; width: 30px; height: 45px; border: 1px solid #cccccc; border-radius: 4px; text-align: center; line-height: 45px; font-size: 20px; font-weight: bold; color: #333; margin-right: 8px;">${digit}</span>`
    )
    .join("");

  const msg = {
    to: EMailAddress,
    from: {
      email: sendGridFromEMailAddress,
      name: "RouteWiseTeam",
    },
    subject: "RouteWise Email Verification",
    html: `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RouteWise Email Verification</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">

    <div style="max-width: 600px; margin: 20px auto; padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">

        <div class="logo-placeholder" style="min-height: 40px; margin-bottom: 25px; display: flex; align-items: center;">
            <img src='https://routewisebackend-production.up.railway.app/registerLogo.png' alt=''/>
        </div>

        <p style="margin-bottom: 15px; font-size: 15px; color: #555; font-weight: bold;">Hi ${EMailAddress},</p>

        <p style="margin-bottom: 15px; font-size: 15px; color: #555;">
           Thank you for signing in! To continue using our app, please verify your email address by entering the code below:
        </p>

        <div style="display: flex; align-items: center; gap: 15px; margin: 25px 0;">
            <div style="display: flex; gap: 0px;"> ${codeSpans}</div>
        </div>

        <p style="font-size: 13px; color: #777777; margin-top: 25px;">
           If you did not request this, you can safely ignore this email.
        </p>
         <p style="font-size: 13px; color: #777777; margin-top: 10px;">
            Need help? Feel free to contact us anytime!
         </p>

        <p style="margin-top: 25px; font-size: 15px; color: #555;">
           Best Regards,<br>
           <strong>The RouteWise Team</strong>
           
        </p>

        <div style="border-top: 1px solid #eeeeee; margin: 20px 0;"></div> <p style="font-size: 12px; color: #aaaaaa; text-align: right; margin-top: 10px; margin-bottom: 0;">
           &copy; ${new Date().getFullYear()} RouteWise. All Rights Reserved.
        </p>
    </div>
</body>
</html>
    `,
  };

  try {
    await sgMail.send(msg);
    return verificationCodeString;
  } catch (error) {
    if (error.response) console.error("Hata Detayları:", error.response.body);
    return null;
  }
};

module.exports = LoginEmailVerification;