import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.number(),
  telegramId: z.number(),
  phone: z.string(),
  name: z.string(),
  notificationsEnabled: z.boolean().default(true),
  createdAt: z.date().or(z.string()),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  order: z.number(),
});

export const insertCategorySchema = categorySchema.omit({ id: true });
export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  categoryId: z.number(),
  name: z.string(),
  description: z.string(),
  basePrice: z.number(),
  image: z.string().optional(),
  available: z.boolean().default(true),
  sizes: z.array(z.object({
    size: z.string(),
    priceModifier: z.number(),
  })).optional(),
  extras: z.array(z.object({
    name: z.string(),
    price: z.number(),
  })).optional(),
});

export const insertProductSchema = productSchema.omit({ id: true });
export type Product = z.infer<typeof productSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Address schema
export const addressSchema = z.object({
  id: z.number(),
  userId: z.number(),
  address: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().default(false),
  label: z.string().optional(),
});

export const insertAddressSchema = addressSchema.omit({ id: true });
export type Address = z.infer<typeof addressSchema>;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

// Order schema
export const orderStatusEnum = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'on_the_way',
  'delivered',
  'cancelled'
]);

export const paymentMethodEnum = z.enum(['cash', 'payme', 'click', 'uzum']);

export const orderSchema = z.object({
  id: z.number(),
  userId: z.number(),
  status: orderStatusEnum,
  total: z.number(),
  address: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  paymentMethod: paymentMethodEnum,
  additionalInfo: z.string().optional(),
  courierName: z.string().optional(),
  courierPhone: z.string().optional(),
  estimatedTime: z.string().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const insertOrderSchema = orderSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type Order = z.infer<typeof orderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Order Item schema
export const orderItemSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  productId: z.number(),
  productName: z.string(),
  quantity: z.number(),
  size: z.string().optional(),
  extras: z.array(z.string()).optional(),
  price: z.number(),
});

export const insertOrderItemSchema = orderItemSchema.omit({ id: true });
export type OrderItem = z.infer<typeof orderItemSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Cart item (session-based, not persisted)
export interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  size?: string;
  extras?: string[];
  price: number;
}

// Bot session state
export interface BotSession {
  userId?: number;
  state?: string;
  cart?: CartItem[];
  tempProduct?: {
    productId: number;
    size?: string;
    quantity: number;
    extras: string[];
  };
  tempAddress?: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  tempPaymentMethod?: string;
  tempAdditionalInfo?: string;
  viewingOrderId?: number;
  editingCartIndex?: number;
}
