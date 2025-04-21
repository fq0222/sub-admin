// emailSender.js
const nodemailer = require('nodemailer');
const path = require('path');
const logger = require('../log/logger');

/**
 * 发送邮件（支持文本、图片、混合）
 * @param {Object} config 邮箱配置
 * @param {string} config.user 发件人邮箱（如 xxx@qq.com）
 * @param {string} config.pass 授权码（非登录密码）
 * @param {Object} mail 邮件内容
 * @param {string} mail.to 接收者邮箱
 * @param {string} mail.subject 邮件标题
 * @param {string} [mail.text] 文本内容（可选）
 * @param {string} [mail.html] HTML内容（可选）
 * @param {string[]} [mail.imagePaths] 本地图片路径数组（可选）
 */
async function sendEmail(config, mail) {
  const { user, pass } = config;
  const { to, subject, text, html, imagePaths = [] } = mail;

  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 465,
    secure: true, // 使用 SSL
    auth: {
      user,
      pass
    }
  });

  const attachments = imagePaths.map((imgPath, idx) => ({
    filename: path.basename(imgPath),
    path: imgPath,
    cid: `img${idx}@mail`
  }));

  let finalHtml = html || '';
  if (!html && imagePaths.length > 0) {
    finalHtml = imagePaths.map((_, i) => `<p><img src="cid:img${i}@mail"/></p>`).join('');
  }

  const mailOptions = {
    from: `"发件人" <${user}>`,
    to,
    subject,
    text,
    html: finalHtml || undefined,
    attachments: attachments.length > 0 ? attachments : undefined
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`邮件发送成功: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`邮件发送失败: ${err}`);
    throw err;
  }
}

module.exports = { sendEmail };
