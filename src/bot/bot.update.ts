import { Update, Start, Hears, On, Ctx, Action } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { basicMenu, orderMenu, adminMenu } from './keyboards';
import { modelKeyboard } from './order.keyboard';
import { PhoneService } from '../phone/phone.service';
import { OrderService } from '../order/order.service';
import { contactKeyboard } from './contact.keyboard';
import { OrderSession } from './session';
const ADMIN_ID = Number(process.env.ADMIN_ID);

@Update()
export class BotUpdate {
  constructor(
    private phoneService: PhoneService,
    private orderService: OrderService,
  ) {}

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
    const userId = ctx.from!.id;

    if (userId === ADMIN_ID) {
      await ctx.reply('👑 Admin panelga xush kelibsiz', adminMenu);
      return;
    }

    await ctx.reply(
      'Assalomu alaykum! MAXFON telefonlar do‘koniga xush kelibsiz 👋',
      basicMenu,
    );
  }

  @Hears('📱 Telefon narxlari')
  async prices(@Ctx() ctx: Context) {
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
    const phones = await this.phoneService.findAll();

    await ctx.reply(
      '📱 Modelni tanlang:',
      Markup.inlineKeyboard(
        phones.map((m) => [Markup.button.callback(m.name, `select_${m.id}`)]),
      ),
    );
  }

  @Action(/select_(.+)/)
  async onSelectModel(@Ctx() ctx: any) {
    const id = Number(ctx.match[1]);
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
    session.waitingForQuantity = String(id); // 🔥 MUHIM QATOR

    await ctx.reply(
      `✍️ Agar ko‘p miqdor kerak bo‘lsa, ${phone.name} uchun faqat RAQAM yuboring\n(masalan: 100 yoki 1000)`,
    );

    await ctx.answerCbQuery();
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

  @Action('noop')
  async noop(@Ctx() ctx: any) {
    await ctx.answerCbQuery();
  }

  @Hears('🧺 Korzinka')
  async cart(@Ctx() ctx: Context) {
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

  @Hears('✅ Rasmiylashtirish')
  async finalize(@Ctx() ctx: Context) {
    await ctx.reply('📞 Telefon raqamingizni yuboring 👇', contactKeyboard);
  }

  @On('contact')
  async onContact(@Ctx() ctx: any) {
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

    text += `👤 User: ${username}\n`;

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

  //For admin

  @Hears('➕ Model qo‘shish')
  async addModel(@Ctx() ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const session = this.getSession(ctx);
    session.adminStep = 'name';

    await ctx.reply('Model nomini kiriting:');
  }

  @Hears('📋 Modellar ro‘yxati')
  async listModels(@Ctx() ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const phones = await this.phoneService.findAll();

    if (!phones.length) {
      await ctx.reply('Hozircha model yo‘q');
      return;
    }

    for (const phone of phones) {
      await ctx.replyWithPhoto(phone.image, {
        caption: `📱 ${phone.name}\n💰 ${phone.price}$`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✏️ Tahrirlash', callback_data: `edit_${phone.id}` },
              { text: '❌ O‘chirish', callback_data: `delete_${phone.id}` },
            ],
          ],
        },
      });
    }
  }

  @Action(/^delete_(\d+)$/)
  async deletePhone(@Ctx() ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const id = Number(ctx.match[1]);

    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          { text: '✅ Tasdiqlash', callback_data: `confirm_delete_${id}` },
          { text: '❌ Bekor qilish', callback_data: `cancel_delete_${id}` },
        ],
      ],
    });

    await ctx.answerCbQuery();
  }

  @Action(/^confirm_delete_(\d+)$/)
  async confirmDelete(@Ctx() ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const id = Number(ctx.match[1]);

    await this.phoneService.delete(id);

    await ctx.editMessageCaption('❌ Model o‘chirildi');
    await ctx.answerCbQuery();
  }

  @Action(/^cancel_delete_(\d+)$/)
  async cancelDelete(@Ctx() ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const id = Number(ctx.match[1]);
    const phone = await this.phoneService.findOne(id);
    if (!phone) return;

    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          { text: '✏️ Tahrirlash', callback_data: `edit_${phone.id}` },
          { text: '❌ O‘chirish', callback_data: `delete_${phone.id}` },
        ],
      ],
    });

    await ctx.answerCbQuery();
  }

  @Action(/edit_(.+)/)
  async editPhone(@Ctx() ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const id = Number(ctx.match[1]);
    const session = this.getSession(ctx);

    session.adminStep = 'edit_name';
    session.adminData = { id };

    await ctx.reply('✏️ Yangi model nomini kiriting:');
    await ctx.answerCbQuery();
  }

  @Hears('📦 Buyurtmalar')
  async showOrders(@Ctx() ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const orders = await this.orderService.findAll(); // hamma buyurtmalar

    if (!orders.length) {
      await ctx.reply('Hozircha buyurtmalar yo‘q');
      return;
    }

    for (const order of orders) {
      const items = JSON.parse(order.items) as {
        model: string;
        price: number;
        quantity: number;
        sum: number;
      }[];

      let text = `👤 User: ${order.username}\n📞 ${order.phoneNumber}\n\n`;

      let total = 0;
      for (const item of items) {
        text += `📱 ${item.model} — ${item.quantity} dona × ${item.price}$ = ${item.sum}$\n`;
        total += item.sum;
      }

      text += `\n💵 Umumiy: ${total}$`;

      await ctx.reply(text);
    }
  }

  @Hears('📊 Statistika')
  async showStats(@Ctx() ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const orders = await this.orderService.findAll();

    if (!orders.length) {
      await ctx.reply('Hozircha buyurtmalar yo‘q');
      return;
    }

    // 1. Jami daromad va buyurtmalar soni
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;

    // 2. Foydalanuvchilar statistikasi
    const usersMap = new Map<
      string,
      {
        username: string;
        first_name: string;
        last_name: string;
        totalSpent: number;
        ordersCount: number;
      }
    >();

    // 3. Model bo‘yicha sotilgan son va daromad
    const modelsMap = new Map<string, { quantity: number; revenue: number }>();

    for (const order of orders) {
      // Foydalanuvchi
      const key = order.username || order.phoneNumber;
      if (!usersMap.has(key)) {
        usersMap.set(key, {
          username: order.username,
          first_name: order.first_name,
          last_name: order.last_name,
          totalSpent: order.total,
          ordersCount: 1,
        });
      } else {
        const user = usersMap.get(key)!;
        user.ordersCount += 1;
        user.totalSpent += order.total;
      }

      // Model
      const items = JSON.parse(order.items) as {
        model: string;
        quantity: number;
        sum: number;
      }[];
      for (const item of items) {
        if (!modelsMap.has(item.model)) {
          modelsMap.set(item.model, {
            quantity: item.quantity,
            revenue: item.sum,
          });
        } else {
          const m = modelsMap.get(item.model)!;
          m.quantity += item.quantity;
          m.revenue += item.sum;
        }
      }
    }

    // Top foydalanuvchilar
    const topUsers = Array.from(usersMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Top sotilgan modellari
    const topModels = Array.from(modelsMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5);

    let text = `📊 STATISTIKA\n\n`;
    text += `💵 Jami daromad: ${totalRevenue}$\n`;
    text += `🛒 Buyurtmalar soni: ${totalOrders}\n\n`;

    text += `👥 Top foydalanuvchilar (daromad bo‘yicha):\n`;
    topUsers.forEach((u, i) => {
      text += `${i + 1}. ${u.first_name} ${u.last_name} - ${u.ordersCount} buyurtma, ${u.totalSpent}$\n`;
    });

    text += `\n📱 Eng ko‘p sotilgan modellari:\n`;
    topModels.forEach(([model, data], i) => {
      text += `${i + 1}. ${model} - ${data.quantity} dona, ${data.revenue}$\n`;
    });

    await ctx.reply(text);
  }

  @Hears('👥 Foydalanuvchilar')
  async showUsers(@Ctx() ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const orders = await this.orderService.findAll();

    if (!orders.length) {
      await ctx.reply('Hozircha foydalanuvchilar yo‘q');
      return;
    }

    const usersMap = new Map<string, any>();

    for (const order of orders) {
      const key = order.username || order.phoneNumber; // username bo‘lmasa phone bilan unique qilish
      if (!usersMap.has(key)) {
        usersMap.set(key, {
          username: order.username,
          phoneNumber: order.phoneNumber,
          first_name: order.first_name,
          last_name: order.last_name,
          ordersCount: 1,
          totalSpent: order.total,
        });
      } else {
        const user = usersMap.get(key);
        user.ordersCount += 1;
        user.totalSpent += order.total;
      }
    }

    let text = `👥 Foydalanuvchilar soni: ${usersMap.size}\n\n`;

    for (const user of usersMap.values()) {
      text += `👤 ${user.first_name} ${user.last_name}\n`;
      text += `📱 Telefon: ${user.phoneNumber}\n`;
      text += `💻 Username: ${user.username}\n`;
      text += `🛒 Buyurtma soni: ${user.ordersCount}\n`;
      text += `💵 Jami sarf: ${user.totalSpent}$\n\n`;
    }

    await ctx.reply(text);
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: any) {
    const session = this.getSession(ctx);

    if (ctx.from.id === ADMIN_ID && session.adminStep === 'edit_image') {
      const fileId = ctx.message.photo.at(-1).file_id;

      await this.phoneService.update(session.adminData.id, {
        name: session.adminData.name,
        price: session.adminData.price,
        image: fileId,
      });

      session.adminStep = undefined;
      session.adminData = undefined;

      await ctx.reply('✅ Model yangilandi!');
      return;
    }

    if (ctx.from.id !== ADMIN_ID) return;
    if (session.adminStep !== 'image') return;

    const fileId = ctx.message.photo.at(-1).file_id;

    await this.phoneService.create({
      name: session.adminData.name,
      price: session.adminData.price,
      image: fileId,
    });

    session.adminStep = undefined;
    session.adminData = undefined;

    await ctx.reply('✅ Model saqlandi!');
  }

  //
  @On('text')
  async onText(@Ctx() ctx: any) {
    const session = this.getSession(ctx);

    // EDIT NAME
    if (ctx.from.id === ADMIN_ID && session.adminStep === 'edit_name') {
      session.adminData.name = ctx.message.text;
      session.adminStep = 'edit_price';
      await ctx.reply('💰 Yangi narxni kiriting:');
      return;
    }

    // EDIT PRICE
    if (ctx.from.id === ADMIN_ID && session.adminStep === 'edit_price') {
      const text = ctx.message.text.trim();

      if (!/^\d+(\.\d+)?$/.test(text)) {
        await ctx.reply(
          '❌ Narx faqat raqam bo‘lishi kerak!\nMasalan: 10 yoki 10.5',
        );
        return;
      }

      const price = Number(text);

      if (price <= 0) {
        await ctx.reply('❌ Narx 0 dan katta bo‘lishi kerak!');
        return;
      }

      session.adminData.price = price;
      session.adminStep = 'edit_image';

      await ctx.reply('🖼 Yangi rasm yuboring:');
      return;
    }

    if (ctx.from.id === ADMIN_ID && session.adminStep === 'name') {
      session.adminData = { name: ctx.message.text };
      session.adminStep = 'price';
      await ctx.reply('Narxini kiriting:');
      return;
    }

    if (ctx.from.id === ADMIN_ID && session.adminStep === 'price') {
      const text = ctx.message.text.trim();

      if (!/^\d+(\.\d+)?$/.test(text)) {
        await ctx.reply(
          '❌ Narx faqat raqam bo‘lishi kerak!\nMasalan: 10 yoki 10.5',
        );
        return;
      }

      const price = Number(text);

      if (price <= 0) {
        await ctx.reply('❌ Narx 0 dan katta bo‘lishi kerak!');
        return;
      }

      session.adminData.price = price;
      session.adminStep = 'image';

      await ctx.reply('🖼 Rasm yuboring:');
      return;
    }

    const text = ctx.message.text;

    if (!session.waitingForQuantity) return;
    if (!/^\d+$/.test(text)) {
      await ctx.reply('❌ Faqat butun son kiriting!\nMasalan: 10 yoki 100');
      return;
    }

    const count = Number(text);
    const modelId = Number(session.waitingForQuantity); // id
    const phone = await this.phoneService.findOne(modelId); // nom olish

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
