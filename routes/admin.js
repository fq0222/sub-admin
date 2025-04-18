// routes/admin.js
const express = require('express');
const router = express.Router();
const NodeInfo = require('../models/NodeInfo');
const Admin = require('../models/Admin'); // 引入管理员模型
const { authenticate } = require('../mid/auth');
const bcrypt = require('bcrypt'); // 引入 bcrypt
const logger = require('../log/logger');

// 所有接口都加上鉴权中间件
router.use(authenticate);

// 添加节点
router.post('/add', async (req, res) => {
  try {
    const { email, vlessList, startTime, endTime } = req.body;
    const node = new NodeInfo({ email, vlessList, startTime, endTime });
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
    const { email, vlessList, startTime, endTime } = req.body;
    await NodeInfo.findByIdAndUpdate(req.params.id, {
      email, vlessList, startTime, endTime
    });
    res.json({ success: true, message: '修改成功' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 查询指定邮箱节点
router.get('/search', async (req, res) => {
  try {
    const { email } = req.query;
    const list = await NodeInfo.find({ email });
    res.json({ success: true, data: list });
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

module.exports = router;
