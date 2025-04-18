// db/mongoose.js
const mongoose = require('mongoose');

const MONGO_URL = 'mongodb://localhost:27017/node-admin'; // 或替换为你的远程连接地址

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ 已成功连接 MongoDB');
  } catch (error) {
    console.error('❌ 连接 MongoDB 失败:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
