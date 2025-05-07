module.exports = {
    apps: [
      {
        name: "sub-admin",
        script: "./app.js",
        env: {
          PORT: 80,
          SECRET_KEY: "reqdfedadge346fgser", // 可放入 .env 文件
          XUI_URL: "http://localhost:21211/xui", // 可放入 .env 文件
        },
        output: "/root/www/sub-admin/server_log/sub-admin-out.log", // 标准输出日志
        error: "/root/www/sub-admin/server_log/sub-admin-error.log", // 错误日志
        log: "/root/www/sub-admin/server_log/sub-admin-combined.log" // 合并日志
      }
    ]
  };
