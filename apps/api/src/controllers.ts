import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { AuthGuard, AuthRequest, AuthService, manager } from './auth';
import { RentalService } from './service';
import { Storage } from './storage';
import * as D from './dto';
@ApiTags('Public')
@Controller()
export class PublicController {
  constructor(
    @Inject(RentalService) private service: RentalService,
    @Inject(AuthService) private auth: AuthService,
  ) {}
  @Get('health') async health() {
    await this.service.db.$queryRaw`SELECT 1`;
    return { status: 'ok', demo: process.env.DEMO_MODE === 'true' };
  }
  @Get('units')
  @ApiOperation({ summary: 'Daftar unit, filter status/search/bedrooms, pagination page/limit' })
  units(@Query() query: Record<string, string>) {
    return this.service.units(query);
  }
  @Get('units/:id') unit(@Param('id') id: string) {
    return this.service.unit(id);
  }
  @Post('auth/register') register(@Body() input: D.RegisterDto) {
    return this.auth.register(input);
  }
  @Post('auth/login') async login(
    @Body() input: D.LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(input);
    res.cookie('rk_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 86400000,
    });
    return result.user;
  }
  @Post('auth/logout') async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.logout(req.cookies?.rk_session);
    res.clearCookie('rk_session', { path: '/' });
    return result;
  }
}
@ApiTags('Rental management')
@ApiCookieAuth('rk_session')
@UseGuards(AuthGuard)
@Controller()
export class RentalController {
  constructor(
    @Inject(RentalService) private service: RentalService,
    @Inject(Storage) private storage: Storage,
  ) {}
  @Get('auth/me') me(@Req() req: AuthRequest) {
    return req.actor;
  }
  @Get('dashboard') dashboard(@Req() req: AuthRequest) {
    return this.service.dashboard(req.actor);
  }
  @Post('units') unitCreate(@Req() req: AuthRequest, @Body() body: D.UnitDto) {
    return this.service.saveUnit(req.actor, body);
  }
  @Put('units/:id') unitUpdate(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.UnitDto,
  ) {
    return this.service.saveUnit(req.actor, body, id);
  }
  @Patch('units/:id/status') unitStatus(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.AvailabilityDto,
  ) {
    return this.service.availability(req.actor, id, body.status);
  }
  @Get('applications') applications(@Req() req: AuthRequest) {
    return this.service.applications(req.actor);
  }
  @Post('applications') apply(@Req() req: AuthRequest, @Body() body: D.ApplicationDto) {
    return this.service.apply(req.actor, body);
  }
  @Post('applications/:id/approve') approve(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.ApprovalDto,
  ) {
    return this.service.approve(req.actor, id, body);
  }
  @Post('applications/:id/reject') reject(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.ReasonDto,
  ) {
    return this.service.rejectApplication(req.actor, id, body.reason);
  }
  @Get('leases') leases(@Req() req: AuthRequest) {
    return this.service.leases(req.actor);
  }
  @Get('leases/:id') lease(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.lease(req.actor, id);
  }
  @Post('leases/:id/contract') contract(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.DocumentDto,
  ) {
    return this.service.contract(req.actor, id, body.documentId);
  }
  @Post('leases/:id/verify') verify(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.verifyContract(req.actor, id);
  }
  @Post('leases/:id/cancel') cancel(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.ReasonDto,
  ) {
    return this.service.cancelLease(req.actor, id, body.reason);
  }
  @Post('leases/:id/meters') meter(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.MeterDto,
  ) {
    return this.service.meter(req.actor, id, body);
  }
  @Post('leases/:id/inspections') inspection(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.InspectionDto,
  ) {
    return this.service.inspect(req.actor, id, body);
  }
  @Post('leases/:id/move-in') moveIn(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.moveIn(req.actor, id);
  }
  @Post('leases/:id/move-out') moveOut(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.SettlementDto,
  ) {
    return this.service.moveOut(req.actor, id, body);
  }
  @Post('leases/:id/refund') refund(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.ReasonDto,
  ) {
    return this.service.refund(req.actor, id, body.reason);
  }
  @Get('invoices') invoices(@Req() req: AuthRequest) {
    return this.service.invoices(req.actor);
  }
  @Post('invoices/generate') generate(@Req() req: AuthRequest) {
    return this.service.generate(req.actor);
  }
  @Post('invoices/:id/pay') pay(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.DocumentDto,
  ) {
    return this.service.payment(req.actor, id, body.documentId);
  }
  @Post('invoices/:id/simulate') simulate(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.SimulationDto,
  ) {
    return this.service.payment(req.actor, id, undefined, true, body.outcome);
  }
  @Get('payments') payments(@Req() req: AuthRequest) {
    return this.service.payments(req.actor);
  }
  @Post('payments/:id/review') review(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.ReviewDto,
  ) {
    return this.service.reviewPayment(req.actor, id, body);
  }
  @Post('documents')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File) {
    return this.storage.upload(req.actor, file);
  }
  @Get('documents/:id') async download(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const result = await this.storage.download(req.actor, id);
    res.setHeader('Cache-Control', 'private, no-store');
    if (result.url) return res.redirect(result.url);
    res.setHeader('Content-Type', result.doc.mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.doc.name)}`,
    );
    return res.send(result.buffer);
  }
  @Get('tickets') tickets(@Req() req: AuthRequest) {
    return this.service.tickets(req.actor);
  }
  @Post('tickets') ticket(@Req() req: AuthRequest, @Body() body: D.TicketDto) {
    return this.service.ticket(req.actor, body);
  }
  @Post('tickets/:id/comments') comment(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.CommentDto,
  ) {
    return this.service.comment(req.actor, id, body.text);
  }
  @Patch('tickets/:id/status') status(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: D.TicketStatusDto,
  ) {
    return this.service.ticketStatus(req.actor, id, body.status);
  }
  @Get('announcements') announcements(@Req() req: AuthRequest) {
    return this.service.announcements(req.actor);
  }
  @Post('announcements') announce(@Req() req: AuthRequest, @Body() body: D.AnnouncementDto) {
    return this.service.announce(req.actor, body);
  }
  @Get('settings') settings(@Req() req: AuthRequest) {
    return this.service.settings(req.actor);
  }
  @Put('settings') settingsSave(@Req() req: AuthRequest, @Body() body: D.SettingsDto) {
    return this.service.settings(req.actor, body);
  }
  @Get('tenants') tenants(@Req() req: AuthRequest) {
    return this.service.tenants(req.actor);
  }
  @Get('reports') reports(
    @Req() req: AuthRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.reports(req.actor, from, to);
  }
  @Get('reports/export') async export(
    @Req() req: AuthRequest,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const report = await this.service.reports(req.actor, from, to);
    const csv = (v: unknown) =>
      `"${String(v ?? '')
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""')}"`;
    const rows = [
      ['Tanggal', 'Unit', 'Penyewa', 'Jenis', 'Jumlah', 'Simulasi'],
      ...report.payments.map((p) => [
        p.reviewedAt?.toISOString().slice(0, 10),
        p.invoice.lease.unit.code,
        p.invoice.lease.tenant.name,
        p.invoice.kind,
        p.amount.toString(),
        p.simulated ? 'Ya' : 'Tidak',
      ]),
    ];
    res
      .type('text/csv')
      .attachment('laporan-rumahkita.csv')
      .send('\uFEFF' + rows.map((r) => r.map(csv).join(',')).join('\r\n'));
  }
  @Get('audit/:id') audit(@Req() req: AuthRequest, @Param('id') id: string) {
    manager(req.actor);
    return this.service.db.audit.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'desc' },
    });
  }
}
