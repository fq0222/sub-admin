# sub-admin
自助服务


### 方法 ：使用 `PM2`（推荐）
`PM2` 是一个专门用于管理 Node.js 应用的进程管理工具，支持后台运行、日志管理和自动重启。

1. 全局安装 `PM2`：
   ```bash
   npm install -g pm2
   ```

2. 启动服务：
   ```bash
   pm2 start npm --name "my-server" -- run server
   ```

3. 查看服务状态：
   ```bash
   pm2 status
   ```

4. 如果需要停止服务：
   ```bash
   pm2 stop my-server
   ```

5. 设置服务开机自启：
   ```bash
   pm2 startup
   pm2 save
   ```

---

### 总结
- **简单场景**：使用 `nohup` 或 `screen`/`tmux`。
- **生产环境**：推荐使用 `PM2`，它提供更强大的管理功能，包括日志、自动重启和开机自启。

---

### 方法 ：通过 `ecosystem.config.js` 配置文件设置
使用 `PM2` 的配置文件可以更方便地管理日志路径。

1. 在项目根目录创建 `ecosystem.config.js` 文件：
   ```bash
   touch ecosystem.config.js
   ```

2. 编辑 `ecosystem.config.js` 文件，添加以下内容：
   ```javascript
   module.exports = {
     apps: [
       {
         name: "sub-admin",
         script: "./app.js",
         env: {
           NODE_ENV: "production",
           PORT: 80
         },
         output: "/var/log/pm2/sub-admin-out.log", // 标准输出日志
         error: "/var/log/pm2/sub-admin-error.log", // 错误日志
         log: "/var/log/pm2/sub-admin-combined.log" // 合并日志
       }
     ]
   };
   ```

3. 使用配置文件启动服务：
   ```bash
   pm2 start ecosystem.config.js
   ```

---
