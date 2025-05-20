const cron = require('node-cron');
const logger = require('../log/logger');
const NodeInfo = require('../models/NodeInfo'); // 引入 NodeInfo 模型
const moment = require('moment-timezone'); // 引入 moment-timezone 模块
const crypto = require('crypto');

const xui_url = process.env.XUI_URL || 'http://localhost:21211/xuiop'; // XUI 的 URL
const api_key = process.env.API_KEY || 'your-key'; // API 密钥

// 随机生成vless的UUID
function generateVlessUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
        .replace(/[018]/g, c =>
            (c ^ crypto.randomBytes(1)[0] & (15 >> (c / 4))).toString(16)
        );
}

// 获取找到的过期节点的 UUID
async function getUUID(node) {
    try {
        const list = node.vlessList.trim().split('\n'); // 每行一个 vless
        const firstVless = list.find(line => line.startsWith('vless://'));
        if (!firstVless) {
            return null;
        }

        const afterProtocol = firstVless.split('vless://')[1];
        const uuid = afterProtocol.split('@')[0];
        return uuid;
    } catch (err) {
        logger.error('getUUID Error fetching UUID:', err);
        return null;
    }
}

// 调用 xuiop 接口清空上下行流量
async function clearClientFlow(email) {
    try {
        const response = await fetch(`${xui_url}/flow/${email}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            logger.info(`清空流量成功: 邮箱: ${email}`);
        } else {
            const errorText = await response.text();
            logger.error(`清空流量失败: 邮箱: ${email}, 错误: ${errorText}`);
        }
    } catch (err) {
        logger.error(`清空流量请求异常: 邮箱: ${email}, 错误: ${err.message}`);
    }
}

const updateEmail = async (id, email) => {
    try {
        const response = await fetch(`${xui_url}/uuid/${id}/email`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (response.ok) {
            logger.info(`updateEmail 更新成功: ${id}-[${email}]`);
        } else {
            logger.error(`updateEmail 更新失败: ${id}-[${email}]`);
        }
    } catch (err) {
        logger.error(`updateEmail 请求异常: ${err.message}`);
    }
};

const updateUUID = async (id, newUUID) => {
    try {
        const response = await fetch(`${xui_url}/uuid/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${api_key}`
            },
            body: JSON.stringify({ newId: newUUID })
        });

        if (response.ok) {
            logger.info(`updateUUID 更新成功: ${id} -> ${newUUID}`);
        } else {
            const errorText = await response.text();
            logger.error(`updateUUID 更新失败: ${id} -> ${newUUID}, 错误: ${errorText}`);
        }
    } catch (err) {
        logger.error(`updateUUID 请求异常: ${err.message}`);
    }
};

// 替换 vlessList 中每一个 VLESS 节点的 UUID
function replaceUUIDsInVlessList(vlessList, newUUID) {
    // 将 vlessList 按行分割
    const vlessLines = vlessList.trim().split('\n');

    // 遍历每一行，替换 UUID
    const updatedVlessLines = vlessLines.map(line => {
        if (line.startsWith('vless://')) {
            const parts = line.split('vless://');
            const afterProtocol = parts[1];
            const oldUUID = afterProtocol.split('@')[0]; // 提取旧的 UUID
            return line.replace(oldUUID, newUUID); // 替换旧的 UUID 为新的 UUID
        }
        return line; // 如果不是 vless:// 开头的行，保持不变
    });

    // 将更新后的行重新拼接为字符串
    return updatedVlessLines.join('\n');
}

// 调用 xuiop 接口重启 x-ui
async function restartXUI() {
    try {
        const response = await fetch(`${xui_url}/restart`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            logger.info('restartXUI: x-ui 重启成功');
        } else {
            const errorText = await response.text();
            logger.error(`restartXUI: x-ui 重启失败，错误: ${errorText}`);
        }
    } catch (err) {
        logger.error(`restartXUI: x-ui 重启请求异常，错误: ${err.message}`);
    }
}

// 定时任务：检查已售出节点是否过期
async function checkExpiredNodes() {
    logger.info('checkExpiredNodes 定时任务执行开始');

    try {
        // 获取当前时间
        const now = moment().tz('Asia/Shanghai').toDate();

        // 查询已售出且已过期的节点
        const expiredNodes = await NodeInfo.find({ isSold: true, endTime: { $lt: now } });

        if (expiredNodes.length > 0) {
            logger.info(`checkExpiredNodes 发现 ${expiredNodes.length} 个已过期的节点:`);
            for (const node of expiredNodes) {
                logger.info(`checkExpiredNodes 过期节点: 邮箱: ${node.email}, 到期时间: ${moment(node.endTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')}`);
                
                // 调用接口清空上下行流量
                await clearClientFlow(node.email);

                // 获取 UUID
                const uuid = await getUUID(node);
                if (uuid) {
                    logger.info(`checkExpiredNodes 过期节点的 UUID: ${uuid}`);
                    
                    // 随机生成一个无效的邮箱
                    const randomEmail = `${Math.random().toString(36).substring(2, 15)}@xray.com`;
                    logger.info(`checkExpiredNodes 随机生成的邮箱: ${randomEmail}`);
                    
                    // 调用 xuiop 接口根据 UUID 修改节点的 email
                    await updateEmail(uuid, randomEmail);

                    // 随机生成一个新的 VLESS UUID
                    const randomVlessUUID = generateVlessUUID();
                    logger.info(`checkExpiredNodes 随机生成的 VLESS UUID: ${randomVlessUUID}`);
                    
                    // 调用 xuiop 接口更新节点的 UUID
                    await updateUUID(uuid, randomVlessUUID);

                    // 最后更新new uuid到当前的node的vlessList中uuid的位置
                    const updatedVlessList = replaceUUIDsInVlessList(node.vlessList, randomVlessUUID);
                    // 更新当前node，将email和vlessList,是否售出更新为false
                    await NodeInfo.updateOne(
                        { email: node.email },
                        {
                            $set: {
                                email: randomEmail,
                                vlessList: updatedVlessList,
                                usedTraffic: 0,
                                isSold: false
                            }
                        }
                    );
                } else {
                    logger.error(`checkExpiredNodes 未能获取到过期节点的 UUID`);
                }
            }
            // 全部动作完成后，调用 xuiop 接口重启 x-ui
            await restartXUI();
            logger.info('checkExpiredNodes: 所有过期节点处理完成，已调用 x-ui 重启接口');
        } else {
            logger.info('checkExpiredNodes 未发现已过期的节点');
        }
    } catch (err) {
        logger.error(`checkExpiredNodes 定时任务失败: ${err.message}`);
    }

    logger.info('checkExpiredNodes 定时任务执行结束');
}

// 定时任务：每天凌晨 3 点执行
cron.schedule('0 3 * * *', checkExpiredNodes, { timezone: 'Asia/Shanghai' });

logger.info('checkExpiredNodes 定时任务模块已加载');

// 启动时立即执行一次
setTimeout(() => {
    // 等待15秒，等待数据库连接完成
    logger.info('checkExpiredNodes 定时任务在系统启动时立即执行');
    checkExpiredNodes();
}, 15000);

module.exports = checkExpiredNodes;
