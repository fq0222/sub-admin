// routes/subscribe.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const logger = require('../log/logger');
const { rateLimiter } = require('../mid/limiter');

router.use(rateLimiter);

// 订阅节点 ; charset=utf-8
router.get('/', async (req, res) => {
    const { email } = req.query;
    logger.info(`/sub subscribe email: ${email}`);
    
    // 检查请求者的IP地址
    const ip = req.ip; // 获取请求者的IP地址
    logger.info(`/sub subscribe ip: ${ip}`);
    // 这里可以添加IP地址的验证逻辑

    if (!email) {
        return res.status(400).send('缺少 email 参数');
    }

    try {
        // 查询数据库，筛选出售出的节点
        const nodes = await NodeInfo.find({ email, isSold: true }).select('vlessList -_id');

        if (!nodes || nodes.length === 0) {
            return res.status(404).send('未找到已售出的节点信息');
        }

        // 提取 vlessList 字段并拼接成一个字符串
        const subscription = nodes.map(node => node.vlessList).join('');
        logger.info(`/sub subscription: ${nodes}`);

        // 对整个订阅内容进行 Base64 编码
        const encodedSubscription = btoa(unescape(encodeURIComponent(subscription.trim())));

        // 返回订阅内容
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(encodedSubscription);
    } catch (err) {
        logger.error(`订阅错误: ${err}`);
        res.status(500).send('服务器内部错误');
    }
});

module.exports = router;
