import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';
import {
  getUploadToken,
  generateFileKey,
  getFileUrl,
  deleteFile,
} from '../lib/qiniu.js';

// VIP 等级上传限制（单位：字节）- 默认值（当数据库无配置时使用）
const DEFAULT_VIP_LIMITS: any = {
  // 普通用户
  'free': { maxFileSize: 0, maxTotalSize: 0 },
  // VIP 月卡
  'vip_monthly': { maxFileSize: 30 * 1024 * 1024, maxTotalSize: 500 * 1024 * 1024 },
  // VIP 年卡
  'vip_yearly': { maxFileSize: 100 * 1024 * 1024, maxTotalSize: 10 * 1024 * 1024 * 1024 },
  // 永久 SVIP
  'vip_lifetime': { maxFileSize: 200 * 1024 * 1024, maxTotalSize: 50 * 1024 * 1024 * 1024 },
};

// 从数据库获取 VIP 限制配置
async function getVipLimitsFromDb() {
  try {
    const settings = await prisma.userLibrarySettings.findMany({
      where: {
        key: {
          in: ['vip_limits_free', 'vip_limits_vip_monthly', 'vip_limits_vip_yearly', 'vip_limits_vip_lifetime']
        }
      }
    });
    
    const limits: any = { ...DEFAULT_VIP_LIMITS };
    
    for (const setting of settings) {
      try {
        const parsed = JSON.parse(setting.value);
        const keyMap: any = {
          'vip_limits_free': 'free',
          'vip_limits_vip_monthly': 'vip_monthly',
          'vip_limits_vip_yearly': 'vip_yearly',
          'vip_limits_vip_lifetime': 'vip_lifetime',
        };
        const vipKey = keyMap[setting.key];
        if (vipKey && parsed.maxFileSize !== undefined && parsed.maxTotalSize !== undefined) {
          limits[vipKey] = {
            maxFileSize: parsed.maxFileSize,
            maxTotalSize: parsed.maxTotalSize,
          };
        }
      } catch (e) {
        // JSON 解析失败，使用默认值
      }
    }
    
    return limits;
  } catch (error) {
    // 数据库查询失败，使用默认值
    return DEFAULT_VIP_LIMITS;
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

// 获取用户的 VIP 限制
async function getUserVipLimits(userId: number) {
  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vipLevel: true }
  });

  // 将 vipLevel 转换为 vipPlan (兼容旧数据)
  const vipLevel = user?.vipLevel || 'none';
  const vipPlan = vipLevel === 'none' ? 'free' : vipLevel;
  
  // 从数据库获取 VIP 限制配置
  const vipLimits = await getVipLimitsFromDb();
  const limits = vipLimits[vipPlan] || vipLimits['free'];

  // 计算已使用空间
  const videos = await prisma.userLibraryVideo.findMany({
    where: { userId },
    select: { fileSize: true }
  });

  const usedSize = videos.reduce((sum, v) => sum + v.fileSize, 0);
  const remainingSize = Math.max(0, limits.maxTotalSize - usedSize);

  return {
    vipPlan,
    maxFileSize: limits.maxFileSize,
    maxTotalSize: limits.maxTotalSize,
    usedSize,
    remainingSize,
    maxFileSizeFormatted: formatFileSize(limits.maxFileSize),
    maxTotalSizeFormatted: formatFileSize(limits.maxTotalSize),
    usedSizeFormatted: formatFileSize(usedSize),
    remainingSizeFormatted: formatFileSize(remainingSize),
  };
}

export const userLibraryRoutes: FastifyPluginAsync = async (server) => {
  // ==================== 分类管理 ====================
  
  // 获取所有分类
  server.get(
    '/user-library/categories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const categories = await prisma.userLibraryCategory.findMany({
          where: { userId: request.user!.userId },
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { characters: true }
            }
          }
        });
        reply.send({ categories });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取分类失败' });
      }
    }
  );

  // 创建分类
  server.post(
    '/user-library/categories',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { name, icon, iconUrl } = request.body as {
          name: string;
          icon?: string;
          iconUrl?: string;
        };

        if (!name) {
          return reply.code(400).send({ error: '分类名称不能为空' });
        }

        const category = await prisma.userLibraryCategory.create({
          data: {
            userId: request.user!.userId,
            name,
            icon,
            iconUrl,
          },
        });

        reply.send({ category });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '创建分类失败' });
      }
    }
  );

  // 更新分类
  server.put(
    '/user-library/categories/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { name, icon, iconUrl, order } = request.body as {
          name?: string;
          icon?: string;
          iconUrl?: string;
          order?: number;
        };

        const category = await prisma.userLibraryCategory.findUnique({
          where: { id: parseInt(id) },
        });

        if (!category) {
          return reply.code(404).send({ error: '分类不存在' });
        }

        if (category.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此分类' });
        }

        const updated = await prisma.userLibraryCategory.update({
          where: { id: parseInt(id) },
          data: { name, icon, iconUrl, order },
        });

        reply.send({ category: updated });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '更新分类失败' });
      }
    }
  );

  // 删除分类
  server.delete(
    '/user-library/categories/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const category = await prisma.userLibraryCategory.findUnique({
          where: { id: parseInt(id) },
        });

        if (!category) {
          return reply.code(404).send({ error: '分类不存在' });
        }

        if (category.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此分类' });
        }

        await prisma.userLibraryCategory.delete({
          where: { id: parseInt(id) },
        });

        reply.send({ success: true });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '删除分类失败' });
      }
    }
  );

  // ==================== 角色管理 ====================
  
  // 获取所有角色
  server.get(
    '/user-library/characters',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { categoryId } = request.query as { categoryId?: string };
        
        const where: any = { userId: request.user!.userId };
        if (categoryId) {
          where.categoryId = categoryId === 'null' ? null : parseInt(categoryId);
        }

        const characters = await prisma.userLibraryCharacter.findMany({
          where,
          orderBy: { order: 'asc' },
          include: {
            category: true,
            _count: {
              select: { actions: true }
            }
          }
        });

        reply.send({ characters });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取角色失败' });
      }
    }
  );

  // 创建角色
  server.post(
    '/user-library/characters',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { name, avatar, description, categoryId } = request.body as {
          name: string;
          avatar?: string;
          description?: string;
          categoryId?: number;
        };

        if (!name) {
          return reply.code(400).send({ error: '角色名称不能为空' });
        }

        const character = await prisma.userLibraryCharacter.create({
          data: {
            userId: request.user!.userId,
            name,
            avatar,
            description,
            categoryId,
          },
        });

        reply.send({ character });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '创建角色失败' });
      }
    }
  );

  // 更新角色
  server.put(
    '/user-library/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { name, avatar, description, categoryId, order } = request.body as {
          name?: string;
          avatar?: string;
          description?: string;
          categoryId?: number;
          order?: number;
        };

        const character = await prisma.userLibraryCharacter.findUnique({
          where: { id: parseInt(id) },
        });

        if (!character) {
          return reply.code(404).send({ error: '角色不存在' });
        }

        if (character.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此角色' });
        }

        const updated = await prisma.userLibraryCharacter.update({
          where: { id: parseInt(id) },
          data: { name, avatar, description, categoryId, order },
        });

        reply.send({ character: updated });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '更新角色失败' });
      }
    }
  );

  // 删除角色
  server.delete(
    '/user-library/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const character = await prisma.userLibraryCharacter.findUnique({
          where: { id: parseInt(id) },
        });

        if (!character) {
          return reply.code(404).send({ error: '角色不存在' });
        }

        if (character.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此角色' });
        }

        await prisma.userLibraryCharacter.delete({
          where: { id: parseInt(id) },
        });

        reply.send({ success: true });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '删除角色失败' });
      }
    }
  );

  // ==================== 动作管理 ====================
  
  // 获取角色的所有动作
  server.get(
    '/user-library/characters/:characterId/actions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { characterId } = request.params as { characterId: string };

        const character = await prisma.userLibraryCharacter.findUnique({
          where: { id: parseInt(characterId) },
        });

        if (!character) {
          return reply.code(404).send({ error: '角色不存在' });
        }

        if (character.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权访问此角色' });
        }

        const actions = await prisma.userLibraryAction.findMany({
          where: { characterId: parseInt(characterId) },
          orderBy: { order: 'asc' },
          include: {
            video: true,
          }
        });

        reply.send({ actions });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取动作失败' });
      }
    }
  );

  // 创建动作
  server.post(
    '/user-library/characters/:characterId/actions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { characterId } = request.params as { characterId: string };
        const { name, code, description } = request.body as {
          name: string;
          code?: string;
          description?: string;
        };

        if (!name) {
          return reply.code(400).send({ error: '动作名称不能为空' });
        }

        const character = await prisma.userLibraryCharacter.findUnique({
          where: { id: parseInt(characterId) },
        });

        if (!character) {
          return reply.code(404).send({ error: '角色不存在' });
        }

        if (character.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此角色' });
        }

        const action = await prisma.userLibraryAction.create({
          data: {
            userId: request.user!.userId,
            characterId: parseInt(characterId),
            name,
            code,
            description,
          },
        });

        reply.send({ action });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '创建动作失败' });
      }
    }
  );

  // 更新动作
  server.put(
    '/user-library/actions/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { name, code, description, order } = request.body as {
          name?: string;
          code?: string;
          description?: string;
          order?: number;
        };

        const action = await prisma.userLibraryAction.findUnique({
          where: { id: parseInt(id) },
        });

        if (!action) {
          return reply.code(404).send({ error: '动作不存在' });
        }

        if (action.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此动作' });
        }

        const updated = await prisma.userLibraryAction.update({
          where: { id: parseInt(id) },
          data: { name, code, description, order },
        });

        reply.send({ action: updated });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '更新动作失败' });
      }
    }
  );

  // 删除动作
  server.delete(
    '/user-library/actions/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const action = await prisma.userLibraryAction.findUnique({
          where: { id: parseInt(id) },
        });

        if (!action) {
          return reply.code(404).send({ error: '动作不存在' });
        }

        if (action.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此动作' });
        }

        await prisma.userLibraryAction.delete({
          where: { id: parseInt(id) },
        });

        reply.send({ success: true });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '删除动作失败' });
      }
    }
  );

  // ==================== 视频管理 ====================
  
  // 获取上传凭证（包含 VIP 限制验证）
  server.get(
    '/user-library/videos/upload-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { filename, characterId, actionId } = request.query as {
          filename: string;
          characterId: string;
          actionId: string;
        };

        // 验证角色权限
        const action = await prisma.userLibraryAction.findUnique({
          where: { id: parseInt(actionId) },
          include: { character: true }
        });

        if (!action || action.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权上传到此角色' });
        }

        // 获取用户 VIP 限制
        const limits = await getUserVipLimits(request.user!.userId);

        // 检查是否允许上传
        if (limits.maxFileSize === 0) {
          return reply.code(403).send({ 
            error: '当前 VIP 等级不支持上传视频',
            vipPlan: limits.vipPlan,
            upgradeRequired: true
          });
        }

        const character = action.character;
        const key = generateFileKey(filename, character.id.toString(), 'user-library');
        const url = getFileUrl(key);
        const token = getUploadToken(key);

        reply.send({ 
          token, 
          key, 
          url,
          limits: {
            maxFileSize: limits.maxFileSize,
            maxTotalSize: limits.maxTotalSize,
            usedSize: limits.usedSize,
            remainingSize: limits.remainingSize,
            maxFileSizeFormatted: limits.maxFileSizeFormatted,
            maxTotalSizeFormatted: limits.maxTotalSizeFormatted,
            usedSizeFormatted: limits.usedSizeFormatted,
            remainingSizeFormatted: limits.remainingSizeFormatted,
          }
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取上传凭证失败' });
      }
    }
  );

  // 获取封面上传凭证
  server.get(
    '/user-library/videos/cover-upload-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { key } = request.query as { key: string };
        const coverKey = key.replace('.mp4', '-thumbnail.jpg');
        const token = getUploadToken(coverKey);
        reply.send({ token, key: coverKey });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取封面凭证失败' });
      }
    }
  );

  // 创建/更新视频（包含文件大小验证）
  server.post(
    '/user-library/videos',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { actionId, qiniuKey, qiniuUrl, coverUrl, title, fileSize } = request.body as {
          actionId: number;
          qiniuKey: string;
          qiniuUrl: string;
          coverUrl?: string;
          title?: string;
          fileSize?: number;
        };

        const action = await prisma.userLibraryAction.findUnique({
          where: { id: actionId },
        });

        if (!action || action.userId !== request.user!.userId) {
          return reply.code(403).send({ error: '无权操作此动作' });
        }

        // 验证文件大小
        const actualFileSize = fileSize || 0;
        const limits = await getUserVipLimits(request.user!.userId);

        if (limits.maxFileSize === 0) {
          return reply.code(403).send({ 
            error: '当前 VIP 等级不支持上传视频',
            vipPlan: limits.vipPlan,
            upgradeRequired: true
          });
        }

        // 检查单文件大小限制
        if (actualFileSize > limits.maxFileSize) {
          return reply.code(400).send({ 
            error: `文件大小超出限制`,
            message: `当前 VIP 等级最大支持 ${limits.maxFileSizeFormatted}，当前文件 ${formatFileSize(actualFileSize)}`,
            maxFileSize: limits.maxFileSize,
            actualFileSize,
            vipPlan: limits.vipPlan
          });
        }

        // 检查总空间限制（如果是新上传）
        const existing = await prisma.userLibraryVideo.findUnique({
          where: { actionId },
        });

        if (!existing) {
          // 新上传，检查剩余空间
          if (actualFileSize > limits.remainingSize) {
            return reply.code(400).send({ 
              error: `剩余空间不足`,
              message: `剩余空间 ${limits.remainingSizeFormatted}，需要 ${formatFileSize(actualFileSize)}`,
              remainingSize: limits.remainingSize,
              requiredSize: actualFileSize,
              vipPlan: limits.vipPlan
            });
          }
        }

        let video;
        if (existing) {
          // 删除旧文件
          if (existing.qiniuKey) {
            await deleteFile(existing.qiniuKey);
          }
          if (existing.coverUrl) {
            const oldCoverKey = existing.coverUrl.split('/').pop() || '';
            await deleteFile(oldCoverKey);
          }

          // 更新视频
          video = await prisma.userLibraryVideo.update({
            where: { id: existing.id },
            data: {
              qiniuKey,
              qiniuUrl,
              coverUrl,
              title: title || existing.title,
              fileSize: fileSize || existing.fileSize,
            },
          });
        } else {
          // 创建新视频
          video = await prisma.userLibraryVideo.create({
            data: {
              userId: request.user!.userId,
              actionId,
              qiniuKey,
              qiniuUrl,
              coverUrl,
              title: title || action.name,
              fileSize: fileSize || 0,
            },
          });
        }

        reply.send({ video });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '保存视频失败' });
      }
    }
  );

  // 获取用户的视频统计（包含 VIP 限制信息）
  server.get(
    '/user-library/stats',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const limits = await getUserVipLimits(request.user!.userId);

        reply.send({
          totalSize: limits.usedSize,
          totalSizeFormatted: limits.usedSizeFormatted,
          totalCount: limits.remainingSize >= 0 ? 
            (await prisma.userLibraryVideo.count({ where: { userId: request.user!.userId } })) : 0,
          vipPlan: limits.vipPlan,
          maxFileSize: limits.maxFileSize,
          maxFileSizeFormatted: limits.maxFileSizeFormatted,
          maxTotalSize: limits.maxTotalSize,
          maxTotalSizeFormatted: limits.maxTotalSizeFormatted,
          remainingSize: limits.remainingSize,
          remainingSizeFormatted: limits.remainingSizeFormatted,
          usagePercent: limits.maxTotalSize > 0 ? 
            Math.round((limits.usedSize / limits.maxTotalSize) * 100) : 0,
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取统计失败' });
      }
    }
  );

  // ==================== 管理员配置（仅系统管理员） ====================
  
  // 获取 VIP 限制配置
  server.get(
    '/user-library/admin/settings',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        // 验证系统管理员权限
        if (request.user!.role !== 'system_admin') {
          return reply.code(403).send({ error: '仅系统管理员可访问' });
        }

        const settings = await prisma.userLibrarySettings.findMany({
          orderBy: { key: 'asc' }
        });

        reply.send({ settings });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '获取配置失败' });
      }
    }
  );

  // 更新 VIP 限制配置
  server.put(
    '/user-library/admin/settings/:key',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        // 验证系统管理员权限
        if (request.user!.role !== 'system_admin') {
          return reply.code(403).send({ error: '仅系统管理员可访问' });
        }

        const { key } = request.params as { key: string };
        const { value, description } = request.body as {
          value: string;
          description?: string;
        };

        if (!value) {
          return reply.code(400).send({ error: '配置值不能为空' });
        }

        const setting = await prisma.userLibrarySettings.upsert({
          where: { key },
          create: { key, value, description },
          update: { value, description },
        });

        reply.send({ setting });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '更新配置失败' });
      }
    }
  );

  // 批量更新 VIP 限制配置
  server.post(
    '/user-library/admin/settings/batch',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        // 验证系统管理员权限
        if (request.user!.role !== 'system_admin') {
          return reply.code(403).send({ error: '仅系统管理员可访问' });
        }

        const { settings } = request.body as { settings: Array<{ key: string; value: string; description?: string }> };

        if (!settings || !Array.isArray(settings)) {
          return reply.code(400).send({ error: '配置格式错误' });
        }

        const updated = [];
        for (const setting of settings) {
          if (!setting.key || !setting.value) {
            continue;
          }
          const result = await prisma.userLibrarySettings.upsert({
            where: { key: setting.key },
            create: { key: setting.key, value: setting.value, description: setting.description },
            update: { value: setting.value, description: setting.description },
          });
          updated.push(result);
        }

        reply.send({ settings: updated });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({ error: '批量更新配置失败' });
      }
    }
  );

  server.log.info('✅ User Library routes registered!');
};
