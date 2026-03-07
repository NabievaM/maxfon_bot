import { Update, Start, Hears, On, Ctx, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { basicMenu, adminMenu } from './keyboards';
import { PhoneService } from '../phone/phone.service';
import { OrderService } from '../order/order.service';
import { UserService } from '../user/user.service';
import { AdminHelper } from './helpers/admin.helper';
import { OrderHelper } from './helpers/order.helper';
import { OrderSession } from './session';
const ADMIN_ID = Number(process.env.ADMIN_ID);

@Update()
export class BotUpdate {
  constructor(
    private phoneService: PhoneService,
    private orderService: OrderService,
    private userService: UserService,
  ) {
    this.adminHelper = new AdminHelper(
      this.phoneService,
      this.orderService,
      this.userService,
      this.sessions,
    );

    this.orderHelper = new OrderHelper(
      this.phoneService,
      this.orderService,
      this.sessions,
    );
  }

  private sessions = new Map<number, OrderSession>();
  private adminHelper: AdminHelper;
  private orderHelper: OrderHelper;

  @Start()
  async start(@Ctx() ctx: Context) {
    const telegramId = ctx.from!.id;

    if (telegramId === ADMIN_ID) {
      await ctx.reply(
        'Assalomu alaykum! Admin panelga xush kelibsiz 👋',
        adminMenu,
      );
      return;
    }

    let user = await this.userService.findByTelegramId(telegramId);

    if (!user) {
      user = await this.userService.createIfNotExists({
        telegramId,
        username: ctx.from!.username,
        firstName: ctx.from!.first_name,
        lastName: ctx.from!.last_name,
      });

      await ctx.reply(
        '⏳ So‘rovingiz admin ga yuborildi.\nTasdiqlanishini kuting.',
      );

      const name =
        `${ctx.from!.first_name || ''} ${ctx.from!.last_name || ''}`.trim();

      const profile = ctx.from!.username
        ? `<a href="https://t.me/${ctx.from!.username}">${name || 'Profil'}</a>`
        : `<a href="tg://user?id=${telegramId}">${name || 'Profil'}</a>`;

      await ctx.telegram.sendMessage(
        ADMIN_ID,
        `🆕 Yangi foydalanuvchi:\n\n` +
          `👤 ${profile}\n` +
          `💻 Username: ${ctx.from!.username ? '@' + ctx.from!.username : 'yo‘q'}\n` +
          `🆔 Telegram ID: ${telegramId}\n` +
          `📞 Telefon: yo‘q\n` +
          `✅ Holati: Kutilmoqda`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '✅ Ruxsat berish',
                  callback_data: `approve_${user.id}`,
                },
                { text: '❌ Rad etish', callback_data: `reject_${user.id}` },
              ],
            ],
          },
        },
      );

      return;
    }

    if (!user.approved) {
      await ctx.reply('⏳ So‘rovingiz ko‘rib chiqilmoqda...');
      return;
    }

    await ctx.reply(
      `Assalomu alaykum ${user.firstName || ''}! 👋\nMAXFON botiga xush kelibsiz.`,
      basicMenu,
    );
  }

  @Hears('📱 Telefon narxlari')
  async prices(@Ctx() ctx: Context) {
    await this.orderHelper.prices(ctx);
  }

  @Hears('📦 Mening buyurtmalarim')
  async myOrders(@Ctx() ctx: Context) {
    await this.orderHelper.myOrders(ctx);
  }

  @Hears('📣 Kanal')
  async channel(@Ctx() ctx: Context) {
    await ctx.reply('MAXFON rasmiy kanali 👇', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📣 Kanalga o‘tish',
              url: 'https://t.me/MAXFON_UZBEKISTAN',
            },
          ],
        ],
      },
    });
  }

  @Hears('🛒 Buyurtma berish')
  async order(@Ctx() ctx: Context) {
    await this.orderHelper.order(ctx);
  }

  @Action(/select_(.+)/)
  async select(@Ctx() ctx: any) {
    await this.orderHelper.selectModel(ctx, Number(ctx.match[1]));
  }

  @Action(/plus_(.+)/)
  async plus(@Ctx() ctx: any) {
    await this.orderHelper.plus(ctx, ctx.match[1]);
  }

  @Action(/minus_(.+)/)
  async minus(@Ctx() ctx: any) {
    await this.orderHelper.minus(ctx, ctx.match[1]);
  }

  @Action('noop')
  async noop(@Ctx() ctx: any) {
    await this.orderHelper.noop(ctx);
  }

  @Hears('🧺 Korzinka')
  async cart(@Ctx() ctx: Context) {
    await this.orderHelper.cart(ctx);
  }

  @Hears('✅ Rasmiylashtirish')
  async finalize(@Ctx() ctx: Context) {
    await this.orderHelper.finalize(ctx);
  }

  @On('contact')
  async onContact(@Ctx() ctx: any) {
    await this.orderHelper.onContact(ctx);
  }

  @Hears('📥 So‘rovlar')
  async pending(@Ctx() ctx: any) {
    await this.adminHelper.showPending(ctx);
  }

  @Action(/^approve_(\d+)$/)
  async approve(@Ctx() ctx: any) {
    await this.adminHelper.approveUser(ctx, Number(ctx.match[1]));
  }

  @Action(/^reject_(\d+)$/)
  async reject(@Ctx() ctx: any) {
    await this.adminHelper.rejectUser(ctx, Number(ctx.match[1]));
  }

  @Hears('➕ Model qo‘shish')
  async addModel(@Ctx() ctx: any) {
    await this.adminHelper.addModel(ctx);
  }

  @Hears('📋 Modellar ro‘yxati')
  async listModels(@Ctx() ctx: Context) {
    await this.adminHelper.listModels(ctx);
  }

  @Action(/^delete_(\d+)$/)
  async deletePhone(@Ctx() ctx: any) {
    await this.adminHelper.deleteAsk(ctx, Number(ctx.match[1]));
  }

  @Action(/^confirm_delete_(\d+)$/)
  async confirmDelete(@Ctx() ctx: any) {
    await this.adminHelper.confirmDelete(ctx, Number(ctx.match[1]));
  }

  @Action(/^cancel_delete_(\d+)$/)
  async cancelDelete(@Ctx() ctx: any) {
    await this.adminHelper.cancelDelete(ctx, Number(ctx.match[1]));
  }

  @Action(/edit_(.+)/)
  async editPhone(@Ctx() ctx: any) {
    await this.adminHelper.startEdit(ctx, Number(ctx.match[1]));
  }

  @Hears('📦 Buyurtmalar')
  async showOrders(@Ctx() ctx: Context) {
    await this.adminHelper.showOrders(ctx);
  }

  @Hears('📊 Statistika')
  async showStats(@Ctx() ctx: Context) {
    await this.adminHelper.showStats(ctx);
  }

  @Hears('👥 Foydalanuvchilar')
  async showUsers(@Ctx() ctx: Context) {
    await this.adminHelper.showUsers(ctx);
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: any) {
    await this.adminHelper.handlePhoto(ctx);
  }

  @On('text')
  async onText(@Ctx() ctx: any) {
    await this.adminHelper.handleText(ctx);
    await this.orderHelper.handleText(ctx);
  }
}
