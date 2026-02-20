import { Context, Markup } from 'telegraf';
import { PhoneService } from '../../phone/phone.service';
import { OrderService } from '../../order/order.service';
import { orderMenu, basicMenu } from '../keyboards';
import { modelKeyboard } from '../order.keyboard';
import { contactKeyboard } from '../contact.keyboard';
import { OrderSession } from '../session';

const ADMIN_ID = Number(process.env.ADMIN_ID);

export class OrderHelper {
  constructor(
    private phoneService: PhoneService,
    private orderService: OrderService,
    private sessions: Map<number, OrderSession>,
  ) {}

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

  async prices(ctx: Context) {
    const phones = await this.phoneService.findAll();

    if (!phones.length) {
      await ctx.reply('❌ Hozircha telefonlar mavjud emas');
      return;
    }

    for (const phone of phones) {
      await ctx.replyWithPhoto(phone.image, {
        caption: `📱 ${phone.name}\n💰 ${phone.price}$`,
      });
    }
  }

  async myOrders(ctx: Context) {
    const userId = ctx.from!.id;
    if (userId === ADMIN_ID) return;

    const orders = await this.orderService.findAll();
    const myOrders = orders.filter((o) => o.userId === userId);

    if (!myOrders.length) {
      await ctx.reply('❌ Sizda hali buyurtmalar mavjud emas');
      return;
    }

    for (const order of myOrders) {
      const items = JSON.parse(order.items);

      let text = `📦 BUYURTMANGIZ\n\n`;
      let total = 0;

      for (const item of items) {
        text += `📱 ${item.model} — ${item.quantity} dona × ${item.price}$ = ${item.sum}$\n`;
        total += item.sum;
      }

      text += `\n💵 Umumiy: ${total}$`;
      text += `\n📞 Telefon: ${order.phoneNumber}`;

      await ctx.reply(text);
    }
  }

  async order(ctx: Context) {
    const phones = await this.phoneService.findAll();

    await ctx.reply(
      '📱 Modelni tanlang:',
      Markup.inlineKeyboard(
        phones.map((m) => [Markup.button.callback(m.name, `select_${m.id}`)]),
      ),
    );
  }

  async selectModel(ctx: any, id: number) {
    const session = this.getSession(ctx);
    const phone = await this.phoneService.findOne(id);
    if (!phone) return;

    if (session.messages[id]) {
      await ctx.answerCbQuery('Bu model allaqachon ochilgan 👇');
      return;
    }

    const msg = await ctx.replyWithPhoto(phone.image, {
      caption: `📱 ${phone.name}\n💰 ${phone.price}$`,
      ...modelKeyboard(String(phone.id), session.cart[id] || 0),
    });

    session.messages[id] = msg.message_id;
    session.waitingForQuantity = String(id);

    await ctx.reply(
      `✍️ Agar ko‘p miqdor kerak bo‘lsa, ${phone.name} uchun faqat RAQAM yuboring\n(masalan: 100 yoki 1000)`,
    );

    await ctx.answerCbQuery();
  }

  async plus(ctx: any, model: string) {
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

  async minus(ctx: any, model: string) {
    const session = this.getSession(ctx);
    const current = session.cart[model] || 0;

    if (current === 0) {
      await ctx.answerCbQuery();
      return;
    }

    session.cart[model] = current - 1;

    await ctx.editMessageReplyMarkup(
      modelKeyboard(model, session.cart[model]).reply_markup,
    );

    await ctx.answerCbQuery();
  }

  async noop(ctx: any) {
    await ctx.answerCbQuery();
  }

  async cart(ctx: Context) {
    const session = this.getSession(ctx);

    let text = '🧺 KORZINKA:\n\n';
    let total = 0;

    for (const [id, count] of Object.entries(session.cart)) {
      if (count === 0) continue;

      const phone = await this.phoneService.findOne(Number(id));
      if (!phone) continue;

      const sum = phone.price * count;
      total += sum;

      text += `📱 ${phone.name} — ${count} dona = ${sum}$\n`;
    }

    text += `\n💵 Umumiy: ${total}$`;

    await ctx.reply(text);
  }

  async finalize(ctx: Context) {
    await ctx.reply('📞 Telefon raqamingizni yuboring 👇', contactKeyboard);
  }

  async onContact(ctx: any) {
    const session = this.getSession(ctx);

    if (!Object.values(session.cart).some((c) => c > 0)) {
      await ctx.reply('❌ Korzinka bo‘sh!');
      return;
    }

    const phoneNumber = ctx.message.contact.phone_number;

    const username = ctx.from.username
      ? `@${ctx.from.username}`
      : 'Username yo‘q';

    const first_name = ctx.from.first_name || 'Noma’lum';
    const last_name = ctx.from.last_name || '';

    let text = '🛒 YANGI BUYURTMA\n\n';
    let total = 0;

    type OrderItem = {
      model: string;
      price: number;
      quantity: number;
      sum: number;
    };

    const itemsArray: OrderItem[] = [];

    for (const [id, count] of Object.entries(session.cart)) {
      if (count === 0) continue;

      const phoneModel = await this.phoneService.findOne(Number(id));
      if (!phoneModel) continue;

      const sum = phoneModel.price * count;
      total += sum;

      text += `📱 ${phoneModel.name} — ${count} dona × ${phoneModel.price}$ = ${sum}$\n`;

      itemsArray.push({
        model: phoneModel.name,
        price: phoneModel.price,
        quantity: count,
        sum,
      });
    }

    text += `\n💵 UMUMIY: ${total}$`;
    text += `\n📞 Telefon: ${phoneNumber}`;

    await this.orderService.create({
      userId: ctx.from.id,
      username,
      first_name,
      last_name,
      phoneNumber,
      items: JSON.stringify(itemsArray),
      total,
    });

    await ctx.telegram.sendMessage(ADMIN_ID, text);

    await ctx.reply('✅ Buyurtma qabul qilindi!', basicMenu);

    this.sessions.delete(ctx.from.id);
  }

  async handleText(ctx: any) {
    const session = this.getSession(ctx);
    const text = ctx.message.text;

    if (!session.waitingForQuantity) return;

    if (!/^\d+$/.test(text)) {
      await ctx.reply('❌ Faqat butun son kiriting!\nMasalan: 10 yoki 100');
      return;
    }

    const count = Number(text);
    const modelId = Number(session.waitingForQuantity);

    const phone = await this.phoneService.findOne(modelId);

    if (!phone) {
      await ctx.reply('❌ Telefon topilmadi!');
      return;
    }

    session.cart[modelId] = count;

    const messageId = session.messages[modelId];

    if (messageId) {
      await ctx.telegram.editMessageReplyMarkup(
        ctx.chat.id,
        messageId,
        undefined,
        modelKeyboard(String(modelId), count).reply_markup,
      );
    }

    session.waitingForQuantity = undefined;

    await ctx.reply(`✅ "${phone.name}" uchun ${count} dona qo‘shildi`);

    if (!session.messages['orderMenuShown']) {
      await ctx.reply(
        '🛒 Buyurtmani rasmiylashtirish uchun pastdagi menyulardan foydalaning:',
        orderMenu,
      );

      session.messages['orderMenuShown'] = 1;
    }
  }
}
