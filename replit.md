# Telegram Restoran Bot

Bu loyiha - to'liq funksional Telegram restoran boti.

## Ishga tushirish

1. **Telegram Bot yarating**: @BotFather ga boring va yangi bot yarating
2. **Bot Token ni kiriting**: `.env` faylida `BOT_TOKEN` ni o'rnating
3. **"Start application" tugmasini bosing**

## Environment o'zgaruvchilari

Quyidagi o'zgaruvchilarni sozlash kerak:

- `RESTAURANT_NAME` - Restoran nomi
- `BOT_TOKEN` - Telegram bot token (@BotFather dan)
- `DB_TYPE` - Database turi (file, sql, yoki mongodb)
- `DB_FILE_PATH` - File database yo'li (file mode uchun)
- `DELIVERY_PRICE` - Yetkazib berish narxi

## Xususiyatlar

- ✅ Multi-database qo'llab-quvvatlash (SQLite, PostgreSQL, MongoDB)
- ✅ To'liq menyu tizimi
- ✅ Savat va buyurtma boshqaruvi
- ✅ Geolokatsiya qo'llab-quvvatlash
- ✅ To'lov tizimlari (Naqd, Payme, Click, Uzum Bank)
- ✅ Real-time buyurtma holati

## Database

Hozircha `DB_TYPE=file` ishlatiladi (SQLite). Bu eng sodda variantdir.

Kelajakda PostgreSQL yoki MongoDB'ga o'tish uchun mos adapter'larni yozish mumkin.
