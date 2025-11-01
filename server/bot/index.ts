import { Telegraf, Markup, Context } from 'telegraf';
import type { Update } from 'telegraf/types';
import { db } from '../database';
import type { BotSession, CartItem } from '@shared/bot-schema';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || 'Mening Restoranim';
const DELIVERY_PRICE = parseInt(process.env.DELIVERY_PRICE || '10000');

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN not found in environment variables');
}

interface BotContext extends Context {
  session: BotSession;
}

const sessions = new Map<number, BotSession>();

function getSession(userId: number): BotSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      cart: [],
      state: 'MAIN_MENU',
    });
  }
  return sessions.get(userId)!;
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Middleware to attach session
bot.use((ctx, next) => {
  if (ctx.from) {
    ctx.session = getSession(ctx.from.id);
  }
  return next();
});

// Start command
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id;
  const user = await db.getUser(telegramId);

  if (!user) {
    await ctx.reply(
      `👋 Xush kelibsiz ${RESTAURANT_NAME}ga!\n\n` +
      `Bizda eng mazali taomlar va tez yetkazib berish!\n\n` +
      `📱 Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:`,
      Markup.keyboard([
        Markup.button.contactRequest('📞 Telefon raqamni yuborish')
      ]).resize()
    );
    ctx.session.state = 'AWAITING_PHONE';
  } else {
    await showMainMenu(ctx);
  }
});

// Handle contact (phone number)
bot.on('contact', async (ctx) => {
  const telegramId = ctx.from.id;
  const phone = ctx.message.contact.phone_number;
  const name = ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : '');

  await db.createUser({
    telegramId,
    phone,
    name,
    notificationsEnabled: true,
  });

  await ctx.reply(`✅ Ro'yxatdan o'tdingiz, ${name}!`);
  await showMainMenu(ctx);
});

// Main menu
async function showMainMenu(ctx: BotContext) {
  const session = ctx.session;
  const cartCount = session.cart?.length || 0;

  await ctx.reply(
    `🏠 Asosiy menyu:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🍕 Menyu', 'menu'), Markup.button.callback(`🛒 Savatim (${cartCount})`, 'cart')],
      [Markup.button.callback('📦 Buyurtmalarim', 'orders'), Markup.button.callback('ℹ️ Biz haqimizda', 'about')],
      [Markup.button.callback('⚙️ Sozlamalar', 'settings')],
    ])
  );
  session.state = 'MAIN_MENU';
}

// Menu - Categories
bot.action('menu', async (ctx) => {
  const categories = await db.getAllCategories();
  const buttons = categories.map(cat => 
    Markup.button.callback(`${cat.icon} ${cat.name}`, `category_${cat.id}`)
  );

  const keyboard = [];
  for (let i = 0; i < buttons.length; i += 2) {
    keyboard.push(buttons.slice(i, i + 2));
  }
  keyboard.push([Markup.button.callback('⬅️ Ortga', 'main_menu')]);

  await ctx.editMessageText(
    `Qaysi bo'limdan buyurtma berasiz?`,
    Markup.inlineKeyboard(keyboard)
  );
  ctx.session.state = 'BROWSING_CATEGORIES';
});

// Category products
bot.action(/category_(\d+)/, async (ctx) => {
  const categoryId = parseInt(ctx.match[1]);
  const category = await db.getCategoryById(categoryId);
  const products = await db.getProductsByCategory(categoryId);

  if (!category || products.length === 0) {
    await ctx.answerCbQuery('Bu kategoriyada mahsulot yo\'q');
    return;
  }

  let message = `${category.icon} ${category.name.toUpperCase()}\n\n`;
  const buttons = products.map((prod, idx) => {
    message += `${idx + 1}️⃣ ${prod.name}\n`;
    message += `   💰 ${prod.basePrice.toLocaleString()} so'm\n`;
    message += `   📝 ${prod.description}\n\n`;
    return Markup.button.callback(`➕ ${prod.name}`, `product_${prod.id}`);
  });

  const keyboard = [];
  for (let i = 0; i < buttons.length; i++) {
    keyboard.push([buttons[i]]);
  }
  keyboard.push([
    Markup.button.callback('⬅️ Ortga', 'menu'),
    Markup.button.callback('🛒 Savatga o\'tish', 'cart')
  ]);

  await ctx.editMessageText(message, Markup.inlineKeyboard(keyboard));
});

// Product details
bot.action(/product_(\d+)/, async (ctx) => {
  const productId = parseInt(ctx.match[1]);
  const product = await db.getProductById(productId);

  if (!product) {
    await ctx.answerCbQuery('Mahsulot topilmadi');
    return;
  }

  ctx.session.tempProduct = {
    productId: product.id,
    quantity: 1,
    extras: [],
  };

  let message = `${product.name}\n💰 ${product.basePrice.toLocaleString()} so'm\n\n`;
  message += `📝 Tarkibi:\n${product.description}\n\n`;

  const keyboard = [];

  if (product.sizes && product.sizes.length > 0) {
    message += `O'lchamni tanlang:\n`;
    const sizeButtons = product.sizes.map(s => 
      Markup.button.callback(s.size, `size_${s.size}`)
    );
    keyboard.push(sizeButtons);
  }

  message += `\nMiqdorini tanlang:\n`;
  keyboard.push([
    Markup.button.callback('➖', 'decrease_qty'),
    Markup.button.callback('1', 'qty_display'),
    Markup.button.callback('➕', 'increase_qty'),
  ]);

  if (product.extras && product.extras.length > 0) {
    message += `\nQo'shimchalar:\n`;
    product.extras.forEach(extra => {
      message += `• ${extra.name} (+${extra.price.toLocaleString()})\n`;
      keyboard.push([Markup.button.callback(`[ ] ${extra.name}`, `extra_${extra.name}`)]);
    });
  }

  keyboard.push([
    Markup.button.callback('✅ Savatga qo\'shish', 'add_to_cart'),
    Markup.button.callback('❌ Bekor qilish', `category_${product.categoryId}`)
  ]);

  await ctx.editMessageText(message, Markup.inlineKeyboard(keyboard));
  ctx.session.state = 'VIEWING_PRODUCT';
});

// Size selection
bot.action(/size_(.+)/, async (ctx) => {
  const size = ctx.match[1];
  ctx.session.tempProduct!.size = size;
  await ctx.answerCbQuery(`O'lcham tanlandi: ${size}`);
});

// Quantity controls
bot.action('increase_qty', async (ctx) => {
  ctx.session.tempProduct!.quantity++;
  await ctx.answerCbQuery(`Miqdor: ${ctx.session.tempProduct!.quantity}`);
});

bot.action('decrease_qty', async (ctx) => {
  if (ctx.session.tempProduct!.quantity > 1) {
    ctx.session.tempProduct!.quantity--;
  }
  await ctx.answerCbQuery(`Miqdor: ${ctx.session.tempProduct!.quantity}`);
});

bot.action('qty_display', async (ctx) => {
  await ctx.answerCbQuery(`Miqdor: ${ctx.session.tempProduct!.quantity}`);
});

// Extra selection
bot.action(/extra_(.+)/, async (ctx) => {
  const extraName = ctx.match[1];
  const extras = ctx.session.tempProduct!.extras;
  const index = extras.indexOf(extraName);
  
  if (index === -1) {
    extras.push(extraName);
    await ctx.answerCbQuery(`Qo'shildi: ${extraName}`);
  } else {
    extras.splice(index, 1);
    await ctx.answerCbQuery(`O'chirildi: ${extraName}`);
  }
});

// Add to cart
bot.action('add_to_cart', async (ctx) => {
  const tempProduct = ctx.session.tempProduct!;
  const product = await db.getProductById(tempProduct.productId);
  
  if (!product) {
    await ctx.answerCbQuery('Xatolik yuz berdi');
    return;
  }

  let price = product.basePrice;
  
  if (tempProduct.size && product.sizes) {
    const sizeData = product.sizes.find(s => s.size === tempProduct.size);
    if (sizeData) price += sizeData.priceModifier;
  }

  if (tempProduct.extras.length > 0 && product.extras) {
    tempProduct.extras.forEach(extraName => {
      const extra = product.extras!.find(e => e.name === extraName);
      if (extra) price += extra.price;
    });
  }

  price *= tempProduct.quantity;

  const cartItem: CartItem = {
    productId: product.id,
    productName: product.name,
    quantity: tempProduct.quantity,
    size: tempProduct.size,
    extras: tempProduct.extras.length > 0 ? tempProduct.extras : undefined,
    price,
  };

  ctx.session.cart!.push(cartItem);
  await ctx.answerCbQuery('✅ Savatga qo\'shildi!');
  await showCart(ctx);
});

// Cart view
async function showCart(ctx: BotContext) {
  const cart = ctx.session.cart || [];

  if (cart.length === 0) {
    await ctx.editMessageText(
      `🛒 Sizning savatingiz bo'sh\n\nMahsulot qo'shish uchun menyuga o'ting.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🍕 Menyu', 'menu')],
        [Markup.button.callback('⬅️ Ortga', 'main_menu')],
      ])
    );
    return;
  }

  let message = `🛒 Sizning savatingiz:\n\n`;
  let subtotal = 0;

  cart.forEach((item, idx) => {
    message += `${idx + 1}. ${item.productName}`;
    if (item.size) message += ` (${item.size})`;
    message += ` x${item.quantity}\n`;
    message += `   ${item.price.toLocaleString()} so'm\n`;
    if (item.extras && item.extras.length > 0) {
      message += `   Qo'shimcha: ${item.extras.join(', ')}\n`;
    }
    message += `\n`;
    subtotal += item.price;
  });

  message += `━━━━━━━━━━━━━━━━━\n`;
  message += `💵 Jami: ${subtotal.toLocaleString()} so'm\n`;
  message += `🚚 Yetkazib berish: ${DELIVERY_PRICE.toLocaleString()} so'm\n`;
  message += `━━━━━━━━━━━━━━━━━\n`;
  message += `✅ UMUMIY: ${(subtotal + DELIVERY_PRICE).toLocaleString()} so'm`;

  const keyboard = [
    [Markup.button.callback('📦 Buyurtma berish', 'checkout')],
    [Markup.button.callback('🔙 Menuga qaytish', 'menu'), Markup.button.callback('🗑 Savatni tozalash', 'clear_cart')],
  ];

  await ctx.editMessageText(message, Markup.inlineKeyboard(keyboard));
  ctx.session.state = 'CART_VIEW';
}

bot.action('cart', showCart);

// Clear cart
bot.action('clear_cart', async (ctx) => {
  ctx.session.cart = [];
  await ctx.answerCbQuery('Savat tozalandi');
  await showCart(ctx);
});

// Checkout - address input
bot.action('checkout', async (ctx) => {
  if (!ctx.session.cart || ctx.session.cart.length === 0) {
    await ctx.answerCbQuery('Savat bo\'sh!');
    return;
  }

  const user = await db.getUser(ctx.from!.id);
  const savedAddresses = await db.getUserAddresses(user!.id);

  const keyboard = [
    [Markup.button.callback('📌 Geolokatsiya yuborish', 'send_location')],
    [Markup.button.callback('✍️ Manzilni yozish', 'write_address')],
  ];

  if (savedAddresses.length > 0) {
    keyboard.unshift([Markup.button.callback('📋 Avvalgi manzillarim', 'saved_addresses')]);
  }

  keyboard.push([Markup.button.callback('⬅️ Ortga', 'cart')]);

  await ctx.editMessageText(
    `📍 Yetkazib berish manzilini yuboring:`,
    Markup.inlineKeyboard(keyboard)
  );
  ctx.session.state = 'ENTERING_ADDRESS';
});

// Address input handlers
bot.action('write_address', async (ctx) => {
  await ctx.reply('📝 Manzilni yozing (masalan: Toshkent sh, Chilonzor tumani, 12-mavze, 25-uy):');
  ctx.session.state = 'AWAITING_ADDRESS_TEXT';
});

bot.on('text', async (ctx) => {
  if (ctx.session.state === 'AWAITING_ADDRESS_TEXT') {
    ctx.session.tempAddress = {
      address: ctx.message.text,
    };

    await ctx.reply(
      `Manzil qabul qilindi ✅\n📍 ${ctx.message.text}\n\nTo'g'rimi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Ha, to\'g\'ri', 'confirm_address'), Markup.button.callback('✏️ O\'zgartirish', 'write_address')],
      ])
    );
  } else if (ctx.session.state === 'AWAITING_ADDITIONAL_INFO') {
    ctx.session.tempAdditionalInfo = ctx.message.text;
    await askPaymentMethod(ctx);
  }
});

// Location handler
bot.on('location', async (ctx) => {
  if (ctx.session.state === 'ENTERING_ADDRESS') {
    const { latitude, longitude } = ctx.message.location;
    const address = `📍 Geolokatsiya: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    
    ctx.session.tempAddress = {
      address,
      latitude,
      longitude,
    };

    await ctx.reply(
      `Manzil qabul qilindi ✅\n${address}\n\nTo'g'rimi?`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Ha, to\'g\'ri', 'confirm_address'), Markup.button.callback('✏️ O\'zgartirish', 'checkout')],
      ])
    );
  }
});

bot.action('confirm_address', async (ctx) => {
  await ctx.reply(
    `📝 Qo'shimcha izoh (ixtiyoriy):\n\nMasalan:\n- Podezd/квартира\n- Eshikni qanday ochish\n- Qo'shimcha yo'riqnoma`,
    Markup.inlineKeyboard([
      [Markup.button.callback('⏭ O\'tkazib yuborish', 'skip_additional_info')],
    ])
  );
  ctx.session.state = 'AWAITING_ADDITIONAL_INFO';
});

bot.action('skip_additional_info', async (ctx) => {
  await askPaymentMethod(ctx);
});

async function askPaymentMethod(ctx: BotContext) {
  await ctx.reply(
    `💳 To'lov usulini tanlang:`,
    Markup.inlineKeyboard([
      [Markup.button.callback('💵 Naqd pul', 'payment_cash')],
      [Markup.button.callback('💳 Payme', 'payment_payme'), Markup.button.callback('💳 Click', 'payment_click')],
      [Markup.button.callback('💳 Uzum Bank', 'payment_uzum')],
      [Markup.button.callback('⬅️ Ortga', 'checkout')],
    ])
  );
  ctx.session.state = 'SELECTING_PAYMENT';
}

// Payment method selection
bot.action(/payment_(.+)/, async (ctx) => {
  const method = ctx.match[1];
  ctx.session.tempPaymentMethod = method;

  const user = await db.getUser(ctx.from!.id);
  const cart = ctx.session.cart!;
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + DELIVERY_PRICE;

  const order = await db.createOrder({
    userId: user!.id,
    status: 'pending',
    total,
    address: ctx.session.tempAddress!.address,
    latitude: ctx.session.tempAddress?.latitude,
    longitude: ctx.session.tempAddress?.longitude,
    paymentMethod: method as any,
    additionalInfo: ctx.session.tempAdditionalInfo,
    estimatedTime: '30-40 daqiqa',
  });

  for (const item of cart) {
    await db.createOrderItem({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      size: item.size,
      extras: item.extras,
      price: item.price,
    });
  }

  ctx.session.cart = [];

  const paymentMethodNames: Record<string, string> = {
    cash: 'Naqd',
    payme: 'Payme',
    click: 'Click',
    uzum: 'Uzum Bank',
  };

  const orderItems = await db.getOrderItems(order.id);
  let itemsList = '';
  orderItems.forEach(item => {
    itemsList += `- ${item.productName}`;
    if (item.size) itemsList += ` (${item.size})`;
    itemsList += ` x${item.quantity} - ${item.price.toLocaleString()}\n`;
  });

  await ctx.reply(
    `🎉 Buyurtmangiz qabul qilindi!\n\n` +
    `📦 Buyurtma #${order.id}\n\n` +
    `🛒 Mahsulotlar:\n${itemsList}\n` +
    `📍 Manzil: ${order.address}\n` +
    `💳 To'lov: ${paymentMethodNames[method]}\n` +
    `💰 Jami: ${total.toLocaleString()} so'm\n\n` +
    `⏱ Taxminiy vaqt: ${order.estimatedTime}\n\n` +
    `Holat: 🟡 Tayyorlanmoqda...`,
    Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Asosiy menyu', 'main_menu')],
    ])
  );

  setTimeout(() => {
    db.updateOrderStatus(order.id, 'confirmed');
  }, 5000);
});

// Orders list
bot.action('orders', async (ctx) => {
  const user = await db.getUser(ctx.from!.id);
  const orders = await db.getUserOrders(user!.id);

  if (orders.length === 0) {
    await ctx.editMessageText(
      `📦 Sizda hali buyurtmalar yo'q`,
      Markup.inlineKeyboard([[Markup.button.callback('⬅️ Asosiy menyu', 'main_menu')]])
    );
    return;
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const historyOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).slice(0, 5);

  let message = `📦 Sizning buyurtmalaringiz:\n\n`;

  if (activeOrders.length > 0) {
    message += `🟢 Faol:\n`;
    activeOrders.forEach(order => {
      const statusEmoji = order.status === 'on_the_way' ? '🚚' : '🟡';
      message += `#${order.id} - ${statusEmoji} ${getStatusText(order.status)}\n`;
      message += `${order.total.toLocaleString()} so'm\n\n`;
    });
  }

  if (historyOrders.length > 0) {
    message += `📋 Tarix:\n`;
    historyOrders.forEach(order => {
      message += `#${order.id} - ✅ Yetkazilgan\n`;
      message += `${order.total.toLocaleString()} so'm\n\n`;
    });
  }

  const keyboard = [[Markup.button.callback('⬅️ Asosiy menyu', 'main_menu')]];

  await ctx.editMessageText(message, Markup.inlineKeyboard(keyboard));
});

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Tasdiqlanadi',
    confirmed: 'Tasdiqlandi',
    preparing: 'Tayyorlanmoqda',
    on_the_way: 'Yo\'lda',
    delivered: 'Yetkazildi',
    cancelled: 'Bekor qilindi',
  };
  return statusMap[status] || status;
}

// About
bot.action('about', async (ctx) => {
  await ctx.editMessageText(
    `ℹ️ ${RESTAURANT_NAME} haqida\n\n` +
    `Biz eng sifatli va mazali taomlarni tayyorlaymiz!\n\n` +
    `🕐 Ish vaqti: 9:00 - 23:00\n` +
    `📞 Telefon: +998 90 123 45 67\n` +
    `📍 Manzil: Toshkent sh, Amir Temur ko'chasi 1\n\n` +
    `Tez yetkazib berish: 30-40 daqiqa`,
    Markup.inlineKeyboard([[Markup.button.callback('⬅️ Asosiy menyu', 'main_menu')]])
  );
});

// Settings
bot.action('settings', async (ctx) => {
  const user = await db.getUser(ctx.from!.id);
  
  await ctx.editMessageText(
    `⚙️ Sozlamalar:\n\n` +
    `👤 Ism: ${user!.name}\n` +
    `📱 Telefon: ${user!.phone}\n\n` +
    `🔔 Bildirishnomalar: ${user!.notificationsEnabled ? '✅ Yoqilgan' : '❌ O\'chirilgan'}`,
    Markup.inlineKeyboard([
      [Markup.button.callback(
        user!.notificationsEnabled ? '🔕 Bildirishnomalarni o\'chirish' : '🔔 Bildirishnomalarni yoqish',
        'toggle_notifications'
      )],
      [Markup.button.callback('⬅️ Asosiy menyu', 'main_menu')],
    ])
  );
});

bot.action('toggle_notifications', async (ctx) => {
  const user = await db.getUser(ctx.from!.id);
  const newState = !user!.notificationsEnabled;
  await db.updateUserNotifications(ctx.from!.id, newState);
  await ctx.answerCbQuery(newState ? 'Bildirishnomalar yoqildi' : 'Bildirishnomalar o\'chirildi');
  await bot.handleUpdate({ callback_query: { ...ctx.callbackQuery, data: 'settings' } } as any);
});

// Main menu button
bot.action('main_menu', showMainMenu);

export async function startBot() {
  try {
    await db.initialize();
    await db.seedInitialData();
    console.log(`✅ Database initialized (${process.env.DB_TYPE || 'file'})`);
    
    console.log(`🔄 Launching Telegram bot...`);
    await bot.launch();
    console.log(`🤖 Bot started successfully: ${RESTAURANT_NAME}`);
    console.log(`📱 Send /start to your bot to begin!`);
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    console.error('Please check your BOT_TOKEN in secrets');
    throw error;
  }
}
