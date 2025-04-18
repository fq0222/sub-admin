// auth.js
const jwt = require('jsonwebtoken');

const SECRET = 'adfadfadsfdfwehgfd243'; // 可放入 .env 文件

// 登录校验中间件
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log('完整请求头:', req.headers); // 打印完整请求头
  console.log('authHeader:', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，缺少 token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: '无效的 token' });
  }
}

module.exports = {
  authenticate,
  SECRET
};
