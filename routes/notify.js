// routes/notify.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const crypto = require('crypto'); // 引入 crypto 模块
const { authenticate } = require('../mid/auth');
const logger = require('../log/logger');
const SendEmail = require('../models/SendEmail'); // 引入 SendEmail 模型
const moment = require('moment-timezone'); // 引入 moment-timezone


const xuiUrl = process.env.XUI_URL || 'http://localhost:21211/xuiop';
const api_key = process.env.API_KEY || 'your-key'; // API 密钥

// 所有接口都加上鉴权中间件
router.use(authenticate);

function extractUUIDFromVlessList(vlessList) {
    const lines = vlessList.trim().split('\n');
    const firstVless = lines.find(line => line.startsWith('vless://'));
  
    if (!firstVless) return null;
  
    const afterProtocol = firstVless.split('vless://')[1];
    const uuid = afterProtocol.split('@')[0];
  
    return uuid;
}
  

const updateEmail = async (id, email) => {
    try {
        const response = await fetch(`${xuiUrl}/uuid/${id}/email`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (response.ok) {
            logger.info(`更新成功: ${id}-[${email}]`);
        } else {
            logger.error(`更新失败: ${id}-[${email}]`);
        }
    } catch (err) {
        logger.error(`请求异常: ${err.message}`);
    }
};

// 添加 /pay 接口
router.post('/pay', async (req, res) => {
    try {
        const { email, price } = req.body;

        // 检查参数是否完整
        if (!email || !price) {
            return res.status(400).json({ success: false, message: '缺少必要参数 email 或 price' });
        }

        // 检查当前email是否已存在
        const existingNode = await NodeInfo.findOne({ email, isSold: true });
        if (existingNode) {
            logger.info(`/notify/pay 邮箱 ${email} 已存在，进行续费操作`);
            // 如果已存在，就是续费操作
            // 获取当前时间并转换为中国时区
            const endTime = moment(existingNode.endTime).add(31, 'days').toDate(); // 当前时间加31天（中国时区）
            // 修改其结束时间
            existingNode.endTime = endTime; // 设置结束时间为31天后
            await existingNode.save();
            // 向xui服务器发送请求，增加对应email节点的流量，+300GB，待实现
        } else {
            logger.info(`/notify/pay 邮箱 ${email} 不存在，进行新购操作`);
            // 如果不存在，就是新购操作
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

            // 从 NodeInfo 中获取 uuid
            const uuid = extractUUIDFromVlessList(node.vlessList);
            logger.info(`/notify/pay 提取到的 UUID: ${uuid}`);

            // 向xui服务器发送请求，更新uuid对应的节点的email信息
            updateEmail(uuid, email);
        }


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
            logger.error(`/notify/pay 发送邮件失败: ${errorText}`);
            return res.status(500).json({ success: false, message: '节点信息保存成功，但发送邮件失败' });
        }

        res.json({ success: true, message: '节点信息更新成功并已发送邮件'});
    } catch (err) {
        logger.error(`/notify/pay 处理支付通知失败: ${err.message}`);
        res.status(500).json({ success: false, message: '处理支付通知失败', error: err.message });
    }
});

module.exports = router;
