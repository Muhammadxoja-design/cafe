import type { 
  User, InsertUser, 
  Category, InsertCategory,
  Product, InsertProduct,
  Address, InsertAddress,
  Order, InsertOrder,
  OrderItem, InsertOrderItem
} from "@shared/bot-schema";

export interface DatabaseAdapter {
  // User methods
  getUser(telegramId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserNotifications(telegramId: number, enabled: boolean): Promise<void>;
  updateUserName(telegramId: number, name: string): Promise<void>;
  updateUserPhone(telegramId: number, phone: string): Promise<void>;

  // Category methods
  getAllCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;

  // Product methods
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;

  // Address methods
  getUserAddresses(userId: number): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  deleteAddress(id: number): Promise<void>;
  setDefaultAddress(userId: number, addressId: number): Promise<void>;

  // Order methods
  createOrder(order: InsertOrder): Promise<Order>;
  getOrderById(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  updateOrderStatus(orderId: number, status: Order['status']): Promise<void>;
  updateOrderCourier(orderId: number, courierName: string, courierPhone: string): Promise<void>;
  cancelOrder(orderId: number): Promise<void>;

  // Order Item methods
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;

  // Initialization
  initialize(): Promise<void>;
  seedInitialData(): Promise<void>;
}
