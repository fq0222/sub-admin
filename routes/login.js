// routes/login.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { SECRET } = require('../mid/auth');
const Admin = require('../models/Admin'); // 引入管理员模型
const bcrypt = require('bcrypt'); // 引入 bcrypt
const logger = require('../log/logger');
const { rateLimiter } = require('../mid/limiter');

router.use(rateLimiter);

router.post('/', async (req, res) => {
  let { username, password } = req.body;

  // 解码用户名和密码
  const decodedPassword = Buffer.from(password, 'base64').toString();
  const decodedUsername = Buffer.from(username, 'base64').toString();
  logger.info(`/login: username: ${username}, password: ${password}`);

  try {
    // 检查管理员表是否为空
    const adminCount = await Admin.countDocuments();

    if (adminCount === 0) {
      // 如果管理员表为空，允许使用默认账号密码登录
      if (decodedUsername === 'admin' && decodedPassword === 'admin') {
        const token = jwt.sign({ username: decodedUsername }, SECRET, { expiresIn: '1h' });
        return res.json({ token });
      } else {
        return res.status(401).json({ error: '用户名或密码错误' });
      }
    }

    // 如果管理员表中有数据，验证数据库中的账号密码
    const admin = await Admin.findOne({ username: decodedUsername });

    if (!admin) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证加密后的密码
    const isPasswordValid = await bcrypt.compare(decodedPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成 JWT token
    const token = jwt.sign({ username: decodedUsername }, SECRET, { expiresIn: '6h' });
    return res.json({ token });
  } catch (err) {
    logger.error(`登录错误: ${err}`);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});


module.exports = router;
