import { Context } from 'telegraf';
import { PhoneService } from '../../phone/phone.service';
import { OrderService } from '../../order/order.service';
import { UserService } from '../../user/user.service';
import { OrderSession } from '../session';
import { basicMenu } from '../keyboards';

const ADMIN_ID = Number(process.env.ADMIN_ID);

export class AdminHelper {
  constructor(
    private phoneService: PhoneService,
    private orderService: OrderService,
    private userService: UserService,
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

  async showPending(ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const users = await this.userService.getPendingUsers();

    if (!users.length) {
      await ctx.reply('So‘rovlar yo‘q');
      return;
    }

    for (const user of users) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      const profile = user.username
        ? `<a href="https://t.me/${user.username}">${name || 'Profil'}</a>`
        : `<a href="tg://user?id=${user.telegramId}">${name || 'Profil'}</a>`;

      const text =
        `🆕 Yangi foydalanuvchi so‘rovi:\n\n` +
        `👤 ${profile}\n` +
        `💻 Username: ${user.username ? '@' + user.username : 'yo‘q'}\n` +
        `🆔 Telegram ID: ${user.telegramId}\n` +
        `📞 Telefon: ${user.phoneNumber || 'yo‘q'}\n` +
        `✅ Holati: Kutilmoqda`;

      await ctx.telegram.sendMessage(ADMIN_ID, text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✅ Ruxsat berish',
                callback_data: `approve_${user.id}`,
              },
              {
                text: '❌ Rad etish',
                callback_data: `reject_${user.id}`,
              },
            ],
          ],
        },
      });
    }
  }

  async approveUser(ctx: any, id: number) {
    if (ctx.from.id !== ADMIN_ID) return;

    await this.userService.approveUser(id);
    const user = await this.userService.findById(id);

    if (user) {
      await ctx.telegram.sendMessage(
        user.telegramId,
        '✅ Sizga ruxsat berildi!\nBotdan foydalanishingiz mumkin.',
        basicMenu,
      );
    }

    await ctx.editMessageText('✅ Ruxsat berildi');
    await ctx.answerCbQuery();
  }

  async rejectUser(ctx: any, id: number) {
    if (ctx.from.id !== ADMIN_ID) return;

    const user = await this.userService.findById(id);
    if (!user) {
      await ctx.answerCbQuery('User topilmadi');
      return;
    }

    await this.userService.rejectUser(id);

    await ctx.telegram.sendMessage(
      user.telegramId,
      `❌ Afsuski, so‘rovingiz admin tomonidan rad etildi.\n\n` +
        `Qayta urinib ko‘rish uchun /start bosing.`,
    );

    await ctx.editMessageText('❌ Rad etildi');
    await ctx.answerCbQuery('Rad etildi');
  }

  async addModel(ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const session = this.getSession(ctx);
    session.adminStep = 'name';

    await ctx.reply('Model nomini kiriting:');
  }

  async listModels(ctx: Context) {
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

  async deleteAsk(ctx: any, id: number) {
    if (ctx.from.id !== ADMIN_ID) return;

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

  async confirmDelete(ctx: any, id: number) {
    if (ctx.from.id !== ADMIN_ID) return;

    await this.phoneService.delete(id);

    await ctx.editMessageCaption('❌ Model o‘chirildi');
    await ctx.answerCbQuery();
  }

  async cancelDelete(ctx: any, id: number) {
    if (ctx.from.id !== ADMIN_ID) return;

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

  async startEdit(ctx: any, id: number) {
    if (ctx.from.id !== ADMIN_ID) return;

    const session = this.getSession(ctx);

    session.adminStep = 'edit_name';
    session.adminData = { id };

    await ctx.reply('✏️ Yangi model nomini kiriting:');
    await ctx.answerCbQuery();
  }

  async showOrders(ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const orders = await this.orderService.findAll();

    if (!orders.length) {
      await ctx.reply('Hozircha buyurtmalar yo‘q');
      return;
    }

    for (const order of orders) {
      const items = JSON.parse(order.items);

      const name = `${order.first_name || ''} ${order.last_name || ''}`.trim();

      const profile = order.username
        ? `<a href="https://t.me/${order.username}">${name || 'Profil'}</a>`
        : `<a href="tg://user?id=${order.userId}">${name || 'Profil'}</a>`;

      const date = new Date(order.createdAt).toLocaleString('uz-UZ');

      let text = `🛒 <b>BUYURTMA</b>\n\n`;

      text += `🆔 <b>Order ID:</b> ${order.id}\n`;
      text += `🕒 <b>Sana:</b> ${date}\n\n`;

      text += `👤 <b>Foydalanuvchi:</b> ${profile}\n`;

      if (order.username) {
        text += `💻 <b>Username:</b> @${order.username}\n`;
      }

      text += `🆔 <b>User ID:</b> ${order.userId}\n\n`;

      let total = 0;

      for (const item of items) {
        text += `📱 ${item.model} — ${item.quantity} dona × ${item.price}$ = ${item.sum}$\n`;
        total += item.sum;
      }

      text += `\n💵 <b>UMUMIY:</b> ${total}$`;
      text += `\n📞 <b>Telefon:</b> ${order.phoneNumber}`;

      await ctx.reply(text, {
        parse_mode: 'HTML',
      });
    }
  }

  async showStats(ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const orders = await this.orderService.findAll();

    if (!orders.length) {
      await ctx.reply('📊 <b>Hozircha buyurtmalar yo‘q</b>', {
        parse_mode: 'HTML',
      });
      return;
    }

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;

    const usersMap = new Map<string, any>();
    const modelsMap = new Map<string, { quantity: number; revenue: number }>();

    for (const order of orders) {
      const key = order.username || order.phoneNumber;

      if (!usersMap.has(key)) {
        usersMap.set(key, {
          first_name: order.first_name,
          last_name: order.last_name,
          totalSpent: order.total,
          ordersCount: 1,
          telegramId: order.userId,
          username: order.username,
        });
      } else {
        const user = usersMap.get(key);
        user.ordersCount += 1;
        user.totalSpent += order.total;
      }

      const items = JSON.parse(order.items);
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

    const topUsers = Array.from(usersMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const topModels = Array.from(modelsMap.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5);

    let text = `📊 <b>STATISTIKA</b>\n\n`;
    text += `💵 <b>Jami daromad:</b> ${totalRevenue}$\n`;
    text += `🛒 <b>Buyurtmalar soni:</b> ${totalOrders}\n\n`;

    text += `<b>👥 Top foydalanuvchilar:</b>\n`;
    topUsers.forEach((u, i) => {
      const profile = u.username
        ? `<a href="https://t.me/${u.username}">${u.first_name || ''} ${u.last_name || ''}</a>`
        : `<a href="tg://user?id=${u.telegramId}">${u.first_name || ''} ${u.last_name || ''}</a>`;
      text += `${i + 1}. ${profile} — <b>${u.ordersCount} buyurtma</b>, <b>${u.totalSpent}$</b>\n`;
    });

    text += `\n<b>📱 Eng ko‘p sotilgan modellari:</b>\n`;
    topModels.forEach(([model, data], i) => {
      text += `${i + 1}. <b>${model}</b> — ${data.quantity} dona, ${data.revenue}$\n`;
    });

    await ctx.reply(text, {
      parse_mode: 'HTML',
    });
  }

  async showUsers(ctx: Context) {
    if (ctx.from!.id !== ADMIN_ID) return;

    const users = await this.userService.findAll();

    if (!users.length) {
      await ctx.reply('Hozircha foydalanuvchilar yo‘q');
      return;
    }

    let text = `👥 Foydalanuvchilar soni: ${users.length}\n\n`;

    for (const user of users) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      const profile = user.username
        ? `<a href="https://t.me/${user.username}">${name || 'Profil'}</a>`
        : `<a href="tg://user?id=${user.telegramId}">${name || 'Profil'}</a>`;

      text += `👤 ${profile}\n`;
      text += `💻 Username: ${user.username ? '@' + user.username : 'yo‘q'}\n`;
      text += `🆔 Telegram ID: ${user.telegramId}\n`;
      text += `📞 Telefon: ${user.phoneNumber || 'yo‘q'}\n`;
      text += `✅ Holati: ${user.approved ? 'Tasdiqlangan' : 'Kutilmoqda'}\n`;
      text += `────────────\n`;
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  }

  async handleText(ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const session = this.getSession(ctx);

    if (session.adminStep === 'edit_name') {
      session.adminData.name = ctx.message.text;
      session.adminStep = 'edit_price';
      await ctx.reply('💰 Yangi narxni kiriting:');
      return;
    }

    if (session.adminStep === 'edit_price') {
      const text = ctx.message.text.trim();

      if (!/^\d+(\.\d+)?$/.test(text)) {
        await ctx.reply(
          '❌ Narx faqat raqam bo‘lishi kerak!\nMasalan: 10 yoki 10.5',
        );
        return;
      }

      const price = Number(text);
      if (price <= 0) {
        await ctx.reply('❌ Narx 0 dan katta!');
        return;
      }

      session.adminData.price = price;
      session.adminStep = 'edit_image';
      await ctx.reply('🖼 Yangi rasm yuboring:');
      return;
    }

    if (session.adminStep === 'name') {
      session.adminData = { name: ctx.message.text };
      session.adminStep = 'price';
      await ctx.reply('Narxini kiriting:');
      return;
    }

    if (session.adminStep === 'price') {
      const text = ctx.message.text.trim();

      if (!/^\d+(\.\d+)?$/.test(text)) {
        await ctx.reply(
          '❌ Narx faqat raqam bo‘lishi kerak!\nMasalan: 10 yoki 10.5',
        );
        return;
      }

      const price = Number(text);
      if (price <= 0) {
        await ctx.reply('❌ Narx 0 dan katta!');
        return;
      }

      session.adminData.price = price;
      session.adminStep = 'image';
      await ctx.reply('🖼 Rasm yuboring:');
      return;
    }
  }

  async handlePhoto(ctx: any) {
    if (ctx.from.id !== ADMIN_ID) return;

    const session = this.getSession(ctx);
    const fileId = ctx.message.photo.at(-1).file_id;

    if (session.adminStep === 'edit_image') {
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

    if (session.adminStep === 'image') {
      await this.phoneService.create({
        name: session.adminData.name,
        price: session.adminData.price,
        image: fileId,
      });

      session.adminStep = undefined;
      session.adminData = undefined;

      await ctx.reply('✅ Model saqlandi!');
      return;
    }
  }
}
