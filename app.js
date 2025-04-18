const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const connectDB = require('./db/mongoose');

const adminRouter = require('./routes/admin');
const loginRouter = require('./routes/login');
const subRouter = require('./routes/subscribe');


const PORT = process.env.PORT || 12110;


// 连接 MongoDB
connectDB();

app.use(cors()); // 允许所有来源发起的跨域请求
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件路径

// 重定向 /admin 到 /admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
// 重定向 /login 到 /login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 捕获所有未匹配的路由，返回nginx页面
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'nginx.html'));
});

// 路由
app.use('/admin', adminRouter);
app.use('/login', loginRouter);
app.use('/sub', subRouter);




app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
