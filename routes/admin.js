// routes/admin.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const Admin = require('../models/Admin'); // 引入管理员模型
const { authenticate } = require('../mid/auth');
const bcrypt = require('bcrypt'); // 引入 bcrypt
const logger = require('../log/logger');
const { sendEmail } = require('../mail/emailSender');
const path = require('path');
const crypto = require('crypto'); // 引入 crypto 模块
const SendEmail = require('../models/SendEmail'); // 引入 SendEmail 模型

// 所有接口都加上鉴权中间件
router.use(authenticate);

// 添加节点
router.post('/add', async (req, res) => {
  try {
    const { email, vlessList, startTime, endTime, server, isSold, price } = req.body; // 接收新增字段
    const node = new NodeInfo({ email, vlessList, startTime, endTime, server, isSold, price }); // 保存新增字段
    await node.save();
    res.json({ success: true, message: '添加成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 删除节点
router.delete('/delete/:id', async (req, res) => {
  try {
    await NodeInfo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 修改节点
router.put('/update/:id', async (req, res) => {
  try {
    const { email, vlessList, startTime, endTime, server, isSold, price } = req.body; // 接收新增字段
    logger.info(`/update email: ${email}, vlessList: ${vlessList.slice(0, 10)}, startTime: ${startTime}, endTime: ${endTime}, server: ${server}, isSold: ${isSold}, price: ${price}`);
    await NodeInfo.findByIdAndUpdate(req.params.id, {
      email, vlessList, startTime, endTime, server, isSold, price // 更新新增字段
    });
    res.json({ success: true, message: '修改成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 查询指定邮箱节点
router.get('/search', async (req, res) => {
  const { email, isSold, priceMin, priceMax } = req.query;
  const filter = {};

  if (email) filter.email = email;
  if (isSold) filter.isSold = isSold === 'true';
  if (priceMin) filter.price = { ...filter.price, $gte: parseFloat(priceMin) };
  if (priceMax) filter.price = { ...filter.price, $lte: parseFloat(priceMax) };

  try {
    const nodes = await NodeInfo.find(filter);
    res.json({ success: true, data: nodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 查看所有节点
router.get('/list', async (req, res) => {
  try {
    const list = await NodeInfo.find().sort({ startTime: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 设置管理员账号密码
router.post('/set', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('admin/set username:', username);
    console.log('admin/set password:', password);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 检查是否已经存在管理员
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({ success: false, message: '管理员账号已存在，无法重复添加' });
    }

    // 对密码进行加密
    const hashedPassword = await bcrypt.hash(password, 10);
    logger.info(`admin/set hashedPassword: ${hashedPassword}`);

    // 创建管理员账号
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();

    res.json({ success: true, message: '管理员账号创建成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/set-email', async (req, res) => {
  const { email, authCode, password } = req.body;

  if (!email || !authCode || !password) {
    return res.status(400).json({ success: false, message: '邮箱、安全码和解压密码不能为空' });
  }

  try {
    // 加密安全码
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.SECRET_KEY || 'default_secret_key').digest();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encryptedAuthCode = cipher.update(authCode, 'utf8', 'hex');
    encryptedAuthCode += cipher.final('hex');

    // 将 IV 和加密后的数据一起存储
    encryptedAuthCode = iv.toString('hex') + ':' + encryptedAuthCode;

    // 检查表中数据数量
    const recordCount = await SendEmail.countDocuments();
    if (recordCount > 1) {
      // 如果数据超过 1 条，删除所有记录
      await SendEmail.deleteMany({});
      logger.info('/set-email 超过 1 条记录，已删除所有记录');
    }

    // 查找并更新记录
    const updatedRecord = await SendEmail.findOneAndUpdate(
      { email }, // 查询条件：匹配 email
      { authCode: encryptedAuthCode, password }, // 更新的字段
      { upsert: true, new: true } // 如果不存在则创建新记录，并返回更新后的记录
    );
    logger.info(`/set-email set email success: ${updatedRecord}`);

    res.json({ success: true, message: '邮箱、安全码和解压密码已保存' });
  } catch (err) {
    logger.error(`设置邮箱失败: ${err}`);
    res.status(500).json({ success: false, message: '设置邮箱失败', error: err.message });
  }
});

// 添加 /get-sendemail 接口
router.get('/get-sendemail', async (req, res) => {
  try {
    // 查询数据库中所有的邮箱、加密的安全码和解压密码
    const emailData = await SendEmail.find({}, { email: 1, authCode: 1, password: 1, _id: 0 });

    if (!emailData || emailData.length === 0) {
      return res.status(404).json({ success: false, message: '未找到任何邮箱、安全码和解压密码记录' });
    }

    // 解密安全码
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.SECRET_KEY || 'default_secret_key').digest();

    const decryptedData = emailData.map(record => {
      const [ivHex, encryptedData] = record.authCode.split(':');
      const iv = Buffer.from(ivHex, 'hex');

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decryptedAuthCode = decipher.update(encryptedData, 'hex', 'utf8');
      decryptedAuthCode += decipher.final('utf8');

      return {
        email: record.email,
        authCode: decryptedAuthCode,
        password: record.password // 返回解压密码
      };
    });

    res.json({ success: true, data: decryptedData });
  } catch (err) {
    logger.error(`获取邮箱、安全码和解压密码失败: ${err}`);
    res.status(500).json({ success: false, message: '获取邮箱、安全码和解压密码失败', error: err.message });
  }
});

// 修改管理员账号密码
router.put('/update-admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    logger.info(`admin/update-admin username: ${username}`);
    logger.info(`admin/update-admin password: ${password}`);

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 查找管理员账号
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ success: false, message: '管理员账号不存在' });
    }

    // 对新密码进行加密
    const hashedPassword = await bcrypt.hash(password, 10);
    logger.info(`admin/update-admin hashedPassword: ${hashedPassword}`);

    // 更新管理员密码
    admin.password = hashedPassword;
    await admin.save();

    res.json({ success: true, message: '管理员密码修改成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 添加 /send-email 接口
router.post('/send-email', async (req, res) => {
  const { user, pass, to, password } = req.body; // 增加解压密码参数

  if (!user || !pass || !to || !password) {
    return res.status(400).json({ success: false, message: '缺少必要参数：user, pass, to 或 password' });
  }

  try {
    // 查询用户节点信息
    const nodeInfo = await NodeInfo.findOne({ email: to });
    if (!nodeInfo) {
      return res.status(404).json({ success: false, message: '未找到该邮箱的节点信息' });
    }

    const { startTime, endTime } = nodeInfo;

    // 动态拼接订阅链接
    const subscribeLink = `https://subscribe.codelearning.top/sub?email=${to}`;

    // 拼接邮件内容
    const mail = {
      to,
      subject: '订阅链接和解压密码',
      text: '',
      html: `
        <h3>感谢您的支持！</h3>
        <p>以下是您的订阅链接和解压密码：</p>
        <ul>
          <li><strong>订阅链接：</strong> <a href="${subscribeLink}">${subscribeLink}</a></li>
          <li><strong>节点起始时间：</strong> ${new Date(startTime).toLocaleString()}</li>
          <li><strong>节点结束时间：</strong> ${new Date(endTime).toLocaleString()}</li>
          <li><strong>网盘资料解压密码：</strong> ${password}</li>
        </ul>
        <p>如有问题，请随时联系我们, QQ: 2308273365</p>
      `,
      imagePaths: [] // 如果需要发送图片，可以在这里添加图片路径
    };

    // 调用 sendEmail 函数发送邮件
    const info = await sendEmail({ user, pass }, mail);
    res.json({ success: true, message: '邮件发送成功', messageId: info.messageId });
  } catch (err) {
    logger.error(`邮件发送失败: ${err}`);
    res.status(500).json({ success: false, message: '邮件发送失败', error: err.message });
  }
});


module.exports = router;
