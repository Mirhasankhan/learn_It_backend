
import Twilio from "twilio";
import config from "../config";

const client = Twilio(config.twilio.accountSid, config.twilio.authToken);

export const sendWhatsAppOTP = async (to: string, otp: string) => {
  try {
    const message = await client.messages.create({
      from: `whatsapp:${config.twilio.twilioPhone}`, 
      to: `whatsapp:${to}`,        
      contentSid: `${config.twilio.contentSid}`, 
      contentVariables: JSON.stringify({
        "1": otp, 
      }),
    }); 

    return {
      success: true,
      sid: message.sid,
      status: message.status,
    };
  } catch (error) {
    console.error("Error sending WhatsApp OTP:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};


