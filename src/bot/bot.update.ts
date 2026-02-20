import { Update, Start, Hears, On, Ctx, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { basicMenu, orderMenu, adminMenu } from './keyboards';
import { modelKeyboard } from './order.keyboard';
import { PhoneService } from '../phone/phone.service';
import { OrderService } from '../order/order.service';
import { contactKeyboard } from './contact.keyboard';
import { AdminHelper } from './helpers/admin.helper';
import { OrderHelper } from './helpers/order.helper';
import { OrderSession } from './session';
const ADMIN_ID = Number(process.env.ADMIN_ID);

@Update()
export class BotUpdate {
  constructor(
    private phoneService: PhoneService,
    private orderService: OrderService,
  ) {
    this.adminHelper = new AdminHelper(
      this.phoneService,
      this.orderService,
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

  private getSession(ctx: Context): OrderSession {
    const id = ctx.from!.id;

    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        cart: {},
        messages: {},
        waitingForQuantity: undefined,
      });
    }

    return this.sessions.get(id)!;
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    const userId = ctx.from!.id;

    if (userId === ADMIN_ID) {
      await ctx.reply(
        'Assalomu alaykum! Admin panelga xush kelibsiz 👋',
        adminMenu,
      );
      return;
    }

    await ctx.reply(
      'Assalomu alaykum! MAXFON telefonlar do‘koniga xush kelibsiz 👋',
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
