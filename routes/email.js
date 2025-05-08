// routes/email.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const { authenticate } = require('../mid/auth');
const logger = require('../log/logger');
const { sendEmail } = require('../mail/emailSender');

// 所有接口都加上鉴权中间件
router.use(authenticate);

// 添加 /sub-email 接口
router.post('/sub-email', async (req, res) => {
    const { user, pass, to, password } = req.body; // 增加解压密码参数

    if (!user || !pass || !to || !password) {
        return res.status(400).json({ success: false, message: '/sub-email 缺少必要参数：user, pass, to 或 password' });
    }

    try {
        // 查询用户节点信息
        const nodeInfo = await NodeInfo.findOne({ email: to });
        if (!nodeInfo) {
            return res.status(404).json({ success: false, message: '/sub-email 未找到该邮箱的节点信息' });
        }

        const { startTime, endTime } = nodeInfo;
        const startTimeZh = new Date(startTime).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
        const endTimeZh = new Date(endTime).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});

        // 动态拼接订阅链接
        const subscribeLink = `https://subscribe.codelearning.top/sub?email=${to}`;

        // 拼接邮件内容
        const mail = {
        to,
        subject: '光链通道',
        text: '',
        html: `
            <h3>感谢您的支持！</h3>
            <p>以下是您的订阅链接和解压密码：</p>
            <ul>
            <li><strong>订阅链接：</strong> <a href="${subscribeLink}">${subscribeLink}</a></li>
            <li><strong>节点起始时间：</strong> ${startTimeZh}</li>
            <li><strong>节点结束时间：</strong> ${endTimeZh}</li>
            <li><strong>网盘资料解压密码：</strong> ${password}</li>
            </ul>
            <p>如有问题，请随时联系我们, VX: q1195679943; 清备注：[光链通道]，否则不会通过验证</p>
            <p>Telegram电报频道: <a href="https://t.me/LightRoute_9527" target="_blank">https://t.me/LightRoute_9527</a> 加入频道，收取最新通知和活动</p>
            <p>节点信息查询地址: <a href="https://subscribe.codelearning.top/payit" target="_blank">https://subscribe.codelearning.top/payit</a> 查询剩余时间，和流量使用情况</p>
        `,
        imagePaths: [] // 如果需要发送图片，可以在这里添加图片路径
        };

        // 调用 sendEmail 函数发送邮件
        const info = await sendEmail({ user, pass }, mail);
        res.json({ success: true, message: '/sub-email 邮件发送成功', messageId: info.messageId });
    } catch (err) {
        logger.error(`/sub-email 邮件发送失败: ${err}`);
        res.status(500).json({ success: false, message: '/sub-email 邮件发送失败', error: err.message });
    }
});

module.exports = router;
