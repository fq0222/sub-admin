// models/NodeInfo.js  节点信息模型
const mongoose = require('mongoose');

const nodeInfoSchema = new mongoose.Schema({
  email: { type: String, required: true },
  vlessList: { type: String, required: true }, // 多个 vless 节点信息合并为字符串
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  server: { type: String, required: false }, // 新增字段，用于标识节点所在的服务器
  isSold: { type: Boolean, default: false }, // 新增字段，标记是否售出
  price: { type: Number, required: false } // 新增字段，标记节点价格
});

module.exports = mongoose.model('NodeInfo', nodeInfoSchema);
