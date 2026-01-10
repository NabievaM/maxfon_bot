import { Update, Start, Hears, On, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { mainMenu } from './keyboards';
import { modelsKeyboard } from './order.keyboard';
import { PHONE_MODELS } from './models';
import { OrderSession } from './session';

@Update()
export class BotUpdate {
  private sessions = new Map<number, OrderSession>();

  private getSession(ctx: Context): OrderSession {
    const id = ctx.from!.id;
    if (!this.sessions.has(id)) {
      this.sessions.set(id, {});
    }
    return this.sessions.get(id)!;
  }

  @Start()
  async start(@Ctx() ctx: Context) {
    await ctx.reply(
      'Assalomu alaykum! MAXFON telefonlar do‘koniga xush kelibsiz 👋',
      mainMenu,
    );
  }

  @Hears('📱 Telefon narxlari')
  async prices(@Ctx() ctx: Context) {
    await ctx.reply(`
MAXFON
(1 yil servis garantiya)

MR001  - yoʻq
MR100  - 7.7$ 
MR007 - 11$
MR475 - 13$ 
B100 - 14.5$ 
S700  - 20$
S25 classic - 19$
FLIP 5 - 17$ 

Dukon numeri
+998505877373

Maqsadjon
+998505070770
Umidjon
+998502070770
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
    session.step = 'MODEL';
    await ctx.reply('Qaysi modelni tanlaysiz?', modelsKeyboard);
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const session = this.getSession(ctx);

    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text.trim();

    // MODEL
    if (session.step === 'MODEL') {
      if (!PHONE_MODELS.includes(text)) {
        await ctx.reply('Iltimos, modelni tugmalardan tanlang 👇');
        return;
      }

      session.model = text;
      session.step = 'COUNT';
      await ctx.reply('Nechta dona olasiz? (raqam yozing)');
      return;
    }

    // COUNT
    if (session.step === 'COUNT') {
      const count = Number(text);

      if (!Number.isInteger(count) || count <= 0) {
        await ctx.reply('Faqat musbat raqam kiriting ❗️');
        return;
      }

      session.count = count;
      session.step = 'PHONE';
      await ctx.reply(
        'Telefon raqamingizni yuboring 📞\nMasalan: +998901234567',
      );
      return;
    }

    // PHONE
    if (session.step === 'PHONE') {
      if (!/^\+998\d{9}$/.test(text)) {
        await ctx.reply(
          'Telefon raqam noto‘g‘ri formatda ❌\nMasalan: +998901234567',
        );
        return;
      }

      session.phone = text;

      const adminId = Number(process.env.ADMIN_ID);
      await ctx.telegram.sendMessage(
        adminId,
        `🛒 YANGI BUYURTMA
  
  📱 Model: ${session.model}
  📦 Soni: ${session.count}
  📞 Telefon: ${session.phone}
  👤 User: @${ctx.from?.username || 'yo‘q'}`,
      );

      await ctx.reply(
        '✅ Buyurtmangiz qabul qilindi!\nTez orada siz bilan bog‘lanishadi.',
        mainMenu,
      );

      this.sessions.delete(ctx.from!.id);
      return;
    }
  } 
}
