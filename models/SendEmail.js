const mongoose = require('mongoose');

const SendEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true // 确保邮箱地址唯一
  },
  authCode: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true // 新增字段：解压密码
  },
  createdAt: {
    type: Date,
    default: Date.now // 自动记录创建时间
  }
});

module.exports = mongoose.model('SendEmail', SendEmailSchema);
