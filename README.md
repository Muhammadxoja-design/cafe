# 🤖 Telegram Restoran Bot

Mukammal Telegram restoran boti - JavaScript va Telegraf bilan yaratilgan.

## ✨ Xususiyatlar

- ✅ Ro'yxatdan o'tish (telefon raqam orqali)
- ✅ To'liq menyu tizimi (6 ta kategoriya)
- ✅ Savat va buyurtma boshqaruvi
- ✅ Geolokatsiya va manzil saqlash
- ✅ To'lov usullari (Naqd, Payme, Click, Uzum Bank)
- ✅ Real-time buyurtma holati kuzatuvi
- ✅ Buyurtmalar tarixi
- ✅ Multi-database qo'llab-quvvatlash (File, PostgreSQL, MongoDB)

## 🚀 Ishga tushirish

### 1. Telegram Bot yarating

1. Telegram'da [@BotFather](https://t.me/BotFather) ga o'ting
2. `/newbot` komandas ini yuboring
3. Bot nomini kiriting (masalan: "Mening Restoran Bot")
4. Bot username kiriting (masalan: "mening_restoran_bot")
5. BotFather sizga **Bot Token** beradi - uni saqlang!

### 2. Environment o'zgaruvchilarini sozlang

`.env.example` faylini `.env` ga nusxalang va quyidagi qiymatlarni kiriting:

```env
# Restoran sozlamalari
RESTAURANT_NAME=Mening Restoranim

# Telegram Bot Token (@BotFather dan olingan)
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Database turi: file, sql, yoki mongodb
DB_TYPE=file

# File database yo'li (DB_TYPE=file bo'lsa)
DB_FILE_PATH=./data/restaurant.db

# Yetkazib berish narxi (so'm)
DELIVERY_PRICE=10000
```

### 3. Botni ishga tushiring

Replit'da "Start application" tugmasini bosing yoki:

```bash
npm run dev
```

### 4. Botni sinab ko'ring

Telegram'da yaratgan botingizni toping va `/start` komandasi bilan boshlang!

## 📊 Database turlari

Bot 3 xil database bilan ishlaydi:

### File Database (SQLite) - **Tavsiya etiladi**
```env
DB_TYPE=file
DB_FILE_PATH=./data/restaurant.db
```

### PostgreSQL
```env
DB_TYPE=sql
DATABASE_URL=postgresql://user:password@localhost:5432/restaurant_bot
```

### MongoDB
```env
DB_TYPE=mongodb
MONGODB_URL=mongodb://localhost:27017/restaurant_bot
```

## 📱 Bot funksiyalari

### Asosiy menyu
- 🍕 Menyu - mahsulotlarni ko'rish
- 🛒 Savatim - savat boshqaruvi
- 📦 Buyurtmalarim - buyurtmalar tarixi
- ℹ️ Biz haqimizda - restoran haqida
- ⚙️ Sozlamalar - profil sozlamalari

### Buyurtma berish oqimi

1. **Kategoriya tanlash** - 6 ta kategoriya (Pitsa, Burger, Sho'rva, Salat, Desert, Ichimlik)
2. **Mahsulot tanlash** - rasm, narx, tarkib ko'rish
3. **Sozlash** - o'lcham, miqdor, qo'shimchalar tanlash
4. **Savatga qo'shish** - bir necha mahsulot qo'shish
5. **Manzil kiritish** - geolokatsiya yoki matn
6. **To'lov usuli** - Naqd, Payme, Click, Uzum Bank
7. **Tasdiqlash** - buyurtma raqami va holat

### Buyurtma holatlari

- 🟡 **Tasdiqlanadi** - yangi buyurtma
- ✅ **Tasdiqlandi** - qabul qilindi
- 🟡 **Tayyorlanmoqda** - pishirilmoqda
- 🚚 **Yo'lda** - yetkazilmoqda
- ✅ **Yetkazildi** - tugallandi
- ❌ **Bekor qilindi** - bekor qilindi

## 🛠 Texnik ma'lumotlar

### Stack
- **Backend**: Node.js, Express.js
- **Bot Framework**: Telegraf
- **Database**: SQLite (better-sqlite3), PostgreSQL (pg), MongoDB (mongodb)
- **Language**: TypeScript

### Arxitektura

```
server/
├── bot/
│   └── index.ts          # Telegram bot logic
├── database/
│   ├── base-adapter.ts   # Database interface
│   ├── file-adapter.ts   # SQLite implementation
│   └── index.ts          # Database factory
shared/
└── bot-schema.ts         # Type definitions
```

### Database Schema

- **users** - foydalanuvchilar
- **categories** - mahsulot kategoriyalari
- **products** - mahsulotlar
- **addresses** - saqlangan manzillar
- **orders** - buyurtmalar
- **order_items** - buyurtma mahsulotlari

## 🔧 Rivojlantirish

### Mahsulot qo'shish

Database yaratilganda avtomatik ravishda demo mahsulotlar qo'shiladi. O'z mahsulotlaringizni qo'shish uchun `server/database/file-adapter.ts` faylida `seedInitialData()` funksiyasini tahrirlang.

### To'lov integratsiyalari

Hozircha to'lov usullari mock (demo) formatida. Haqiqiy integratsiyalar uchun:
- **Payme**: [https://developer.help.paycom.uz](https://developer.help.paycom.uz)
- **Click**: [https://docs.click.uz](https://docs.click.uz)
- **Uzum Bank**: [https://uzumbank.uz/open-api](https://uzumbank.uz/open-api)

## 📝 Litsenziya

MIT

## 🤝 Yordam

Savollar bo'lsa, [GitHub Issues](https://github.com) orqali murojaat qiling.

---

**Yaxshi sotuvlar va baxtli mijozlar! 🍕🍔☕**
