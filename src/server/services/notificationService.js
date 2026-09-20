const Notification = require('../models/Notification');

/**
 * Send in-app notification to a user
 */
const createNotification = async ({
  recipient,
  title,
  message,
  type = 'GENERAL',
  link = '',
  issue = null
}) => {
  try {
    if (!recipient) return null;
    return await Notification.create({
      recipient,
      title,
      message,
      type,
      link,
      issue
    });
  } catch (error) {
    console.error(`[CivicTrack Notification Error]: ${error.message}`);
    return null;
  }
};

module.exports = { createNotification };
