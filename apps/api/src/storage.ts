import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Database } from './prisma';
import { Actor } from './auth';
import { demand } from './domain';
@Injectable()
export class Storage {
  constructor(@Inject(Database) private db: Database) {}
  private get directory() {
    return resolve(process.env.UPLOAD_DIR || 'uploads');
  }
  private get remote() {
    return process.env.STORAGE_DRIVER === 'supabase';
  }
  private client() {
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  async upload(actor: Actor, file: Express.Multer.File) {
    demand(
      file && file.size > 0 && file.size <= 5 * 1024 * 1024,
      'Berkas wajib diisi, maksimal 5 MB',
    );
    const b = file.buffer;
    const mime =
      b.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
          ? 'image/jpeg'
          : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? 'image/png'
            : null;
    demand(mime && mime === file.mimetype, 'Hanya PDF, JPEG, dan PNG yang valid diperbolehkan');
    const key = `${actor.id}/${randomUUID()}`;
    if (this.remote) {
      const { error } = await this.client()
        .storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'documents')
        .upload(key, b, { contentType: mime });
      if (error) throw error;
    } else {
      await mkdir(join(this.directory, actor.id), { recursive: true });
      await writeFile(join(this.directory, key), b);
    }
    return this.db.document.create({
      data: {
        ownerId: actor.id,
        name: file.originalname.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 180),
        mime,
        size: file.size,
        key,
      },
      select: { id: true, name: true, mime: true, size: true },
    });
  }
  async download(actor: Actor, id: string) {
    const doc = await this.db.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException();
    let allowed = actor.role === 'MANAGER' || doc.ownerId === actor.id;
    if (!allowed)
      allowed = !!(await this.db.contractVersion.findFirst({
        where: { documentId: id, lease: { tenantId: actor.id } },
      }));
    if (!allowed) {
      const inspections = await this.db.inspection.findMany({
        where: { lease: { tenantId: actor.id } },
      });
      allowed = inspections.some((i) => Array.isArray(i.documentIds) && i.documentIds.includes(id));
    }
    if (!allowed) throw new NotFoundException();
    if (this.remote) {
      const { data, error } = await this.client()
        .storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'documents')
        .createSignedUrl(doc.key, 60, { download: doc.name });
      if (error) throw error;
      return { doc, url: data.signedUrl };
    }
    return { doc, buffer: await readFile(join(this.directory, doc.key)) };
  }
}
