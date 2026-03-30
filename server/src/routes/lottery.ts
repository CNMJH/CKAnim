import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../lib/db';

// 奖品类型
export type PrizeType = 'points' | 'item' | 'physical';

// 抽奖配置接口
export interface LotteryConfig {
  id?: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  dailyLimit: number; // 每日抽奖次数限制
  totalBudget?: number; // 总预算（积分）
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 奖品接口
export interface LotteryPrize {
  id?: number;
  configId: number;
  name: string;
  type: PrizeType;
  value: number; // 积分数量/道具 ID/实物 ID
  displayName: string; // 显示名称
  description?: string;
  image?: string; // 奖品图片
  probability: number; // 中奖概率（0-100）
  totalStock?: number; // 总库存
  remainingStock?: number; // 剩余库存
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 抽奖记录接口
export interface LotteryRecord {
  id?: number;
  userId: number;
  configId: number;
  prizeId?: number;
  prizeType?: PrizeType;
  prizeName?: string;
  prizeValue?: number;
  drawDate: string;
  createdAt?: string;
}

/**
 * 验证概率和是否为 100
 */
function validateProbability(prizes: LotteryPrize[]): { valid: boolean; total: number } {
  const total = prizes.reduce((sum, p) => sum + p.probability, 0);
  return {
    valid: total === 100,
    total,
  };
}

/**
 * 根据概率随机抽取奖品
 */
function drawPrize(prizes: LotteryPrize[]): LotteryPrize | null {
  const enabledPrizes = prizes.filter(p => p.enabled && (!p.remainingStock || p.remainingStock > 0));
  
  if (enabledPrizes.length === 0) {
    return null;
  }

  const random = Math.random() * 100;
  let cumulative = 0;

  for (const prize of enabledPrizes) {
    cumulative += prize.probability;
    if (random <= cumulative) {
      return prize;
    }
  }

  // 如果没有命中任何奖品（概率和不足 100 时）
  return null;
}

export async function lotteryRoutes(server: FastifyInstance) {
  // ========== 管理员路由 ==========

  /**
   * 获取所有抽奖配置
   */
  server.get('/admin/lottery/configs', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const configs = await db.all(`
          SELECT * FROM lottery_configs 
          ORDER BY createdAt DESC
        `);
        return reply.send({ configs });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 获取单个抽奖配置及奖品列表
   */
  server.get('/admin/lottery/configs/:id', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };
        const config = await db.get('SELECT * FROM lottery_configs WHERE id = ?', [id]);
        
        if (!config) {
          return reply.code(404).send({ error: 'Not Found', message: '配置不存在' });
        }

        const prizes = await db.all('SELECT * FROM lottery_prizes WHERE configId = ?', [id]);
        
        return reply.send({ config, prizes });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 创建抽奖配置
   */
  server.post('/admin/lottery/configs', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const body = request.body as LotteryConfig;
        
        const result = await db.run(`
          INSERT INTO lottery_configs (name, description, startDate, endDate, dailyLimit, totalBudget, enabled, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [body.name, body.description, body.startDate, body.endDate, body.dailyLimit, body.totalBudget, body.enabled ? 1 : 0]);

        return reply.send({ 
          id: result.lastID,
          message: '创建成功'
        });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 更新抽奖配置
   */
  server.put('/admin/lottery/configs/:id', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as LotteryConfig;

        await db.run(`
          UPDATE lottery_configs 
          SET name = ?, description = ?, startDate = ?, endDate = ?, dailyLimit = ?, totalBudget = ?, enabled = ?, updatedAt = datetime('now')
          WHERE id = ?
        `, [body.name, body.description, body.startDate, body.endDate, body.dailyLimit, body.totalBudget, body.enabled ? 1 : 0, id]);

        return reply.send({ message: '更新成功' });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 删除抽奖配置
   */
  server.delete('/admin/lottery/configs/:id', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };

        await db.run('DELETE FROM lottery_prizes WHERE configId = ?', [id]);
        await db.run('DELETE FROM lottery_records WHERE configId = ?', [id]);
        await db.run('DELETE FROM lottery_configs WHERE id = ?', [id]);

        return reply.send({ message: '删除成功' });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // ========== 奖品管理 ==========

  /**
   * 获取奖品列表
   */
  server.get('/admin/lottery/configs/:configId/prizes', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { configId } = request.params as { configId: string };
        const prizes = await db.all('SELECT * FROM lottery_prizes WHERE configId = ? ORDER BY probability DESC', [configId]);
        
        const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
        
        return reply.send({ prizes, totalProbability });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 创建奖品
   */
  server.post('/admin/lottery/configs/:configId/prizes', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { configId } = request.params as { configId: string };
        const prize = request.body as Omit<LotteryPrize, 'id' | 'createdAt' | 'updatedAt'>;

        const result = await db.run(`
          INSERT INTO lottery_prizes (configId, name, type, value, displayName, description, image, probability, totalStock, remainingStock, enabled, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [configId, prize.name, prize.type, prize.value, prize.displayName, prize.description, prize.image, prize.probability, prize.totalStock, prize.totalStock, prize.enabled ? 1 : 0]);

        return reply.send({ 
          id: result.lastID,
          message: '创建成功'
        });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 更新奖品
   */
  server.put('/admin/lottery/prizes/:id', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };
        const prize = request.body as Omit<LotteryPrize, 'id' | 'createdAt' | 'updatedAt'>;

        await db.run(`
          UPDATE lottery_prizes 
          SET name = ?, type = ?, value = ?, displayName = ?, description = ?, image = ?, probability = ?, totalStock = ?, remainingStock = ?, enabled = ?, updatedAt = datetime('now')
          WHERE id = ?
        `, [prize.name, prize.type, prize.value, prize.displayName, prize.description, prize.image, prize.probability, prize.totalStock, prize.remainingStock, prize.enabled ? 1 : 0, id]);

        return reply.send({ message: '更新成功' });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 删除奖品
   */
  server.delete('/admin/lottery/prizes/:id', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };
        await db.run('DELETE FROM lottery_prizes WHERE id = ?', [id]);
        return reply.send({ message: '删除成功' });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 获取抽奖记录
   */
  server.get('/admin/lottery/records', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        await server.jwt.verify(token);
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const { configId, userId, page = '1', limit = '20' } = request.query as { configId?: string; userId?: string; page?: string; limit?: string };
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let whereClause = '1=1';
        const params: any[] = [];
        
        if (configId) {
          whereClause += ' AND r.configId = ?';
          params.push(configId);
        }
        if (userId) {
          whereClause += ' AND r.userId = ?';
          params.push(userId);
        }

        const records = await db.all(`
          SELECT r.*, u.username, u.nickname
          FROM lottery_records r
          LEFT JOIN users u ON r.userId = u.id
          WHERE ${whereClause}
          ORDER BY r.drawDate DESC
          LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), offset]);

        const total = await db.get(`
          SELECT COUNT(*) as count
          FROM lottery_records r
          WHERE ${whereClause}
        `, params);

        return reply.send({ 
          records, 
          total: total?.count || 0,
          page: parseInt(page),
          limit: parseInt(limit)
        });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // ========== 用户抽奖路由 ==========

  /**
   * 获取当前有效的抽奖配置
   */
  server.get('/lottery/active', {
    async handler(request, reply) {
      try {
        const config = await db.get(`
          SELECT * FROM lottery_configs 
          WHERE enabled = 1 AND date('now') BETWEEN date(startDate) AND date(endDate)
          ORDER BY createdAt DESC
          LIMIT 1
        `);

        if (!config) {
          return reply.send({ config: null, prizes: [] });
        }

        const prizes = await db.all('SELECT * FROM lottery_prizes WHERE configId = ? AND enabled = 1', [config.id]);
        
        return reply.send({ config, prizes });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 获取用户今日剩余抽奖次数
   */
  server.get('/lottery/daily-count', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        const decoded: any = await server.jwt.verify(token);
        (request as any).userId = decoded.userId;
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const userId = (request as any).userId;
        const today = new Date().toISOString().split('T')[0];

        const config = await db.get(`
          SELECT * FROM lottery_configs 
          WHERE enabled = 1 AND date('now') BETWEEN date(startDate) AND date(endDate)
          LIMIT 1
        `);

        if (!config) {
          return reply.send({ remaining: 0, total: 0 });
        }

        const used = await db.get(`
          SELECT COUNT(*) as count FROM lottery_records 
          WHERE userId = ? AND date(drawDate) = ? AND configId = ?
        `, [userId, today, config.id]);

        return reply.send({ 
          remaining: config.dailyLimit - (used?.count || 0),
          total: config.dailyLimit
        });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 执行抽奖
   */
  server.post('/lottery/draw', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        const decoded: any = await server.jwt.verify(token);
        (request as any).userId = decoded.userId;
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const userId = (request as any).userId;
        const today = new Date().toISOString().split('T')[0];

        // 获取有效配置
        const config = await db.get(`
          SELECT * FROM lottery_configs 
          WHERE enabled = 1 AND date('now') BETWEEN date(startDate) AND date(endDate)
          LIMIT 1
        `);

        if (!config) {
          return reply.code(400).send({ error: 'Bad Request', message: '当前没有进行中的抽奖活动' });
        }

        // 检查抽奖次数
        const used = await db.get(`
          SELECT COUNT(*) as count FROM lottery_records 
          WHERE userId = ? AND date(drawDate) = ? AND configId = ?
        `, [userId, today, config.id]);

        if ((used?.count || 0) >= config.dailyLimit) {
          return reply.code(400).send({ error: 'Bad Request', message: '今日抽奖次数已用完' });
        }

        // 获取奖品列表
        const prizes = await db.all('SELECT * FROM lottery_prizes WHERE configId = ? AND enabled = 1', [config.id]);

        if (prizes.length === 0) {
          return reply.code(400).send({ error: 'Bad Request', message: '没有可用的奖品' });
        }

        // 抽奖
        const prize = drawPrize(prizes);

        // 记录抽奖结果
        const result = await db.run(`
          INSERT INTO lottery_records (userId, configId, prizeId, prizeType, prizeName, prizeValue, drawDate, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [userId, config.id, prize?.id, prize?.type, prize?.displayName, prize?.value, today]);

        // 如果中奖且有限库存，减少库存
        if (prize && prize.remainingStock && prize.remainingStock > 0) {
          await db.run('UPDATE lottery_prizes SET remainingStock = remainingStock - 1 WHERE id = ?', [prize.id]);
        }

        // 如果奖品是积分，给用户增加积分
        if (prize && prize.type === 'points') {
          await db.run(`
            UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?
          `, [prize.value, userId]);
        }

        return reply.send({ 
          prize: prize ? {
            id: prize.id,
            name: prize.displayName,
            type: prize.type,
            value: prize.value,
            description: prize.description,
            image: prize.image
          } : null,
          recordId: result.lastID
        });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  /**
   * 获取用户抽奖记录
   */
  server.get('/lottery/records', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) return reply.code(401).send({ error: 'Unauthorized' });
        const decoded: any = await server.jwt.verify(token);
        (request as any).userId = decoded.userId;
      } catch {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }],
    async handler(request, reply) {
      try {
        const userId = (request as any).userId;
        const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
        
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const records = await db.all(`
          SELECT * FROM lottery_records 
          WHERE userId = ?
          ORDER BY drawDate DESC
          LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), offset]);

        const total = await db.get(`
          SELECT COUNT(*) as count FROM lottery_records WHERE userId = ?
        `, [userId]);

        return reply.send({ 
          records, 
          total: total?.count || 0,
          page: parseInt(page),
          limit: parseInt(limit)
        });
      } catch (error) {
        return reply.code(500).send({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });
}
