import emailjs from "@emailjs/browser";

// EmailJS Configuration
const SERVICE_ID = "service_d07w154";
const TEMPLATE_ID = "template_7jtuhlu";
const PUBLIC_KEY = "hOp6xSXlWPczAOGhP";

export const sendExistingUserNotification = async (
  userName: string,
  groupName: string,
  userEmail: string
) => {
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        user_name: userName,
        group_name: groupName,
        user_email: userEmail,
      },
      PUBLIC_KEY
    );
    console.log(`EmailJS: Notification sent to ${userEmail}`);
  } catch (error) {
    console.error("EmailJS Error:", error);
  }
};
