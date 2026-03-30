#!/usr/bin/env node
/**
 * 数据库迁移脚本 - 添加每日抽奖功能
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/var/www/ckanim/server/data/prod.db'
  : path.join(__dirname, '../data/dev.db');

console.log(`📌 数据库路径：${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // 1. 创建抽奖配置表
  db.run(`
    CREATE TABLE IF NOT EXISTS lottery_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      dailyLimit INTEGER DEFAULT 1,
      totalBudget INTEGER,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT
    )
  `, (err) => {
    if (err) {
      console.error('❌ 创建 lottery_configs 表失败:', err.message);
    } else {
      console.log('✅ 创建 lottery_configs 表成功');
    }
  });

  // 2. 创建奖品表
  db.run(`
    CREATE TABLE IF NOT EXISTS lottery_prizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      configId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('points', 'item', 'physical')),
      value INTEGER NOT NULL,
      displayName TEXT NOT NULL,
      description TEXT,
      image TEXT,
      probability REAL NOT NULL DEFAULT 0,
      totalStock INTEGER,
      remainingStock INTEGER,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (configId) REFERENCES lottery_configs(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ 创建 lottery_prizes 表失败:', err.message);
    } else {
      console.log('✅ 创建 lottery_prizes 表成功');
    }
  });

  // 3. 创建抽奖记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS lottery_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      configId INTEGER NOT NULL,
      prizeId INTEGER,
      prizeType TEXT CHECK(prizeType IN ('points', 'item', 'physical')),
      prizeName TEXT,
      prizeValue INTEGER,
      drawDate TEXT NOT NULL,
      createdAt TEXT,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (configId) REFERENCES lottery_configs(id),
      FOREIGN KEY (prizeId) REFERENCES lottery_prizes(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ 创建 lottery_records 表失败:', err.message);
    } else {
      console.log('✅ 创建 lottery_records 表成功');
    }
  });

  // 4. 创建索引
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_lottery_records_userId ON lottery_records(userId);
  `, (err) => {
    if (err) {
      console.error('❌ 创建索引失败:', err.message);
    } else {
      console.log('✅ 创建索引成功');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_lottery_records_drawDate ON lottery_records(drawDate);
  `, (err) => {
    if (err) {
      console.error('❌ 创建索引失败:', err.message);
    } else {
      console.log('✅ 创建索引成功');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_lottery_prizes_configId ON lottery_prizes(configId);
  `, (err) => {
    if (err) {
      console.error('❌ 创建索引失败:', err.message);
    } else {
      console.log('✅ 创建索引成功');
    }
  });

  // 5. 插入示例数据
  db.run(`
    INSERT INTO lottery_configs (name, description, startDate, endDate, dailyLimit, totalBudget, enabled, createdAt)
    VALUES (
      '每日幸运抽奖',
      '每日登录即可参与抽奖，赢取积分、道具和实物大奖！',
      date('now'),
      date('now', '+30 days'),
      3,
      100000,
      1,
      datetime('now')
    )
  `, function(err) {
    if (err) {
      console.error('❌ 插入示例配置失败:', err.message);
      db.close();
      console.log('\n🎉 数据库迁移完成！');
      return;
    }
    
    console.log('✅ 插入示例配置成功');
    
    // 获取刚插入的配置 ID
    const configId = this.lastID;
    
    // 插入示例奖品
    const prizes = [
      { name: '10 积分', type: 'points', value: 10, displayName: '10 积分', probability: 50 },
      { name: '50 积分', type: 'points', value: 50, displayName: '50 积分', probability: 25 },
      { name: '100 积分', type: 'points', value: 100, displayName: '100 积分', probability: 10 },
      { name: '抽奖券', type: 'item', value: 1, displayName: '额外抽奖券', description: '可获得一次额外抽奖机会', probability: 8 },
      { name: 'VIP 体验卡', type: 'item', value: 7, displayName: '7 天 VIP 体验卡', description: 'VIP 会员体验 7 天', probability: 5 },
      { name: '定制周边', type: 'physical', value: 1, displayName: 'CKAnim 定制鼠标垫', description: '高品质游戏鼠标垫', probability: 1.5 },
      { name: '机械键盘', type: 'physical', value: 2, displayName: 'CKAnim 定制机械键盘', description: 'RGB 背光机械键盘', probability: 0.5 },
    ];
    
    const stmt = db.prepare(`
      INSERT INTO lottery_prizes (configId, name, type, value, displayName, description, probability, totalStock, remainingStock, enabled, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `);
    
    prizes.forEach(prize => {
      let totalStock = null;
      if (prize.type === 'physical') {
        totalStock = prize.value * 100; // 实物奖品设置库存
      }
      
      stmt.run(configId, prize.name, prize.type, prize.value, prize.displayName, prize.description || null, prize.probability, totalStock, totalStock);
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error('❌ 插入示例奖品失败:', err.message);
      } else {
        console.log(`✅ 插入 ${prizes.length} 个示例奖品成功`);
      }
      
      db.close();
      console.log('\n🎉 数据库迁移完成！');
    });
  });
});
