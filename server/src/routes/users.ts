import { FastifyPluginAsync } from 'fastify'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'ckanim-admin-secret-key-change-in-production-2026'

export const userRoutes: FastifyPluginAsync = async (server) => {
  // ==================== 用户注册 ====================
  server.post(
    '/auth/register',
    async (request, reply) => {
      try {
        const { username, email, password } = request.body as {
          username: string
          email: string
          password: string
        }

        // 验证输入
        if (!username || !email || !password) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '用户名、邮箱和密码不能为空',
          })
        }

        if (password.length < 6) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '密码长度至少为 6 位',
          })
        }

        // 检查用户名是否已存在
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ username }, { email }],
          },
        })

        if (existingUser) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: existingUser.username === username ? '用户名已被注册' : '邮箱已被注册',
          })
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)

        // 创建用户
        const user = await prisma.user.create({
          data: {
            username,
            email,
            password: hashedPassword,
            role: 'user',
            vipLevel: 'none',
          },
        })

        // 生成 JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        )

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            vipLevel: user.vipLevel,
          },
          token,
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '注册失败',
        })
      }
    }
  )

  // ==================== 用户登录 ====================
  server.post(
    '/auth/login',
    async (request, reply) => {
      try {
        const { username, password } = request.body as {
          username: string
          password: string
        }

        if (!username || !password) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '用户名和密码不能为空',
          })
        }

        // 查找用户（支持用户名或邮箱登录）
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username }, { email: username }],
          },
        })

        if (!user) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: '用户名或密码错误',
          })
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: '用户名或密码错误',
          })
        }

        // 生成 JWT
        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          JWT_SECRET,
          { expiresIn: '7d' }
        )

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            vipLevel: user.vipLevel,
            vipExpires: user.vipExpires,
          },
          token,
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '登录失败',
        })
      }
    }
  )

  // ==================== 获取当前用户信息 ====================
  server.get(
    '/auth/me',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: (request.user as any).userId },
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            phone: true,
            role: true,
            vipLevel: true,
            vipExpires: true,
            createdAt: true,
          },
        })

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '用户不存在',
          })
        }

        reply.send({ user })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '获取用户信息失败',
        })
      }
    }
  )

  // ==================== 更新用户信息 ====================
  server.put(
    '/auth/me',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { avatar, phone } = request.body as {
          avatar?: string
          phone?: string
        }

        const user = await prisma.user.update({
          where: { id: (request.user as any).userId },
          data: {
            ...(avatar !== undefined && { avatar }),
            ...(phone !== undefined && { phone }),
          },
        })

        reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            phone: user.phone,
            role: user.role,
            vipLevel: user.vipLevel,
          },
        })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '更新用户信息失败',
        })
      }
    }
  )

  // ==================== 修改密码 ====================
  server.put(
    '/auth/me/password',
    {
      preHandler: [async (request, reply) => {
        const authHeader = request.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.code(401).send({ error: 'Unauthorized', message: '未登录' })
        }
        try {
          const token = authHeader.split(' ')[1]
          const decoded = jwt.verify(token, JWT_SECRET) as any
          request.user = decoded
        } catch (err) {
          return reply.code(401).send({ error: 'Unauthorized', message: 'Token 无效' })
        }
      }],
    },
    async (request, reply) => {
      try {
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string
          newPassword: string
        }

        if (!currentPassword || !newPassword) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '当前密码和新密码不能为空',
          })
        }

        if (newPassword.length < 6) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: '新密码长度至少为 6 位',
          })
        }

        const user = await prisma.user.findUnique({
          where: { id: (request.user as any).userId },
        })

        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: '用户不存在',
          })
        }

        // 验证当前密码
        const validPassword = await bcrypt.compare(currentPassword, user.password)

        if (!validPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: '当前密码错误',
          })
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        })

        reply.send({ message: '密码修改成功' })
      } catch (error) {
        server.log.error(error)
        reply.code(500).send({
          error: 'Internal Server Error',
          message: '修改密码失败',
        })
      }
    }
  )
}
