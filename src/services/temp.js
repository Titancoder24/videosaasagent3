const twilio = require("twilio");
require("dotenv").config();
const accountSid = process.env.TWILIO_ACCOUNT_SID || "your-twilio-account-sid";
const authToken = process.env.TWILIO_AUTH_TOKEN || "your-twilio-auth-token";
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "+1234567890"; // This is the phone number you got from Twilio

const client = twilio(accountSid, authToken);

const sendOTP = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log(`OTP sent to ${phoneNumber}`);
  } catch (error) {
    console.error(`Failed to send OTP to ${phoneNumber}:`, error);
    throw error;
  }
};

module.exports = sendOTP;
