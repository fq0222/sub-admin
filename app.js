const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const connectDB = require('./db/mongoose');
const logger = require('./log/logger');

const adminRouter = require('./routes/admin');
const loginRouter = require('./routes/login');
const subRouter = require('./routes/subscribe');
const emailRouter = require('./routes/email');
const notifyRouter = require('./routes/notify');
const queryRouter = require('./routes/query');


const PORT = process.env.PORT || 12111;


// 连接 MongoDB
connectDB();

// 引入定时任务模块
require('./crontab/query_flow'); // 查询流量定时任务

app.use(cors()); // 允许所有来源发起的跨域请求
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'inline'); // 明确提示浏览器内联播放
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
      res.setHeader('Content-Disposition', 'inline'); // 明确提示浏览器内联播放
    } else if (filePath.endsWith('.ogg')) {
      res.setHeader('Content-Type', 'video/ogg');
      res.setHeader('Content-Disposition', 'inline'); // 明确提示浏览器内联播放
    }
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'nginx.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/payit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'payit.html'));
});

// 路由
app.use('/login', loginRouter);
app.use("/query", queryRouter);
app.use('/sub', subRouter);
// 以下需要鉴权
app.use('/admin', adminRouter);
app.use('/send', emailRouter);
app.use('/notify', notifyRouter);


app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
