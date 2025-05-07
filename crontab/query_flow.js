const cron = require('node-cron');
const logger = require('../log/logger');
const NodeInfo = require('../models/NodeInfo'); // 引入 NodeInfo 模型
const moment = require('moment-timezone'); // 引入 moment-timezone 模块

const xui_url = process.env.XUI_URL || 'http://localhost:21211/xui'; // XUI 的 URL

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取数据库中 NodeInfo 表中已售出节点的 email 列表
async function getEmailList() {
    try {
        // 查询已售出的节点，仅返回 email 字段
        const emails = await NodeInfo.find({ isSold: true }, 'email'); 
        return emails.map(record => record.email); // 提取 email 列表
    } catch (err) {
        logger.error(`获取已售出节点的 email 列表失败: ${err.message}`);
        throw new Error('获取已售出节点的 email 列表失败');
    }
}

// 封装任务为 queryFlow 函数
async function queryFlow() {
    logger.info('查询流量任务执行开始');

    try {
        // 获取已售出节点的 email 列表
        const emailList = await getEmailList();
        logger.info(`获取到的已售出节点 email 列表`);
  
        // 根据nodeinfo表中的邮箱查询向其他服务器请求该用户的流量
        // 遍历 emailList，向指定 URL 发送请求
        for (const email of emailList) {
            try {
                // 使用 fetch 替代 axios
                const response = await fetch(`${xui_url}/flow/${email}/flow`);
                if (!response.ok) {
                    throw new Error(`HTTP 请求失败，状态码: ${response.status}`);
                }

                const { usedTraffic, totalTraffic } = await response.json();
                // 将流量从字节转换为 GB
                const usedTrafficGB = (usedTraffic / (1024 ** 3)).toFixed(2); // 保留两位小数
                const totalTrafficGB = (totalTraffic / (1024 ** 3)).toFixed(2); // 保留两位小数
                // 打印返回的流量信息
                logger.info(`邮箱: ${email}, 已用流量: ${usedTrafficGB}, 总流量: ${totalTrafficGB}`);

                // 获取中国时区的当前时间
                const chinaTime = moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');

                // 更新流量信息和更新时间到 nodeinfo 表中
                await NodeInfo.updateOne(
                    { email },
                    { 
                        usedTraffic: usedTraffic, 
                        totalTraffic: totalTraffic,
                        trafficUpdateTime: chinaTime // 使用 moment-timezone 格式化的中国时区时间
                    }
                );
                logger.info(`更新邮箱: ${email} 的流量信息成功，更新时间: ${chinaTime}`);

                // 延时 1 秒，避免请求过快
                await delay(1000);
            } catch (err) {
                logger.error(`请求流量信息失败 (邮箱: ${email}): ${err.message}`);
            }
        }
    } catch (err) {
        logger.error(`查询流量任务失败: ${err.message}`);
    }

    logger.info('查询流量任务执行结束');
}

// 定时任务：每天凌晨 2 点执行
// cron.schedule('0 2 * * *', queryFlow);
// 定时任务：每两个小时执行一次
cron.schedule('0 */2 * * *', queryFlow);
// 测试2分钟一次
// cron.schedule('*/2 * * * *', queryFlow);
logger.info('定时任务模块已加载');

module.exports = queryFlow;
