import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { requireAdmin } from '../middleware/auth.js';

export const actionRoutes: FastifyPluginAsync = async (server) => {
  // ===== 管理员路由（需要认证） =====

  // 获取动作列表（管理员）- 支持按角色筛选
  server.get(
    '/actions',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      try {
        const { characterId } = request.query as { characterId?: string };

        const where: any = {};
        if (characterId) {
          where.characterId = parseInt(characterId);
        }

        const actions = await prisma.action.findMany({
          where,
          include: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
            video: true, // ⭐ 1 对 1 关系
          },
          orderBy: { order: 'asc' },
        });

        reply.send({ actions });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch actions',
        });
      }
    }
  );

  // 获取单个动作（包含角色和游戏信息）
  server.get(
    '/actions/:id',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const actionId = parseInt(id);

        const action = await prisma.action.findUnique({
          where: { id: actionId },
          include: {
            character: {
              include: {
                game: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            video: true, // ⭐ 1 对 1 关系
          },
        });

        if (!action) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Action not found',
          });
        }

        reply.send(action);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch action',
        });
      }
    }
  );

  // 创建动作（必须选择角色）
  server.post(
    '/actions',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      try {
        const {
          name,
          code,
          description,
          characterId,
          order = 0,
          published = false,
        } = request.body as {
          name: string;
          code: string;
          description?: string;
          characterId: number; // 必选，动作必须属于某个角色
          order?: number;
          published?: boolean;
        };

        if (!name || !code) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Name and code are required',
          });
        }

        if (!characterId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'characterId is required. Actions must belong to a character.',
          });
        }

        // 检查角色是否存在
        const character = await prisma.character.findUnique({
          where: { id: characterId },
        });

        if (!character) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Character not found',
          });
        }

        const action = await prisma.action.create({
          data: {
            name,
            code,
            description,
            characterId,
            order,
            published,
          },
          include: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        reply.code(201).send(action);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create action',
        });
      }
    }
  );

  // 更新动作
  server.put(
    '/actions/:id',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const actionId = parseInt(id);
        const {
          name,
          code,
          description,
          order,
          published,
        } = request.body as {
          name?: string;
          code?: string;
          description?: string;
          order?: number;
          published?: boolean;
        };

        const action = await prisma.action.update({
          where: { id: actionId },
          data: {
            name,
            code,
            description,
            order,
            published,
          },
          include: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        reply.send(action);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update action',
        });
      }
    }
  );

  // 删除动作（级联删除关联的视频）
  server.delete(
    '/actions/:id',
    { preHandler: [requireAdmin] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const actionId = parseInt(id);

        // 先获取动作信息（用于删除七牛云文件）
        const action = await prisma.action.findUnique({
          where: { id: actionId },
          include: {
            video: true, // ⭐ 1 对 1 关系
          },
        });

        if (!action) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Action not found',
          });
        }

        // 删除动作（级联删除视频）
        await prisma.action.delete({
          where: { id: actionId },
        });

        // 删除七牛云文件（视频和封面图）
        if (action.video) {
          const keysToDelete = [action.video.qiniuKey];
          if (action.video.coverUrl) {
            keysToDelete.push(extractKeyFromUrl(action.video.coverUrl));
          }
          await deleteMultipleFiles(keysToDelete);
          server.log.info(`Deleted qiniu files for action ${actionId}: ${keysToDelete.join(', ')}`);
        }

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete action',
        });
      }
    }
  );
};
