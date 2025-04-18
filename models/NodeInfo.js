// models/NodeInfo.js  节点信息模型
const mongoose = require('mongoose');

const nodeInfoSchema = new mongoose.Schema({
  email: { type: String, required: true },
  vlessList: { type: String, required: true }, // 多个 vless 节点信息合并为字符串
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true }
});

module.exports = mongoose.model('NodeInfo', nodeInfoSchema);
