const sendOtpService = require("msg91-sdk").SendOtpService;

const sendOTP = async (phoneNumber, otp) => {
  console.log("first");
  const sendOtp = new sendOtpService(
    "408355AEZofsTre65324a06P1",
    "Your OTP is: {{otp}}"
  );
  sendOtp.otpLength = 6; // 'XXXXXX'
  sendOtp.otpExpiry = 5; // In minutes
  const aOptions = {
    mobile: phoneNumber, // Mandatory param along with country dial code
    otp: otp,
  };
  sendOtp
    .sendOTP(aOptions)
    .then((response) => {
      console.log("otp sent to: ", response);
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = sendOTP;
