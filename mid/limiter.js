// limiter.js
const logger = require('../log/logger');

// 用于存储访问记录
const rateLimitMap = new Map();

// 中间件：限制同一 IP 的访问频率
function rateLimiter(req, res, next) {
    // 获取用户真实 IP（Cloudflare 提供的 IP）
    const userIp = req.headers['cf-connecting-ip'] || req.ip;
    logger.info(`rateLimiter userIp: ${userIp}`);

    // 获取当前时间戳
    const currentTime = Date.now();

    // 检查该 IP 是否已有访问记录
    if (rateLimitMap.has(userIp)) {
        const lastAccessTime = rateLimitMap.get(userIp);

        // 如果距离上次访问小于 1 分钟，拒绝请求
        if (currentTime - lastAccessTime < 60 * 1000) {
            logger.warn(`IP ${userIp} 访问过于频繁，拒绝请求`);
            return res.status(429).json({
                success: false,
                message: '请求过于频繁，请稍后再试！'
            });
        }
    }

    // 更新访问记录
    rateLimitMap.set(userIp, currentTime);

    // 清理过期的记录（可选，防止内存占用过多）
    for (const [ip, time] of rateLimitMap) {
        if (currentTime - time > 60 * 1000) {
            rateLimitMap.delete(ip);
        }
    }

    next();
}

module.exports = {
    rateLimiter,
};
