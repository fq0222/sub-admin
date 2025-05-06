// routes/subscribe.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const logger = require('../log/logger');
const { rateLimiter } = require('../mid/limiter');

router.use(rateLimiter);

// 查询未售出的节点数量
router.get('/unsold-nodes', async (req, res) => {
    logger.info('/unsold-nodes 查询未售出节点数量');
    try {
        // 查询 15 元价位未售出的节点数量
        const count15 = await NodeInfo.countDocuments({ price: 15, isSold: false });

        // 查询 50 元价位未售出的节点数量
        const count50 = await NodeInfo.countDocuments({ price: 50, isSold: false });

        // 返回结果
        res.json({
            success: true,
            data: {
                price15: count15,
                price50: count50
            }
        });
    } catch (err) {
        logger.error(`查询未售出节点数量失败: ${err.message}`);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// 根据邮箱查询节点信息（到期时间和流量）
router.get('/node-info', async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: '缺少 email 参数'
        });
    }

    logger.info(`/node-info 查询节点信息，邮箱: ${email}`);

    try {
        // 查询数据库中与邮箱匹配的节点信息
        const node = await NodeInfo.findOne({ email, isSold: true }).select('endTime usedTraffic totalTraffic');

        if (!node) {
            return res.status(404).json({
                success: false,
                message: '未找到与该邮箱关联的节点信息'
            });
        }

        // 将流量从字节转换为 GB
        const usedTrafficGB = (node.usedTraffic / (1024 ** 3)).toFixed(2); // 保留两位小数
        const totalTrafficGB = (node.totalTraffic / (1024 ** 3)).toFixed(2); // 保留两位小数

        // 返回节点信息
        res.json({
            success: true,
            data: {
                expiryDate: node.endTime, // 到期时间
                traffic: `${usedTrafficGB} GB / ${totalTrafficGB} GB` // 流量信息
            }
        });
    } catch (err) {
        logger.error(`查询节点信息失败: ${err.message}`);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

module.exports = router;
