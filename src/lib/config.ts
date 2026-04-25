export const APP_CONFIG = {
  // Centralized passcode for sensitive actions (editing past docs, declining tours, etc.)
  // We first check the environment variable, then fallback to the default '123456'
  ADMIN_PASSCODE: process.env.ADMIN_EDIT_PIN || "123456",
};
