import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/db.js';
import { authenticate } from '../middleware/auth.js';

export const authRoutes: FastifyPluginAsync = async (server) => {
  // 管理员登录
  server.post('/login', async (request, reply) => {
    try {
      const { username, password } = request.body as {
        username: string;
        password: string;
      };

      if (!username || !password) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Username and password are required',
        });
      }

      // 查找管理员
      const admin = await prisma.admin.findUnique({
        where: { username },
      });

      if (!admin) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid username or password',
        });
      }

      // 验证密码
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid username or password',
        });
      }

      // 生成 JWT
      const token = server.jwt.sign({
        userId: admin.id,
        username: admin.username,
        role: admin.role,
      });

      reply.send({
        token,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (error) {
      server.log.error(error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Login failed',
      });
    }
  });

  // 获取当前管理员信息
  server.get(
    '/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const admin = await prisma.admin.findUnique({
          where: { id: request.user!.id },
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
          },
        });

        if (!admin) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Admin not found',
          });
        }

        reply.send(admin);
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to get admin info',
        });
      }
    }
  );

  // 修改密码
  server.put(
    '/password',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string;
          newPassword: string;
        };

        if (!currentPassword || !newPassword) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Current password and new password are required',
          });
        }

        const admin = await prisma.admin.findUnique({
          where: { id: request.user!.id },
        });

        if (!admin) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Admin not found',
          });
        }

        // 验证当前密码
        const valid = await bcrypt.compare(currentPassword, admin.password);
        if (!valid) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Current password is incorrect',
          });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.admin.update({
          where: { id: admin.id },
          data: { password: hashedPassword },
        });

        reply.send({ message: 'Password updated successfully' });
      } catch (error) {
        server.log.error(error);
        reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update password',
        });
      }
    }
  );
};
