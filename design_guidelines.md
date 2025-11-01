# Telegram Restaurant Bot Design Guidelines

## Design Context & Approach

This is a **Telegram Bot application** using Telegram's native interface. Design focuses on message structure, button layouts, emoji usage, and conversational flow rather than custom visual styling.

**Reference Approach**: Draw inspiration from popular Telegram bots like @DurovRestaurant, @PizzaBot, and e-commerce bots for best practices in conversational commerce.

## Core Design Principles

1. **Emoji-Driven Visual Hierarchy** - Use emojis consistently for categorization and status indication
2. **Clear Information Architecture** - Structured messages with visual separators (━━━━)
3. **Progressive Disclosure** - Show information in digestible chunks
4. **Uzbek Language First** - All content in Uzbek with clear, friendly tone

## Typography & Text Formatting

### Message Headers
- Use emoji + bold text: `🏠 **Asosiy menyu:**`
- Section titles in uppercase for emphasis when needed

### Product Information
```
**Product Name** (Bold, larger visual weight)
💰 Price (Clear, prominent)
📝 Description (Normal weight)
```

### Status Messages
- Active states: 🟡 (Yellow), 🟢 (Green), 🚗 (In transit)
- Completed: ✅ (Checkmark)
- Cancelled: ❌ (X mark)

## Layout System (Telegram Keyboard Layouts)

### Inline Keyboard Patterns

**Main Menu (2x3 Grid)**:
```
[🍕 Menyu]  [🛒 Savatim (0)]
[📦 Buyurtmalarim]  [ℹ️ Biz haqimizda]
[⚙️ Sozlamalar]
```

**Category Selection (2x3 Grid)**:
```
[🍕 Pitsa]  [🍔 Burgerlar]
[🍜 Sho'rva]  [🥗 Salatlar]
[🍰 Desertlar]  [☕ Ichimliklar]
```

**Product Actions (Single Row)**:
```
[➖] [Quantity: 1] [➕]
```

**Size Selection (Horizontal)**:
```
[25cm] [30cm] [35cm]
```

**Navigation (Bottom)**:
```
[⬅️ Ortga]  [🛒 Savatga o'tish]
```

## Component Library

### Product Card Message
- Product image (sent as photo)
- Title with emoji category icon
- Price with 💰 emoji
- Description with 📝 emoji
- Size/customization options
- Quantity selector
- Add to cart CTA

### Cart Summary
```
🛒 Sizning savatingiz:

[Item listing with edit/delete]

━━━━━━━━━━━━━━━━━
💵 Jami: [subtotal]
🚚 Yetkazib berish: [delivery]
━━━━━━━━━━━━━━━━━
✅ UMUMIY: [total]
```

### Order Status Updates
- Use visual timeline: ✅ → ✅ → 🚚 → ⏱
- Include estimated time remaining
- Courier info when applicable
- Action buttons at bottom

### Location Input
- Geolocation button: `📌 Geolokatsiya yuborish`
- Text input option: `✍️ Manzilni yozish`
- Saved addresses: `📋 Avvalgi manzillarim`

## Emoji Icon System

**Categories**:
- 🍕 Pizza
- 🍔 Burgers  
- 🍜 Soups
- 🥗 Salads
- 🍰 Desserts
- ☕ Drinks

**Actions**:
- 🛒 Cart
- 📦 Orders
- ⚙️ Settings
- ℹ️ Information
- ➕/➖ Add/Remove
- ✅/❌ Confirm/Cancel
- ✏️ Edit
- 🗑 Delete

**Status**:
- 🟡 Pending
- 🟢 Active/Confirmed
- 🚚 In delivery
- ✅ Completed
- 🔔 Notifications

**Misc**:
- 💰 Price
- 📱 Phone
- 📍 Location
- 💳 Payment
- ⭐ Rating
- 🎁 Bonus

## Spacing & Visual Rhythm

### Message Separation
- Blank line between sections
- Use ━━━━━━ (15-20 chars) for major separators
- Group related information together

### Button Spacing
- Horizontal buttons: 2 per row for primary actions
- 3 per row for categories/options
- Full width for critical CTAs
- Always include back button when not in main menu

## Content Sections

### Welcome Message (Registration)
```
👋 Xush kelibsiz [Restoran Nomi]ga!

Bizda eng mazali taomlar va tez yetkazib berish!

📱 Ro'yxatdan o'tish uchun telefon raqamingizni yuboring:
```

### Product Display
- Always show product image first (as separate message/photo)
- Follow with detailed information
- Include all customization options
- Clear pricing for variants

### Order Confirmation
- Order number prominently at top
- Full item breakdown
- Address confirmation
- Payment method
- Estimated delivery time
- Status indicator

### Real-time Updates
- Clear state transition messages
- Include order number reference
- Show progress (old state → new state)
- Provide contextual actions (call courier, cancel)

## Interaction Patterns

### Progressive Order Flow
1. Category → Products → Customization → Cart
2. Cart → Address → Payment → Confirmation
3. Track → Updates → Delivery → Rating

### Error Handling
- Friendly Uzbek messages
- Clear next steps
- Always provide way back to main menu

### Confirmation Patterns
- Double confirmation for critical actions (cancel order, clear cart)
- Visual feedback with checkmarks
- Confirmation messages with order details

## Special Features

### Bonus/Loyalty Display
```
🎁 Sizning bonusingiz: 15,000 so'm

Har 100,000 so'm buyurtmaga 10% cashback!
```

### Promotion Banners
```
🔥 AKSIYA!

Har kuni 14:00-16:00 
Barcha pitsalarga -20%!
```

### Rating Request
```
⭐⭐⭐⭐⭐

[5] [4] [3] [2] [1]
```

## Database-Driven Content

All product images, names, prices, and descriptions stored in database (SQL/MongoDB/File based on DB_TYPE environment variable). Messages dynamically populated with this data while maintaining consistent formatting structure.