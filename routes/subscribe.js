// routes/subscribe.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const logger = require('../log/logger');


// 订阅节点 ; charset=utf-8
router.get('/sub', async (req, res) => {
    const { email } = req.query;
    logger.info(`/sub subscribe email: ${email}`);
    // 检查请求者的ip地址
    const ip = req.ip; // 获取请求者的IP地址
    logger.info(`/sub subscribe ip: ${ip}`);
    // 这里可以添加IP地址的验证逻辑

    if (!email) {
        return res.status(400).send('缺少 email 参数');
    }

    try {
        // 使用游标逐条处理数据
        const cursor = NodeInfo.find({ email }).cursor();
        let subscription = '';

        // 构造订阅内容
        for (let node = await cursor.next(); node != null; node = await cursor.next()) {
            const { vlessList } = node;

            // 确保返回的节点信息是 VLESS 格式
            if (vlessList.startsWith('vless://')) {
                subscription += vlessList + '\n';
            }
        }

        logger.info(`/sub subscription: ${subscription}`);

        if (!subscription) {
            return res.status(404).send('未找到对应的节点信息');
        }

        // 返回订阅内容
        res.setHeader('Content-Type', 'text/plain');
        res.send(subscription.trim()); // 去掉最后的多余换行符
    } catch (err) {
        logger.error(`订阅错误: ${err}`);
        res.status(500).send('服务器内部错误');
    }
});

module.exports = router;
