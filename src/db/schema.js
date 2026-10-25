import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
};

export const userRole = pgEnum("user_role", ["customer", "admin"]);
export const bookFormat = pgEnum("book_format", [
  "hardcover",
  "paperback",
  "ebook",
  "audiobook"
]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled"
]);

// Catalog

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  bio: text("bio"),
  ...timestamps
});

export const publishers = pgTable("publishers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  website: varchar("website", { length: 255 }),
  ...timestamps
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: integer("parent_id").references(() => categories.id, {
    onDelete: "set null"
  })
});

export const books = pgTable(
  "books",
  {
    id: serial("id").primaryKey(),
    isbn: varchar("isbn", { length: 13 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    subtitle: varchar("subtitle", { length: 255 }),
    description: text("description"),
    publisherId: integer("publisher_id").references(() => publishers.id, {
      onDelete: "set null"
    }),
    publishedDate: date("published_date"),
    pages: integer("pages"),
    language: varchar("language", { length: 10 }).notNull().default("en"),
    format: bookFormat("format").notNull().default("paperback"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    stock: integer("stock").notNull().default(0),
    coverImageUrl: varchar("cover_image_url", { length: 500 }),
    ...timestamps
  },
  (t) => [
    index("books_title_idx").on(t.title),
    index("books_publisher_idx").on(t.publisherId),
    check("books_price_check", sql`${t.price} >= 0`),
    check("books_stock_check", sql`${t.stock} >= 0`),
    check("books_pages_check", sql`${t.pages} > 0`)
  ]
);

export const bookAuthors = pgTable(
  "book_authors",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" })
  },
  (t) => [primaryKey({ columns: [t.bookId, t.authorId] })]
);

export const bookCategories = pgTable(
  "book_categories",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" })
  },
  (t) => [
    primaryKey({ columns: [t.bookId, t.categoryId] }),
    // The primary key leads with book_id, so lookups by category need their own index
    index("book_categories_category_idx").on(t.categoryId)
  ]
);

// Customers

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: userRole("role").notNull().default("customer"),
  ...timestamps
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false)
});

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    body: text("body"),
    ...timestamps
  },
  (t) => [
    unique("reviews_book_user_unique").on(t.bookId, t.userId),
    check("reviews_rating_check", sql`${t.rating} between 1 and 5`)
  ]
);

// Shopping

export const cartItems = pgTable(
  "cart_items",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId] }),
    check("cart_items_quantity_check", sql`${t.quantity} > 0`)
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    shippingAddressId: integer("shipping_address_id").references(
      () => addresses.id,
      { onDelete: "set null" }
    ),
    ...timestamps
  },
  (t) => [index("orders_user_idx").on(t.userId)]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    // Price at time of purchase, so later price changes don't rewrite history
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull()
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_check", sql`${t.quantity} > 0`)
  ]
);

// Relations (used by db.query.* for nested reads)

export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors)
}));

export const publishersRelations = relations(publishers, ({ many }) => ({
  books: many(books)
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent"
  }),
  children: many(categories, { relationName: "categoryParent" }),
  bookCategories: many(bookCategories)
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  publisher: one(publishers, {
    fields: [books.publisherId],
    references: [publishers.id]
  }),
  bookAuthors: many(bookAuthors),
  bookCategories: many(bookCategories),
  reviews: many(reviews)
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, { fields: [bookAuthors.bookId], references: [books.id] }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id]
  })
}));

export const bookCategoriesRelations = relations(bookCategories, ({ one }) => ({
  book: one(books, { fields: [bookCategories.bookId], references: [books.id] }),
  category: one(categories, {
    fields: [bookCategories.categoryId],
    references: [categories.id]
  })
}));

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  reviews: many(reviews),
  cartItems: many(cartItems),
  orders: many(orders)
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] })
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  book: one(books, { fields: [reviews.bookId], references: [books.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] })
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  book: one(books, { fields: [cartItems.bookId], references: [books.id] })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id]
  }),
  items: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  book: one(books, { fields: [orderItems.bookId], references: [books.id] })
}));
