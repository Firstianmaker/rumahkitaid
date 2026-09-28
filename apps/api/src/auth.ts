import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { Request } from 'express';
import { Database } from './prisma';
import { LoginDto, RegisterDto } from './dto';
export type Actor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'MANAGER' | 'TENANT';
};
export type AuthRequest = Request & { actor: Actor };
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class AuthService {
  constructor(@Inject(Database) private db: Database) {}
  async register(input: RegisterDto) {
    return this.db.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email.trim().toLowerCase(),
        passwordHash: await hash(input.password, 12),
      },
      select: { id: true },
    });
  }
  async login(input: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user || !(await compare(input.password, user.passwordHash)))
      throw new UnauthorizedException('Email atau password salah');
    const token = randomBytes(32).toString('hex');
    await this.db.session.create({
      data: {
        tokenHash: digest(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    const { passwordHash, ...actor } = user;
    return { token, user: actor };
  }
  async logout(token: string) {
    if (token) await this.db.session.deleteMany({ where: { tokenHash: digest(token) } });
    return { ok: true };
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(Database) private db: Database) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.rk_session;
    if (!token) throw new UnauthorizedException('Silakan masuk terlebih dahulu');
    const session = await this.db.session.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date())
      throw new UnauthorizedException('Sesi berakhir, silakan masuk kembali');
    const { passwordHash, ...actor } = session.user;
    req.actor = actor;
    return true;
  }
}
export function manager(actor: Actor) {
  if (actor.role !== 'MANAGER')
    throw new ForbiddenException('Hanya pengelola yang dapat melakukan tindakan ini');
}
export function tenant(actor: Actor) {
  if (actor.role !== 'TENANT') throw new ForbiddenException('Gunakan akun penyewa');
}
export function own(actor: Actor, tenantId: string) {
  if (actor.role !== 'MANAGER' && actor.id !== tenantId)
    throw new ForbiddenException('Akses tidak diizinkan');
}
