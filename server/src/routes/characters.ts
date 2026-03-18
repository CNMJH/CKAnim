import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

export const characterRoutes: FastifyPluginAsync = async (server) => {
  // ===== 管理员路由（需要认证） =====

  // 获取角色列表（管理员）
  server.get(
    '/characters',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { gameId } = request.query as { gameId?: string };

        const where: any = {};
        if (gameId) {
          where.gameId = parseInt(gameId);
        }

        const characters = await prisma.character.findMany({
          where,
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        });

        reply.send({ characters });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch characters',
        });
      }
    }
  );

  // 创建角色
  server.post(
    '/characters',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const {
          name,
          role,
          avatar,
          description,
          gameId,
          order = 0,
          published = false,
        } = request.body as {
          name: string;
          role?: string;
          avatar?: string;
          description?: string;
          gameId: number;
          order?: number;
          published?: boolean;
        };

        if (!name || !gameId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Name and gameId are required',
          });
        }

        const character = await prisma.character.create({
          data: {
            name,
            role,
            avatar,
            description,
            gameId,
            order,
            published,
          },
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        reply.code(201).send(character);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create character',
        });
      }
    }
  );

  // 更新角色
  server.put(
    '/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);
        const {
          name,
          role,
          avatar,
          description,
          order,
          published,
        } = request.body as {
          name?: string;
          role?: string;
          avatar?: string;
          description?: string;
          order?: number;
          published?: boolean;
        };

        const character = await prisma.character.update({
          where: { id: characterId },
          data: {
            name,
            role,
            avatar,
            description,
            order,
            published,
          },
          include: {
            game: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        reply.send(character);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update character',
        });
      }
    }
  );

  // 删除角色
  server.delete(
    '/characters/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);

        await prisma.character.delete({
          where: { id: characterId },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete character',
        });
      }
    }
  );

  // ===== 动作管理路由 =====

  // 获取动作列表（管理员）
  server.get(
    '/actions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const actions = await prisma.action.findMany({
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

  // 创建动作
  server.post(
    '/actions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const {
          name,
          code,
          description,
          order = 0,
          published = false,
        } = request.body as {
          name: string;
          code: string;
          description?: string;
          order?: number;
          published?: boolean;
        };

        if (!name || !code) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Name and code are required',
          });
        }

        const action = await prisma.action.create({
          data: {
            name,
            code,
            description,
            order,
            published,
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
    { preHandler: [authenticate] },
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

  // 删除动作
  server.delete(
    '/actions/:id',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const actionId = parseInt(id);

        await prisma.action.delete({
          where: { id: actionId },
        });

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

  // ===== 角色 - 动作关联管理 =====

  // 获取角色的动作关联（管理员）
  server.get(
    '/characters/:id/actions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);

        const character = await prisma.character.findUnique({
          where: { id: characterId },
          include: {
            actions: {
              include: {
                action: true,
                video: true,
              },
            },
          },
        });

        if (!character) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Character not found',
          });
        }

        reply.send({
          characterId: character.id,
          actions: character.actions,
        });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch character actions',
        });
      }
    }
  );

  // 创建角色 - 动作关联（绑定视频）
  server.post(
    '/characters/:id/actions',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const characterId = parseInt(id);
        const {
          actionId,
          videoId,
          videoUrl,
          order = 0,
          published = false,
        } = request.body as {
          actionId: number;
          videoId?: number;
          videoUrl?: string;
          order?: number;
          published?: boolean;
        };

        if (!actionId) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'actionId is required',
          });
        }

        // 检查角色和动作是否存在
        const [character, action] = await Promise.all([
          prisma.character.findUnique({ where: { id: characterId } }),
          prisma.action.findUnique({ where: { id: actionId } }),
        ]);

        if (!character || !action) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Character or action not found',
          });
        }

        const characterAction = await prisma.characterAction.create({
          data: {
            characterId,
            actionId,
            videoId,
            videoUrl,
            order,
            published,
          },
          include: {
            action: true,
            video: true,
          },
        });

        reply.code(201).send(characterAction);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create character action',
        });
      }
    }
  );

  // 更新角色 - 动作关联
  server.put(
    '/characters/:characterId/actions/:actionId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { characterId, actionId } = request.params as {
          characterId: string;
          actionId: string;
        };
        const {
          videoId,
          videoUrl,
          order,
          published,
        } = request.body as {
          videoId?: number;
          videoUrl?: string;
          order?: number;
          published?: boolean;
        };

        const characterAction = await prisma.characterAction.update({
          where: {
            characterId_actionId: {
              characterId: parseInt(characterId),
              actionId: parseInt(actionId),
            },
          },
          data: {
            videoId,
            videoUrl,
            order,
            published,
          },
          include: {
            action: true,
            video: true,
          },
        });

        reply.send(characterAction);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update character action',
        });
      }
    }
  );

  // 删除角色 - 动作关联
  server.delete(
    '/characters/:characterId/actions/:actionId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { characterId, actionId } = request.params as {
          characterId: string;
          actionId: string;
        };

        await prisma.characterAction.delete({
          where: {
            characterId_actionId: {
              characterId: parseInt(characterId),
              actionId: parseInt(actionId),
            },
          },
        });

        reply.code(204).send();
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete character action',
        });
      }
    }
  );
};
