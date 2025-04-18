const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const connectDB = require('./db/mongoose');
const logger = require('./log/logger');

const adminRouter = require('./routes/admin');
const loginRouter = require('./routes/login');
const subRouter = require('./routes/subscribe');


const PORT = process.env.PORT || 12111;


// 连接 MongoDB
connectDB();

app.use(cors()); // 允许所有来源发起的跨域请求
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件路径


// 路由
app.use('/admin', adminRouter);
app.use(loginRouter);
app.use(subRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'nginx.html'));
});


app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
