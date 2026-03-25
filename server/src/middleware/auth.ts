import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      role: string;
    };
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
  }
}

/**
 * 要求管理员权限（content_admin 或 system_admin）
 * 用于分类、角色、动作、头像审核等日常内容管理
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await authenticate(request, reply);
  
  const role = request.user?.role;
  if (role !== 'content_admin' && role !== 'system_admin') {
    reply.code(403).send({ 
      error: 'Forbidden', 
      message: 'Admin access required' 
    });
  }
}

/**
 * 要求系统管理员权限（仅 system_admin）
 * 用于游戏管理、VIP 套餐、网站配置等高级功能
 */
export async function requireSystemAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  await authenticate(request, reply);
  
  if (request.user?.role !== 'system_admin') {
    return reply.code(403).send({ 
      error: 'Forbidden', 
      message: 'System admin access required' 
    });
  }
}
