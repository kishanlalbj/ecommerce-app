// OpenAPI 3.1 description of the API, served as Swagger UI at /docs.
// Keep in sync with the zod schemas in src/routes when endpoints change.

const id = { type: "integer", example: 1 };
const timestamp = { type: "string", format: "date-time" };
const nullable = (schema) => ({ ...schema, type: [schema.type, "null"] });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

const json = (schema) => ({ content: { "application/json": { schema } } });
const body = (schema) => ({ required: true, ...json(schema) });
const ok = (description, schema) => ({ description, ...json(schema) });
const err = (description) => ({ description, ...json(ref("Error")) });

const idParam = { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } };
const bearer = [{ bearerAuth: [] }];

const authResponse = {
  type: "object",
  properties: { user: ref("User"), token: { type: "string", description: "JWT, send as `Authorization: Bearer <token>`" } }
};
const userResponse = { type: "object", properties: { user: ref("User") } };

const bookInput = {
  type: "object",
  properties: {
    isbn: { type: "string", pattern: "^\\d{10}(\\d{3})?$", example: "9780141439518" },
    title: { type: "string", minLength: 1, maxLength: 255, example: "Pride and Prejudice" },
    subtitle: nullable({ type: "string", maxLength: 255 }),
    description: nullable({ type: "string" }),
    publisherId: nullable({ type: "integer", minimum: 1 }),
    publishedDate: nullable({ type: "string", format: "date", example: "1813-01-28" }),
    pages: nullable({ type: "integer", minimum: 1 }),
    language: { type: "string", maxLength: 10, default: "en" },
    format: { type: "string", enum: ["hardcover", "paperback", "ebook", "audiobook"], default: "paperback" },
    price: { type: ["number", "string"], minimum: 0, example: 9.99 },
    stock: { type: "integer", minimum: 0, default: 0 },
    coverImageUrl: nullable({ type: "string", format: "uri", maxLength: 500 })
  }
};

const addressInput = {
  type: "object",
  properties: {
    line1: { type: "string", minLength: 1, maxLength: 255, example: "221B Baker Street" },
    line2: nullable({ type: "string", maxLength: 255 }),
    city: { type: "string", minLength: 1, maxLength: 100, example: "London" },
    state: nullable({ type: "string", maxLength: 100 }),
    postalCode: { type: "string", minLength: 1, maxLength: 20, example: "NW1 6XE" },
    country: { type: "string", minLength: 2, maxLength: 2, description: "ISO 3166-1 alpha-2, uppercased by the server", example: "GB" },
    isDefault: { type: "boolean", description: "Setting true clears the default flag on your other addresses" }
  }
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Bookstore API",
    version: "1.0.0",
    description: [
      "REST API for the bookstore: catalog, accounts, addresses and orders.",
      "",
      "**Authenticating in this page:** call `POST /auth/login` (or `/auth/register`), copy the `token` from the response,",
      "click **Authorize** and paste it. Protected endpoints then send it as `Authorization: Bearer <token>`.",
      "",
      "**Roles:** public sign-up creates a `customer`. Admins are created with `npm run create-admin`.",
      "Customers place and cancel their own orders; admins manage the catalog and move orders through fulfilment.",
      "",
      "**Errors** always look like `{ \"error\": \"message\" }`. Validation failures (400) add `details`, keyed by field.",
      "Money values (`price`, `totalAmount`, `unitPrice`) are returned as decimal strings, e.g. `\"9.99\"`.",
      "",
      "The React client reaches these same routes under `/api` through the Vite dev proxy."
    ].join("\n")
  },
  servers: [{ url: "/", description: "This server" }],
  tags: [
    { name: "Health" },
    { name: "Auth", description: "Sign up, log in, and get a token" },
    { name: "Books", description: "Browse the catalog (public); change it (admin)" },
    { name: "Me", description: "The logged-in user's profile and addresses" },
    { name: "Orders", description: "Place, view, cancel and fulfil orders" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", example: "Validation failed" },
          details: {
            type: "object",
            description: "Only on validation errors: field name → list of messages",
            additionalProperties: { type: "array", items: { type: "string" } },
            example: { email: ["Invalid email address"] }
          }
        }
      },
      User: {
        type: "object",
        properties: {
          id,
          email: { type: "string", format: "email", example: "reader@example.com" },
          name: { type: "string", example: "Jane Reader" },
          role: { type: "string", enum: ["customer", "admin"] },
          createdAt: timestamp
        }
      },
      Book: {
        type: "object",
        properties: {
          id,
          isbn: { type: "string", example: "9780141439518" },
          title: { type: "string", example: "Pride and Prejudice" },
          subtitle: nullable({ type: "string" }),
          description: nullable({ type: "string" }),
          publisherId: nullable({ type: "integer" }),
          publishedDate: nullable({ type: "string", format: "date" }),
          pages: nullable({ type: "integer" }),
          language: { type: "string", example: "en" },
          format: { type: "string", enum: ["hardcover", "paperback", "ebook", "audiobook"] },
          price: { type: "string", example: "9.99" },
          stock: { type: "integer", example: 12 },
          coverImageUrl: nullable({ type: "string", format: "uri" }),
          createdAt: timestamp,
          updatedAt: timestamp
        }
      },
      BookListItem: {
        allOf: [
          ref("Book"),
          {
            type: "object",
            properties: {
              avgRating: nullable({ type: "number", example: 4.5 }),
              reviewCount: { type: "integer", example: 2 }
            }
          }
        ]
      },
      BookFacets: {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id,
                slug: { type: "string", example: "fantasy" },
                name: { type: "string", example: "Fantasy" },
                parentId: nullable({ type: "integer" }),
                count: { type: "integer", example: 3 }
              }
            }
          },
          publishers: {
            type: "array",
            items: {
              type: "object",
              properties: { id, name: { type: "string", example: "Penguin Classics" }, count: { type: "integer", example: 2 } }
            }
          },
          formats: { type: "array", items: { type: "string", enum: ["hardcover", "paperback", "ebook", "audiobook"] } },
          price: {
            type: "object",
            properties: { min: nullable({ type: "number", example: 8.99 }), max: nullable({ type: "number", example: 44.99 }) }
          }
        }
      },
      BookDetail: {
        allOf: [
          ref("Book"),
          {
            type: "object",
            properties: {
              publisher: nullable({
                type: "object",
                properties: { id, name: { type: "string" }, website: nullable({ type: "string" }) }
              }),
              bookAuthors: {
                type: "array",
                items: {
                  type: "object",
                  properties: { bookId: id, authorId: id, author: { type: "object", properties: { id, name: { type: "string" }, bio: nullable({ type: "string" }) } } }
                }
              },
              bookCategories: {
                type: "array",
                items: {
                  type: "object",
                  properties: { bookId: id, categoryId: id, category: { type: "object", properties: { id, name: { type: "string" }, slug: { type: "string" } } } }
                }
              },
              reviews: {
                type: "array",
                items: {
                  type: "object",
                  properties: { id, bookId: id, userId: id, rating: { type: "integer", minimum: 1, maximum: 5 }, title: nullable({ type: "string" }), body: nullable({ type: "string" }) }
                }
              }
            }
          }
        ]
      },
      Address: {
        allOf: [{ type: "object", properties: { id, userId: id } }, addressInput]
      },
      OrderStatus: { type: "string", enum: ["pending", "paid", "shipped", "delivered", "cancelled"] },
      OrderItem: {
        type: "object",
        properties: {
          id,
          orderId: id,
          bookId: id,
          quantity: { type: "integer", example: 2 },
          unitPrice: { type: "string", description: "Price when the order was placed", example: "9.99" }
        }
      },
      Order: {
        type: "object",
        properties: {
          id,
          userId: id,
          status: ref("OrderStatus"),
          totalAmount: { type: "string", example: "19.98" },
          shippingAddressId: nullable({ type: "integer" }),
          createdAt: timestamp,
          updatedAt: timestamp,
          items: { type: "array", items: ref("OrderItem") }
        }
      },
      OrderDetail: {
        allOf: [
          ref("Order"),
          {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  allOf: [
                    ref("OrderItem"),
                    { type: "object", properties: { book: { type: "object", properties: { id, title: { type: "string" }, isbn: { type: "string" }, coverImageUrl: { type: "string", nullable: true } } } } }
                  ]
                }
              },
              shippingAddress: { anyOf: [ref("Address"), { type: "null" }] }
            }
          }
        ]
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check the server and database are up",
        responses: { 200: ok("Healthy", { type: "object", properties: { status: { type: "string", example: "ok" } } }) }
      }
    },

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create a customer account",
        requestBody: body({
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email", example: "reader@example.com" },
            password: { type: "string", minLength: 8, maxLength: 72, example: "correct-horse" },
            name: { type: "string", minLength: 1, maxLength: 255, example: "Jane Reader" }
          }
        }),
        responses: {
          201: ok("Account created; you are logged in", authResponse),
          400: err("Validation failed"),
          409: err("Email already registered")
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and get a token",
        requestBody: body({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "reader@example.com" },
            password: { type: "string", example: "correct-horse" }
          }
        }),
        responses: {
          200: ok("Logged in", authResponse),
          400: err("Validation failed"),
          401: err("Invalid email or password")
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get the user the token belongs to",
        description: "Same as `GET /me`.",
        security: bearer,
        responses: { 200: ok("Current user", userResponse), 401: err("Missing, invalid or expired token") }
      }
    },

    "/books": {
      get: {
        tags: ["Books"],
        summary: "List books",
        description: [
          "`q` matches title or ISBN, case-insensitive. List filters take comma-separated values.",
          "Values within one filter are OR'ed; different filters are AND'ed.",
          "Each book includes `avgRating` (null when unreviewed) and `reviewCount`."
        ].join(" "),
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Search title or ISBN" },
          { name: "ids", in: "query", schema: { type: "string" }, description: "Only these book ids", example: "1,2,3" },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Category slugs; a parent also matches its subcategories",
            example: "fantasy,classics"
          },
          { name: "publisher", in: "query", schema: { type: "string" }, description: "Publisher ids", example: "1,2" },
          {
            name: "format",
            in: "query",
            schema: { type: "string" },
            description: "Any of hardcover, paperback, ebook, audiobook",
            example: "paperback,ebook"
          },
          {
            name: "minRating",
            in: "query",
            schema: { type: "number", minimum: 1, maximum: 5 },
            description: "Minimum average rating; unreviewed books are excluded"
          },
          { name: "minPrice", in: "query", schema: { type: "number", minimum: 0 } },
          { name: "maxPrice", in: "query", schema: { type: "number", minimum: 0 } },
          { name: "inStock", in: "query", schema: { type: "boolean" }, description: "Only books with stock > 0" },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["title", "price_asc", "price_desc", "rating", "newest"], default: "title" }
          },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } }
        ],
        responses: { 200: ok("Books", { type: "array", items: ref("BookListItem") }), 400: err("Invalid query") }
      },
      post: {
        tags: ["Books"],
        summary: "Add a book (admin)",
        security: bearer,
        requestBody: body({ ...bookInput, required: ["isbn", "title", "price"] }),
        responses: {
          201: ok("Created", ref("Book")),
          400: err("Validation failed"),
          401: err("Not logged in"),
          403: err("Not an admin"),
          409: err("ISBN already exists, or publisherId doesn't exist")
        }
      }
    },
    "/books/facets": {
      get: {
        tags: ["Books"],
        summary: "Filter options with book counts",
        description: "Counts cover the whole catalog, not the current filters. A parent category's count includes its subcategories.",
        responses: { 200: ok("Facets", ref("BookFacets")) }
      }
    },
    "/books/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Books"],
        summary: "Get a book with its publisher, authors, categories and reviews",
        responses: { 200: ok("Book", ref("BookDetail")), 404: err("Book not found") }
      },
      patch: {
        tags: ["Books"],
        summary: "Update a book (admin)",
        description: "Send only the fields to change; at least one is required.",
        security: bearer,
        requestBody: body({ ...bookInput, minProperties: 1, example: { price: 12.5, stock: 30 } }),
        responses: {
          200: ok("Updated", ref("Book")),
          400: err("Validation failed or nothing to update"),
          401: err("Not logged in"),
          403: err("Not an admin"),
          404: err("Book not found")
        }
      },
      delete: {
        tags: ["Books"],
        summary: "Delete a book (admin)",
        security: bearer,
        responses: {
          204: { description: "Deleted" },
          401: err("Not logged in"),
          403: err("Not an admin"),
          404: err("Book not found"),
          409: err("The book appears in an order, so it can't be deleted")
        }
      }
    },

    "/me": {
      get: {
        tags: ["Me"],
        summary: "Get my profile",
        security: bearer,
        responses: { 200: ok("Current user", userResponse), 401: err("Not logged in") }
      },
      patch: {
        tags: ["Me"],
        summary: "Update my name or email",
        security: bearer,
        requestBody: body({
          type: "object",
          minProperties: 1,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            email: { type: "string", format: "email" }
          },
          example: { name: "Jane R. Reader" }
        }),
        responses: {
          200: ok("Updated", userResponse),
          400: err("Validation failed or nothing to update"),
          401: err("Not logged in"),
          409: err("Email already in use")
        }
      }
    },
    "/me/password": {
      put: {
        tags: ["Me"],
        summary: "Change my password",
        description: "Existing tokens stay valid until they expire.",
        security: bearer,
        requestBody: body({
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string" },
            newPassword: { type: "string", minLength: 8, maxLength: 72 }
          }
        }),
        responses: {
          204: { description: "Password changed" },
          400: err("Validation failed or current password is incorrect"),
          401: err("Not logged in")
        }
      }
    },
    "/me/addresses": {
      get: {
        tags: ["Me"],
        summary: "List my addresses",
        security: bearer,
        responses: { 200: ok("Addresses", { type: "array", items: ref("Address") }), 401: err("Not logged in") }
      },
      post: {
        tags: ["Me"],
        summary: "Add an address",
        security: bearer,
        requestBody: body({ ...addressInput, required: ["line1", "city", "postalCode", "country"] }),
        responses: { 201: ok("Created", ref("Address")), 400: err("Validation failed"), 401: err("Not logged in") }
      }
    },
    "/me/addresses/{id}": {
      parameters: [idParam],
      patch: {
        tags: ["Me"],
        summary: "Update one of my addresses",
        description: "Send only the fields to change; at least one is required.",
        security: bearer,
        requestBody: body({ ...addressInput, minProperties: 1, example: { isDefault: true } }),
        responses: {
          200: ok("Updated", ref("Address")),
          400: err("Validation failed or nothing to update"),
          401: err("Not logged in"),
          404: err("Address not found (or not yours)")
        }
      },
      delete: {
        tags: ["Me"],
        summary: "Delete one of my addresses",
        description: "Orders that shipped to it keep their record but lose the address link.",
        security: bearer,
        responses: { 204: { description: "Deleted" }, 401: err("Not logged in"), 404: err("Address not found (or not yours)") }
      }
    },

    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List orders",
        description: "Customers get their own orders; admins get every order. Newest first.",
        security: bearer,
        responses: { 200: ok("Orders", { type: "array", items: ref("Order") }), 401: err("Not logged in") }
      },
      post: {
        tags: ["Orders"],
        summary: "Place an order (customer)",
        description: [
          "Prices are taken from the catalog, not the request. Stock is reserved immediately;",
          "duplicate lines for the same book are merged. The order starts as `pending`."
        ].join(" "),
        security: bearer,
        requestBody: body({
          type: "object",
          required: ["shippingAddressId", "items"],
          properties: {
            shippingAddressId: { type: "integer", minimum: 1, description: "One of your addresses" },
            items: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["bookId", "quantity"],
                properties: { bookId: { type: "integer", minimum: 1 }, quantity: { type: "integer", minimum: 1, maximum: 100 } }
              }
            }
          },
          example: { shippingAddressId: 1, items: [{ bookId: 1, quantity: 2 }] }
        }),
        responses: {
          201: ok("Order placed", ref("OrderDetail")),
          400: err("Validation failed, shipping address not found, or books not found"),
          401: err("Not logged in"),
          403: err("Admins can't place orders"),
          409: err("Not enough stock")
        }
      }
    },
    "/orders/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Orders"],
        summary: "Get an order with its items and shipping address",
        description: "Customers can only see their own orders.",
        security: bearer,
        responses: { 200: ok("Order", ref("OrderDetail")), 401: err("Not logged in"), 404: err("Order not found") }
      }
    },
    "/orders/{id}/cancel": {
      parameters: [idParam],
      post: {
        tags: ["Orders"],
        summary: "Cancel my pending order (customer)",
        description: "Puts the stock back.",
        security: bearer,
        responses: {
          200: ok("Cancelled", ref("OrderDetail")),
          401: err("Not logged in"),
          403: err("Only customers use this endpoint"),
          404: err("Order not found"),
          409: err("Only pending orders can be cancelled")
        }
      }
    },
    "/orders/{id}/status": {
      parameters: [idParam],
      patch: {
        tags: ["Orders"],
        summary: "Move an order through fulfilment (admin)",
        description: [
          "Allowed changes: `pending → paid | cancelled`, `paid → shipped | cancelled`, `shipped → delivered`.",
          "Cancelling puts the stock back."
        ].join(" "),
        security: bearer,
        requestBody: body({ type: "object", required: ["status"], properties: { status: ref("OrderStatus") }, example: { status: "paid" } }),
        responses: {
          200: ok("Updated", ref("OrderDetail")),
          400: err("Validation failed"),
          401: err("Not logged in"),
          403: err("Not an admin"),
          404: err("Order not found"),
          409: err("That status change isn't allowed")
        }
      }
    }
  }
};
