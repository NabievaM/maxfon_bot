import { Update, Start, Hears, On, Ctx, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { basicMenu, orderMenu } from './keyboards';
import { modelKeyboard } from './order.keyboard';
import { PHONE_MODELS } from './models';
import { contactKeyboard } from './contact.keyboard';
import { OrderSession } from './session';

@Update()
export class BotUpdate {
  private sessions = new Map<number, OrderSession>();

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
    await ctx.reply(
      'Assalomu alaykum! MAXFON telefonlar do‘koniga xush kelibsiz 👋',
      basicMenu,
    );
  }

  @Hears('📱 Telefon narxlari')
  async prices(@Ctx() ctx: Context) {
    await ctx.reply(`
MAXFON
(1 yil servis garantiya)

MR100  - 7.7$
MR001 - 11$
MR475 - 13$
B100 - 14.5$
S700  - 20$
S25 classic - 19$
FLIP 5 - 17$
`);
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
    const session = this.getSession(ctx);

    session.cart = {};
    session.messages = {};
    session.waitingForQuantity = undefined;

    await ctx.reply(
      '📱 Modelni tanlang:',
      Markup.inlineKeyboard(
        PHONE_MODELS.map((m) => [
          Markup.button.callback(m.name, `select_${m.name}`),
        ]),
      ),
    );
  }

  @Action(/select_(.+)/)
  async onSelectModel(@Ctx() ctx: any) {
    const modelName = ctx.match[1];
    const session = this.getSession(ctx);

    const model = PHONE_MODELS.find((m) => m.name === modelName);
    if (!model) return;

    if (session.messages[modelName]) {
      await ctx.answerCbQuery('Bu model allaqachon ochilgan 👇');
      return;
    }

    const photo = model.image.startsWith('http')
      ? model.image
      : { source: model.image };

    const msg = await ctx.replyWithPhoto(photo, {
      caption: `📱 ${model.name}\n💰 ${model.price}$`,
      ...modelKeyboard(model.name, session.cart[modelName] || 0),
    });

    session.messages[modelName] = msg.message_id;
    session.waitingForQuantity = model.name;

    await ctx.reply(
      `✍️ Agar ko‘p miqdor kerak bo‘lsa, ${model.name} uchun faqat RAQAM yuboring\n(masalan: 100 yoki 1000)`,
    );
  }

  @Action(/plus_(.+)/)
  async plus(@Ctx() ctx: any) {
    const model = ctx.match[1];
    const session = this.getSession(ctx);

    session.cart[model] = (session.cart[model] || 0) + 1;

    await ctx.editMessageReplyMarkup(
      modelKeyboard(model, session.cart[model]).reply_markup,
    );

    const hasItems = Object.values(session.cart).some((c) => c > 0);

    if (hasItems && !session.messages['orderMenuShown']) {
      await ctx.reply(
        '🛒 Buyurtmani rasmiylashtirish uchun pastdagi menyulardan foydalaning:',
        orderMenu,
      );
      session.messages['orderMenuShown'] = 1;
    }

    await ctx.answerCbQuery();
  }

  @Action(/minus_(.+)/)
  async minus(@Ctx() ctx: any) {
    const model = ctx.match[1];
    const session = this.getSession(ctx);

    session.cart[model] = Math.max(0, (session.cart[model] || 0) - 1);

    await ctx.editMessageReplyMarkup(
      modelKeyboard(model, session.cart[model]).reply_markup,
    );

    await ctx.answerCbQuery();
  }

  @Action('noop')
  async noop(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
  }

  @Hears('🧺 Korzinka')
  async cart(@Ctx() ctx: Context) {
    const session = this.getSession(ctx);

    let text = '🧺 KORZINKA:\n\n';
    let total = 0;

    for (const [model, count] of Object.entries(session.cart)) {
      const phone = PHONE_MODELS.find((p) => p.name === model);
      if (!phone || count === 0) continue;

      const sum = phone.price * count;
      total += sum;

      text += `📱 ${model} — ${count} dona = ${sum}$\n`;
    }

    text += `\n💵 Umumiy: ${total}$`;
    await ctx.reply(text);
  }

  @Hears('✅ Rasmiylashtirish')
  async finalize(@Ctx() ctx: Context) {
    await ctx.reply('📞 Telefon raqamingizni yuboring 👇', contactKeyboard);
  }

  @On('contact')
  async onContact(@Ctx() ctx: any) {
    const session = this.getSession(ctx);
    const phone = ctx.message.contact.phone_number;

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : 'Username yo‘q';

    let text = '🛒 YANGI BUYURTMA\n\n';
    let total = 0;

    text += `👤 User: ${username}\n`;

    for (const [model, count] of Object.entries(session.cart)) {
      if (count === 0) continue;

      const phoneModel = PHONE_MODELS.find((p) => p.name === model);
      if (!phoneModel) continue;

      const sum = phoneModel.price * count;
      total += sum;

      text += `📱 ${model} — ${count} dona × ${phoneModel.price}$ = ${sum}$\n`;
    }

    text += `\n💵 UMUMIY: ${total}$`;
    text += `\n📞 Telefon: ${phone}`;

    await ctx.telegram.sendMessage(Number(process.env.ADMIN_ID), text);
    await ctx.reply('✅ Buyurtma qabul qilindi!', basicMenu);

    this.sessions.delete(ctx.from.id);
  }

  @On('text')
  async onText(@Ctx() ctx: any) {
    const session = this.getSession(ctx);
    const text = ctx.message.text;

    if (!session.waitingForQuantity) return;
    if (!/^\d+$/.test(text)) return;

    const count = Number(text);
    const model = session.waitingForQuantity;

    session.cart[model] = count;

    const messageId = session.messages[model];
    if (messageId) {
      await ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        messageId,
        undefined,
        modelKeyboard(model, count).reply_markup,
      );
    }

    session.waitingForQuantity = undefined;

    await ctx.reply(`✅ ${model} uchun ${count} dona qo‘shildi`);

    if (!session.messages['orderMenuShown']) {
      await ctx.reply(
        '🛒 Buyurtmani rasmiylashtirish uchun pastdagi menyulardan foydalaning:',
        orderMenu,
      );
      session.messages['orderMenuShown'] = 1;
    }
  }
}
