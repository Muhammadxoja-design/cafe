import Database from 'better-sqlite3';
import type { DatabaseAdapter } from './base-adapter';
import type { 
  User, InsertUser, 
  Category, InsertCategory,
  Product, InsertProduct,
  Address, InsertAddress,
  Order, InsertOrder,
  OrderItem, InsertOrderItem
} from "@shared/bot-schema";
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export class FileAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        name TEXT NOT NULL,
        notifications_enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        "order" INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        base_price INTEGER NOT NULL,
        image TEXT,
        available INTEGER DEFAULT 1,
        sizes TEXT,
        extras TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        is_default INTEGER DEFAULT 0,
        label TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        total INTEGER NOT NULL,
        address TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        payment_method TEXT NOT NULL,
        additional_info TEXT,
        courier_name TEXT,
        courier_phone TEXT,
        estimated_time TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        size TEXT,
        extras TEXT,
        price INTEGER NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);
  }

  async getUser(telegramId: number): Promise<User | undefined> {
    const row = this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      telegramId: row.telegram_id,
      phone: row.phone,
      name: row.name,
      notificationsEnabled: Boolean(row.notifications_enabled),
      createdAt: row.created_at,
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = this.db.prepare(
      'INSERT INTO users (telegram_id, phone, name, notifications_enabled) VALUES (?, ?, ?, ?)'
    ).run(user.telegramId, user.phone, user.name, user.notificationsEnabled ? 1 : 0);
    return this.getUser(user.telegramId) as Promise<User>;
  }

  async updateUserNotifications(telegramId: number, enabled: boolean): Promise<void> {
    this.db.prepare('UPDATE users SET notifications_enabled = ? WHERE telegram_id = ?')
      .run(enabled ? 1 : 0, telegramId);
  }

  async updateUserName(telegramId: number, name: string): Promise<void> {
    this.db.prepare('UPDATE users SET name = ? WHERE telegram_id = ?').run(name, telegramId);
  }

  async updateUserPhone(telegramId: number, phone: string): Promise<void> {
    this.db.prepare('UPDATE users SET phone = ? WHERE telegram_id = ?').run(phone, telegramId);
  }

  async getAllCategories(): Promise<Category[]> {
    const rows = this.db.prepare('SELECT * FROM categories ORDER BY "order"').all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon,
      order: row.order,
    }));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      order: row.order,
    };
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    const rows = this.db.prepare('SELECT * FROM products WHERE category_id = ? AND available = 1').all(categoryId) as any[];
    return rows.map(row => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      basePrice: row.base_price,
      image: row.image,
      available: Boolean(row.available),
      sizes: row.sizes ? JSON.parse(row.sizes) : undefined,
      extras: row.extras ? JSON.parse(row.extras) : undefined,
    }));
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      basePrice: row.base_price,
      image: row.image,
      available: Boolean(row.available),
      sizes: row.sizes ? JSON.parse(row.sizes) : undefined,
      extras: row.extras ? JSON.parse(row.extras) : undefined,
    };
  }

  async getAllProducts(): Promise<Product[]> {
    const rows = this.db.prepare('SELECT * FROM products WHERE available = 1').all() as any[];
    return rows.map(row => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      basePrice: row.base_price,
      image: row.image,
      available: Boolean(row.available),
      sizes: row.sizes ? JSON.parse(row.sizes) : undefined,
      extras: row.extras ? JSON.parse(row.extras) : undefined,
    }));
  }

  async getUserAddresses(userId: number): Promise<Address[]> {
    const rows = this.db.prepare('SELECT * FROM addresses WHERE user_id = ?').all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      isDefault: Boolean(row.is_default),
      label: row.label,
    }));
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const result = this.db.prepare(
      'INSERT INTO addresses (user_id, address, latitude, longitude, is_default, label) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(address.userId, address.address, address.latitude, address.longitude, address.isDefault ? 1 : 0, address.label);
    const row = this.db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid) as any;
    return {
      id: row.id,
      userId: row.user_id,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      isDefault: Boolean(row.is_default),
      label: row.label,
    };
  }

  async deleteAddress(id: number): Promise<void> {
    this.db.prepare('DELETE FROM addresses WHERE id = ?').run(id);
  }

  async setDefaultAddress(userId: number, addressId: number): Promise<void> {
    this.db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
    this.db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(addressId);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = this.db.prepare(
      `INSERT INTO orders (user_id, status, total, address, latitude, longitude, payment_method, additional_info, estimated_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      order.userId, order.status, order.total, order.address, order.latitude, order.longitude,
      order.paymentMethod, order.additionalInfo, order.estimatedTime
    );
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid) as any;
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      total: row.total,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      paymentMethod: row.payment_method,
      additionalInfo: row.additional_info,
      courierName: row.courier_name,
      courierPhone: row.courier_phone,
      estimatedTime: row.estimated_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      total: row.total,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      paymentMethod: row.payment_method,
      additionalInfo: row.additional_info,
      courierName: row.courier_name,
      courierPhone: row.courier_phone,
      estimatedTime: row.estimated_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    const rows = this.db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      status: row.status,
      total: row.total,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      paymentMethod: row.payment_method,
      additionalInfo: row.additional_info,
      courierName: row.courier_name,
      courierPhone: row.courier_phone,
      estimatedTime: row.estimated_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateOrderStatus(orderId: number, status: Order['status']): Promise<void> {
    this.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, orderId);
  }

  async updateOrderCourier(orderId: number, courierName: string, courierPhone: string): Promise<void> {
    this.db.prepare('UPDATE orders SET courier_name = ?, courier_phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(courierName, courierPhone, orderId);
  }

  async cancelOrder(orderId: number): Promise<void> {
    this.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('cancelled', orderId);
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const result = this.db.prepare(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, size, extras, price) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      item.orderId, item.productId, item.productName, item.quantity, item.size,
      item.extras ? JSON.stringify(item.extras) : null, item.price
    );
    const row = this.db.prepare('SELECT * FROM order_items WHERE id = ?').get(result.lastInsertRowid) as any;
    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity,
      size: row.size,
      extras: row.extras ? JSON.parse(row.extras) : undefined,
      price: row.price,
    };
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    const rows = this.db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];
    return rows.map(row => ({
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity,
      size: row.size,
      extras: row.extras ? JSON.parse(row.extras) : undefined,
      price: row.price,
    }));
  }

  async seedInitialData(): Promise<void> {
    const categoryCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    if (categoryCount.count > 0) return;

    const categories = [
      { name: 'Pitsa', icon: '🍕', order: 1 },
      { name: 'Burgerlar', icon: '🍔', order: 2 },
      { name: "Sho'rva", icon: '🍜', order: 3 },
      { name: 'Salatlar', icon: '🥗', order: 4 },
      { name: 'Desertlar', icon: '🍰', order: 5 },
      { name: 'Ichimliklar', icon: '☕', order: 6 },
    ];

    for (const cat of categories) {
      this.db.prepare('INSERT INTO categories (name, icon, "order") VALUES (?, ?, ?)').run(cat.name, cat.icon, cat.order);
    }

    const products = [
      {
        category_id: 1, name: 'Margarita', description: 'Pomidor sousi, mozzarella pishloq, rayhon',
        base_price: 35000, sizes: JSON.stringify([
          { size: '25cm', priceModifier: 0 },
          { size: '30cm', priceModifier: 10000 },
          { size: '35cm', priceModifier: 20000 }
        ]),
        extras: JSON.stringify([
          { name: "Qo'shimcha pishloq", price: 5000 },
          { name: 'Achchiq sous', price: 2000 }
        ])
      },
      {
        category_id: 1, name: 'Pepperoni', description: 'Kolbasa, pomidor sousi, mozzarella',
        base_price: 45000, sizes: JSON.stringify([
          { size: '25cm', priceModifier: 0 },
          { size: '30cm', priceModifier: 10000 },
          { size: '35cm', priceModifier: 20000 }
        ]),
        extras: JSON.stringify([
          { name: "Qo'shimcha kolbasa", price: 7000 },
          { name: 'Achchiq sous', price: 2000 }
        ])
      },
      {
        category_id: 2, name: 'Klassik burger', description: "Go'sht kotleti, pomidor, salat, sous",
        base_price: 25000, sizes: null,
        extras: JSON.stringify([
          { name: 'Qo\'shimcha kotlet', price: 8000 },
          { name: 'Pishloq', price: 3000 }
        ])
      },
      {
        category_id: 3, name: "Lag'mon", description: "Uy qo'l lag'moni, go'sht, sabzavotlar",
        base_price: 30000, sizes: null, extras: null
      },
      {
        category_id: 4, name: 'Sezar salati', description: 'Tovuq, salat, sezar sousi, kruton',
        base_price: 20000, sizes: null, extras: null
      },
      {
        category_id: 5, name: 'Tiramisu', description: 'Italyan deserti, kofeli',
        base_price: 18000, sizes: null, extras: null
      },
      {
        category_id: 6, name: 'Kofe Latte', description: 'Espresso va sut',
        base_price: 12000, sizes: null, extras: null
      },
    ];

    for (const prod of products) {
      this.db.prepare(
        'INSERT INTO products (category_id, name, description, base_price, sizes, extras) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(prod.category_id, prod.name, prod.description, prod.base_price, prod.sizes, prod.extras);
    }
  }
}
