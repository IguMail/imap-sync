const nodemailer = require("nodemailer");

// the accessToken is expired
const transportOptions = {
  service: "Gmail",
  auth: {
    type: "OAuth2"
  }
};

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport(transportOptions);

transporter.set("oauth2_provision_cb", (user, renew, callback) => {
  console.log("called oauth2_provision_cb", {user, renew, callback});
});

const mailOptions = {
  to: [
    { address: "mailsync2018@gmail.com" },
    {
      address: "gabe@fijiwebdesign.com",
      name: "Gabiriele Lalasava"
    }
  ],
  subject: "Re: Test Thread",
  text: "test",
  snippet: "test",
  inReplyTo: '0.5525021666651546',
  date: "2018-06-30T05:58:25.775Z",
  from: '"Mailsync2018" <mailsync2018@gmail.com>',
  local: true,
  success: false,
  error: null,
  replyTo: "mailsync2018@gmail.com",
  auth: {
    user: 'mailsync2018@gmail.com',
    accessToken: 'ya29.GlvpBbERNZcel53gIAg1s7mTmFzog5MF3RYFXlCruB1gjAOPHbe0a75wGYid919jCffHxurGtb7NEHIvYBVXpISFGH_YB3mNynmRNdeXw4z5z_6Bl5sf8PC9bG5J'
  }
};

transporter.sendMail(mailOptions, (error, info) => {
  console.log("error", error, "info", info);
});
