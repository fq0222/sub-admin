const queryFlow = require('./crontab/query_flow');
const connectDB = require('./db/mongoose');

// 连接 MongoDB
connectDB();

// 延时3秒
setTimeout(() => {
    console.log('延时3秒');
    queryFlow();
}, 3000);


