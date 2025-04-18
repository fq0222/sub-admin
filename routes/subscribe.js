// routes/subscribe.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');


// 订阅节点 ; charset=utf-8
router.get('/', async (req, res) => {
    const { email } = req.query;
    console.log('subscribe email:', req.query);
    // 检查请求者的ip地址
    const ip = req.ip; // 获取请求者的IP地址
    console.log('subscribe ip:', ip);
    // 这里可以添加IP地址的验证逻辑

    if (!email) {
        return res.status(400).send('缺少 email 参数');
    }

    try {
        // 查询数据库中的节点信息
        const nodes = await NodeInfo.find({ email });

        if (!nodes || nodes.length === 0) {
            return res.status(404).send('未找到对应的节点信息');
        }

        // 构造订阅内容
        const subscription = nodes.map(node => {
            const { vlessList } = node;

            // 确保返回的节点信息是 VLESS 格式
            if (!vlessList.startsWith('vless://')) {
                return null;
            }

            return vlessList;
        }).filter(Boolean).join('\n'); // 过滤掉无效的节点并用换行符拼接

        // 返回订阅内容
        res.setHeader('Content-Type', 'text/plain');
        res.send(subscription);
    } catch (err) {
        console.error(err);
        res.status(500).send('服务器内部错误');
    }
});

module.exports = router;
