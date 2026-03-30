import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/db';

// 奖品类型
export type PrizeType = 'points' | 'item' | 'physical';

/**
 * 根据概率随机抽取奖品
 */
function drawPrize(prizes: any[]): any | null {
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

  return null;
}

export async function lotteryRoutes(server: FastifyInstance) {
  // ========== 管理员路由 ==========

  /**
   * 获取所有抽奖配置
   */
  server.get('/admin/lottery/configs', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const configs = await prisma.lotteryConfig.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return reply.send({ configs });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 获取单个抽奖配置及奖品列表
   */
  server.get('/admin/lottery/configs/:id', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const config = await prisma.lotteryConfig.findUnique({
        where: { id: parseInt(id) },
        include: { prizes: true },
      });
      
      if (!config) {
        return reply.code(404).send({ error: 'Not Found', message: '配置不存在' });
      }
      
      return reply.send({ config, prizes: config.prizes });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 创建抽奖配置
   */
  server.post('/admin/lottery/configs', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const body = request.body as any;
      
      const config = await prisma.lotteryConfig.create({
        data: {
          name: body.name,
          description: body.description,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          dailyLimit: body.dailyLimit,
          totalBudget: body.totalBudget,
          enabled: body.enabled,
        },
      });

      return reply.send({ 
        id: config.id,
        message: '创建成功'
      });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 更新抽奖配置
   */
  server.put('/admin/lottery/configs/:id', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      await prisma.lotteryConfig.update({
        where: { id: parseInt(id) },
        data: {
          name: body.name,
          description: body.description,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          dailyLimit: body.dailyLimit,
          totalBudget: body.totalBudget,
          enabled: body.enabled,
        },
      });

      return reply.send({ message: '更新成功' });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 删除抽奖配置
   */
  server.delete('/admin/lottery/configs/:id', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Prisma 会自动删除关联的奖品和记录（CASCADE）
      await prisma.lotteryConfig.delete({
        where: { id: parseInt(id) },
      });

      return reply.send({ message: '删除成功' });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ========== 奖品管理 ==========

  /**
   * 获取奖品列表
   */
  server.get('/admin/lottery/configs/:configId/prizes', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { configId } = request.params as { configId: string };
      const prizes = await prisma.lotteryPrize.findMany({
        where: { configId: parseInt(configId) },
        orderBy: { probability: 'desc' },
      });
      
      const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
      
      return reply.send({ prizes, totalProbability });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 创建奖品
   */
  server.post('/admin/lottery/configs/:configId/prizes', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { configId } = request.params as { configId: string };
      const body = request.body as any;

      const prize = await prisma.lotteryPrize.create({
        data: {
          configId: parseInt(configId),
          name: body.name,
          type: body.type,
          value: body.value,
          displayName: body.displayName,
          description: body.description,
          image: body.image,
          probability: body.probability,
          totalStock: body.totalStock,
          remainingStock: body.totalStock,
          enabled: body.enabled,
        },
      });
      
      return reply.send({ 
        id: prize.id,
        message: '创建成功'
      });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 更新奖品
   */
  server.put('/admin/lottery/prizes/:id', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      await prisma.lotteryPrize.update({
        where: { id: parseInt(id) },
        data: {
          name: body.name,
          type: body.type,
          value: body.value,
          displayName: body.displayName,
          description: body.description,
          image: body.image,
          probability: body.probability,
          totalStock: body.totalStock,
          remainingStock: body.remainingStock,
          enabled: body.enabled,
        },
      });

      return reply.send({ message: '更新成功' });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 删除奖品
   */
  server.delete('/admin/lottery/prizes/:id', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.lotteryPrize.delete({
        where: { id: parseInt(id) },
      });

      return reply.send({ message: '删除成功' });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 获取抽奖记录（管理员）
   */
  server.get('/admin/lottery/records', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const query = request.query as any;
      const { configId, userId, page = '1', limit = '20' } = query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const where: any = {};
      if (configId) where.configId = parseInt(configId);
      if (userId) where.userId = parseInt(userId);

      const records = await prisma.lotteryRecord.findMany({
        where,
        include: {
          user: { select: { username: true } },
        },
        orderBy: { drawDate: 'desc' },
        take: parseInt(limit),
        skip: offset,
      });

      const total = await prisma.lotteryRecord.count({ where });

      return reply.send({ 
        records, 
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ========== 用户抽奖路由 ==========

  /**
   * 获取当前有效的抽奖配置
   */
  server.get('/lottery/active', async (request, reply) => {
    try {
      const now = new Date();
      const config = await prisma.lotteryConfig.findFirst({
        where: {
          enabled: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!config) {
        return reply.send({ config: null, prizes: [] });
      }

      const prizes = await prisma.lotteryPrize.findMany({
        where: { configId: config.id, enabled: true },
      });
      
      return reply.send({ config, prizes });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 获取用户今日剩余抽奖次数
   */
  server.get('/lottery/daily-count', {
    preHandler: [server.authenticateUser],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const config = await prisma.lotteryConfig.findFirst({
        where: {
          enabled: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!config) {
        return reply.send({ remaining: 0, total: 0 });
      }

      const used = await prisma.lotteryRecord.count({
        where: {
          userId,
          configId: config.id,
          drawDate: { gte: today },
        },
      });

      return reply.send({ 
        remaining: config.dailyLimit - used,
        total: config.dailyLimit
      });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 执行抽奖
   */
  server.post('/lottery/draw', {
    preHandler: [server.authenticateUser],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 获取有效配置
      const config = await prisma.lotteryConfig.findFirst({
        where: {
          enabled: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      });

      if (!config) {
        return reply.code(400).send({ error: 'Bad Request', message: '当前没有进行中的抽奖活动' });
      }

      // 检查抽奖次数
      const used = await prisma.lotteryRecord.count({
        where: {
          userId,
          configId: config.id,
          drawDate: { gte: today },
        },
      });

      if (used >= config.dailyLimit) {
        return reply.code(400).send({ error: 'Bad Request', message: '今日抽奖次数已用完' });
      }

      // 获取奖品列表
      const prizes = await prisma.lotteryPrize.findMany({
        where: { configId: config.id, enabled: true },
      });

      if (prizes.length === 0) {
        return reply.code(400).send({ error: 'Bad Request', message: '没有可用的奖品' });
      }

      // 抽奖
      const prize = drawPrize(prizes);

      // 记录抽奖结果
      const record = await prisma.lotteryRecord.create({
        data: {
          userId,
          configId: config.id,
          prizeId: prize?.id,
          prizeType: prize?.type,
          prizeName: prize?.displayName,
          prizeValue: prize?.value,
          drawDate: new Date(),
        },
      });

      // 如果中奖且有限库存，减少库存
      if (prize && prize.remainingStock && prize.remainingStock > 0) {
        await prisma.lotteryPrize.update({
          where: { id: prize.id },
          data: { remainingStock: prize.remainingStock - 1 },
        });
      }

      // 如果奖品是积分，给用户增加积分（需要 users 表有 points 字段）
      // 暂时跳过积分处理，因为没有 points 字段

      return reply.send({ 
        prize: prize ? {
          id: prize.id,
          name: prize.displayName,
          type: prize.type,
          value: prize.value,
          description: prize.description,
          image: prize.image
        } : null,
        recordId: record.id
      });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * 获取用户抽奖记录
   */
  server.get('/lottery/records', {
    preHandler: [server.authenticateUser],
  }, async (request, reply) => {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const query = request.query as any;
      const { page = '1', limit = '20' } = query;
      
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const records = await prisma.lotteryRecord.findMany({
        where: { userId },
        orderBy: { drawDate: 'desc' },
        take: parseInt(limit),
        skip: offset,
      });

      const total = await prisma.lotteryRecord.count({
        where: { userId },
      });

      return reply.send({ 
        records, 
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      return reply.code(500).send({ 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}