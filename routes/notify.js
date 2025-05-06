// routes/notify.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const crypto = require('crypto'); // 引入 crypto 模块
const { authenticate } = require('../mid/auth');
const logger = require('../log/logger');
const SendEmail = require('../models/SendEmail'); // 引入 SendEmail 模型
const moment = require('moment-timezone'); // 引入 moment-timezone

// 所有接口都加上鉴权中间件
router.use(authenticate);

// 添加 /pay 接口
router.post('/pay', async (req, res) => {
    try {
        const { email, price } = req.body;

        // 检查参数是否完整
        if (!email || !price) {
            return res.status(400).json({ success: false, message: '缺少必要参数 email 或 price' });
        }

        // 查找价格匹配且未售出的节点
        const node = await NodeInfo.findOne({ price, isSold: false });

        if (!node) {
            return res.status(404).json({ success: false, message: '未找到匹配的节点信息' });
        }

        // 获取当前时间并转换为中国时区
        const currentTime = moment().tz('Asia/Shanghai').toDate(); // 当前时间（中国时区）
        const endTime = moment(currentTime).add(31, 'days').toDate(); // 当前时间加31天（中国时区）

        // 更新节点信息
        node.email = email;
        node.isSold = true;
        node.startTime = currentTime; // 设置起始时间为当前时间
        node.endTime = endTime; // 设置结束时间为31天后
        await node.save();

        // 从 SendEmail 数据库中获取发件人信息
        const sendEmailInfo = await SendEmail.findOne();
        if (!sendEmailInfo) {
            return res.status(500).json({ success: false, message: '未找到发件人邮箱配置信息' });
        }

        const { email: senderEmail, authCode: encryptedAuthCode, password: zipPassword } = sendEmailInfo;

        // 解密 authCode
        const algorithm = 'aes-256-cbc';
        const key = crypto.createHash('sha256').update(process.env.SECRET_KEY || 'default_secret_key').digest();
        const [ivHex, encryptedData] = encryptedAuthCode.split(':');
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decryptedAuthCode = decipher.update(encryptedData, 'hex', 'utf8');
        decryptedAuthCode += decipher.final('utf8');

        const sendEmailUrl = `http://localhost:${process.env.PORT || 12111}/send/sub-email`;

        // 调用 /send/sub-email 接口发送邮件
        const emailResponse = await fetch(sendEmailUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization, // 添加 token
            },
            body: JSON.stringify({
                user: senderEmail,          // 发件人邮箱
                pass: decryptedAuthCode,    // 解密后的发件人邮箱密码
                to: email,                  // 收件人邮箱
                password: zipPassword,      // 解压密码
            }),
        });

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            logger.error(`发送邮件失败: ${errorText}`);
            return res.status(500).json({ success: false, message: '节点信息保存成功，但发送邮件失败' });
        }

        res.json({ success: true, message: '节点信息更新成功并已发送邮件', data: node });
    } catch (err) {
        logger.error(`处理支付通知失败: ${err.message}`);
        res.status(500).json({ success: false, message: '处理支付通知失败', error: err.message });
    }
});

module.exports = router;
