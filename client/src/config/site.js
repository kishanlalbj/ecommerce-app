// All brand copy, links and assets live here so components stay content-free
export const siteConfig = {
  name: 'Paperleaf Books',
  tagline: 'Stories worth turning the page for.',
  description:
    'An independent online bookstore for new releases, timeless classics and hidden gems.',

  routes: {
    home: '/',
    search: '/search',
    account: '/account',
    orders: '/orders',
    order: (id) => `/orders/${id}`,
    cart: '/cart',
    checkout: '/checkout',
    login: '/login',
    signup: '/signup',
    book: (id) => `/books/${id}`,
  },

  header: {
    searchPlaceholder: 'Search books, authors, ISBN…',
    searchLabel: 'Search books',
    accountLabel: 'Account',
    cartLabel: 'Cart',
    login: 'Log in',
    accountMenu: {
      account: 'My account',
      orders: 'My orders',
      logout: 'Log out',
      adminBadge: 'Admin',
    },
  },

  auth: {
    fields: {
      name: { label: 'Full name', placeholder: 'Jane Reader' },
      email: { label: 'Email', placeholder: 'you@example.com' },
      password: { label: 'Password', placeholder: '••••••••' },
      confirmPassword: { label: 'Confirm password', placeholder: '••••••••' },
    },
    passwordHint: 'At least 8 characters.',
    errors: {
      required: 'This field is required',
      email: 'Enter a valid email address',
      passwordLength: 'Password must be 8–72 characters',
      passwordMismatch: 'Passwords do not match',
      emailTaken: 'An account with this email already exists',
      generic: 'Something went wrong. Please try again.',
      network: 'Can’t reach the server. Check your connection and try again.',
    },
    login: {
      title: 'Welcome back',
      description: 'Log in to track orders and check out faster.',
      submit: 'Log in',
      submitting: 'Logging in…',
      switchPrompt: 'New here?',
      switchLink: 'Create an account',
    },
    signup: {
      title: 'Create your account',
      description: 'Join to save addresses, place orders and track deliveries.',
      submit: 'Create account',
      submitting: 'Creating account…',
      switchPrompt: 'Already have an account?',
      switchLink: 'Log in',
    },
  },

  money: { locale: 'en-US', currency: 'USD' },

  loading: 'Loading…',

  bookCard: {
    addToCart: 'Add to cart',
    outOfStock: 'Out of stock',
    lowStock: (n) => `Only ${n} left`,
    noReviews: 'No reviews yet',
    rating: (avg, count) =>
      `Rated ${avg.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'review' : 'reviews'}`,
  },

  filters: {
    title: 'Filters',
    reset: 'Clear all',
    sections: {
      categories: 'Category',
      publishers: 'Publisher',
      rating: 'Customer rating',
      formats: 'Format',
      price: 'Price',
      availability: 'Availability',
    },
    inStock: 'In stock only',
    anyRating: 'Any rating',
    ratingAtLeast: (n) => `${n} & up`,
    ratingAtLeastLabel: (n) => `${n} stars and up`,
    // Minimum average ratings offered; must be 1–5 to match the API
    ratings: [4, 3, 2],
    showAll: (n) => `Show all ${n}`,
    showLess: 'Show less',
    // Matches the book_format enum on the server
    formats: [
      { value: 'hardcover', label: 'Hardcover' },
      { value: 'paperback', label: 'Paperback' },
      { value: 'ebook', label: 'eBook' },
      { value: 'audiobook', label: 'Audiobook' },
    ],
  },

  browse: {
    resultCount: (n) => `${n} ${n === 1 ? 'book' : 'books'}`,
    sortLabel: 'Sort by',
    // Values match the API's `sort` parameter
    sortOptions: [
      { value: 'title', label: 'Title, A–Z' },
      { value: 'rating', label: 'Top rated' },
      { value: 'price_asc', label: 'Price, low to high' },
      { value: 'price_desc', label: 'Price, high to low' },
      { value: 'newest', label: 'Newest' },
    ],
    filtersButton: 'Filters',
    showResults: 'Show results',
    empty: {
      title: 'No books match these filters',
      description: 'Try removing a filter or widening the price range.',
      action: 'Clear all filters',
    },
    error: {
      title: 'We couldn’t load the books',
      action: 'Try again',
    },
  },

  bookDetail: {
    home: 'Books',
    by: 'by',
    quantityLabel: 'Quantity',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    addToCart: 'Add to cart',
    inStock: 'In stock',
    inCart: (n) => `${n} already in your cart`,
    descriptionTitle: 'About this book',
    detailsTitle: 'Details',
    details: {
      format: 'Format',
      pages: 'Pages',
      publisher: 'Publisher',
      publishedDate: 'Published',
      language: 'Language',
      isbn: 'ISBN',
    },
    reviews: {
      title: 'Customer reviews',
      empty: 'No reviews yet.',
      summary: (avg, count) =>
        `${avg.toFixed(1)} out of 5 · ${count} ${count === 1 ? 'review' : 'reviews'}`,
      stars: (n) => `${n} out of 5 stars`,
    },
    error: 'We couldn’t load this book.',
    retry: 'Try again',
    notFound: {
      code: '404',
      title: 'We couldn’t find that book',
      description: 'It may have been removed from the catalog, or the link might be wrong.',
      actions: [{ label: 'Browse books', href: '/', variant: 'default' }],
    },
  },

  addedToCart: {
    title: 'Added to cart',
    viewCart: 'View cart',
  },

  cart: {
    title: 'Your cart',
    empty: {
      title: 'Your cart is empty',
      description: 'Browse the shelves and add a book or two.',
      action: { label: 'Browse books', href: '/' },
    },
    quantityLabel: 'Quantity',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
    remove: 'Remove',
    problems: {
      unavailable: 'This book is no longer available.',
      soldOut: 'Out of stock. Remove it to check out.',
      lowStock: (n) => `Only ${n} left. Lower the quantity to check out.`,
    },
    unavailableTitle: 'Unavailable book',
    loadError: 'We couldn’t load the latest prices.',
    retry: 'Try again',
    fixProblems: 'Update or remove the highlighted items to check out.',
    subtotal: 'Subtotal',
    note: 'Shipping and final prices are confirmed at checkout.',
    checkout: 'Checkout',
    guestHint: 'You’ll log in or create an account at checkout.',
    continueShopping: 'Continue shopping',
  },

  // Shared by checkout and the account page
  address: {
    fields: {
      line1: { label: 'Address line 1', placeholder: '221B Baker Street' },
      line2: { label: 'Address line 2 (optional)', placeholder: 'Apartment, suite, floor' },
      city: { label: 'City', placeholder: 'London' },
      state: { label: 'State / region (optional)', placeholder: '' },
      postalCode: { label: 'Postal code', placeholder: 'NW1 6XE' },
      country: { label: 'Country code', placeholder: 'GB', hint: 'Two letters, e.g. US, GB, IN.' },
    },
    defaultBadge: 'Default',
    makeDefault: 'Save as my default address',
    add: 'Add a new address',
    save: 'Save address',
    saving: 'Saving…',
    cancel: 'Cancel',
  },

  account: {
    nav: {
      label: 'Account',
      links: [
        { label: 'Account details', href: '/account', icon: 'user' },
        { label: 'My orders', href: '/orders', icon: 'orders' },
      ],
    },
    title: 'My account',
    description: 'Manage your details, password and saved addresses.',
    memberSince: (date) => `Member since ${date}`,
    profile: {
      title: 'Profile',
      description: 'Your name and the email you log in with.',
      save: 'Save changes',
      saving: 'Saving…',
      saved: 'Profile updated',
      unchanged: 'Nothing to save yet. Change a field first.',
    },
    password: {
      title: 'Password',
      description: 'Use at least 8 characters. You’ll stay logged in on this device.',
      fields: {
        currentPassword: { label: 'Current password', placeholder: '••••••••' },
        newPassword: { label: 'New password', placeholder: '••••••••' },
        confirmPassword: { label: 'Confirm new password', placeholder: '••••••••' },
      },
      save: 'Change password',
      saving: 'Changing…',
      saved: 'Password changed',
      incorrect: 'Current password is incorrect',
    },
    addresses: {
      title: 'Saved addresses',
      description: 'Choose one at checkout. Your default is picked automatically.',
      empty: 'You haven’t saved any addresses yet.',
      loadError: 'We couldn’t load your addresses.',
      retry: 'Try again',
      makeDefault: 'Make default',
      remove: 'Delete',
      added: 'Address saved',
      removed: 'Address deleted',
      defaultChanged: 'Default address updated',
      confirmRemove: {
        title: 'Delete this address?',
        description: 'Past orders keep their details, but you won’t be able to pick it at checkout.',
        confirm: 'Delete',
        cancel: 'Keep it',
      },
    },
  },

  orders: {
    title: 'My orders',
    adminTitle: 'All orders',
    description: 'Track what you’ve ordered and cancel orders that haven’t been paid yet.',
    adminDescription: 'Every order placed in the store, newest first.',
    itemCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    moreItems: (n) => `+${n}`,
    view: 'View order',
    loadError: 'We couldn’t load your orders.',
    retry: 'Try again',
    empty: {
      title: 'No orders yet',
      description: 'When you buy something, it will show up here.',
      action: { label: 'Browse books', href: '/' },
    },
    cancel: {
      action: 'Cancel order',
      title: (id) => `Cancel order #${id}?`,
      description: 'The books go back on the shelf. This can’t be undone.',
      confirm: 'Cancel order',
      keep: 'Keep order',
      cancelling: 'Cancelling…',
      done: (id) => `Order #${id} cancelled`,
    },
  },

  checkout: {
    title: 'Checkout',
    backToCart: 'Back to cart',
    addressTitle: 'Shipping address',
    addressDescription: 'Where should we send your books?',
    loadingAddresses: 'Loading your addresses…',
    itemsTitle: 'Review your items',
    itemsDescription: (count) => `${count} ${count === 1 ? 'book' : 'books'} in this order`,
    editCart: 'Edit cart',
    summaryTitle: 'Order summary',
    itemsLine: (count) => `Items (${count})`,
    total: 'Total',
    placeOrder: 'Place order',
    placing: 'Placing order…',
    priceNote: 'Prices and stock are checked again when you place the order.',
    chooseAddress: 'Choose or add a shipping address first.',
    adminBlocked: 'Admin accounts manage the store and can’t place orders. Log in as a customer to buy.',
  },

  order: {
    placedTitle: 'Thanks, your order is placed',
    placedDescription: 'We’re getting it ready. Here’s what you ordered.',
    title: (id) => `Order #${id}`,
    placedOn: (date) => `Placed on ${date}`,
    status: {
      pending: 'Pending',
      paid: 'Paid',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    },
    itemsTitle: 'Items',
    backToOrders: 'All orders',
    shippingTitle: 'Shipping to',
    addressRemoved: 'This address has since been deleted.',
    total: 'Total',
    keepShopping: 'Keep shopping',
    loadError: 'We couldn’t load this order.',
    retry: 'Try again',
    notFound: {
      title: 'Order not found',
      description: 'This order doesn’t exist, or it belongs to a different account.',
    },
  },

  hero: {
    title: 'Stories worth turning the page for.',
    description:
      'Discover new releases, timeless classics and hidden gems, hand-picked by readers who love books as much as you do.',
    image: {
      src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80&auto=format&fit=crop',
      alt: 'A dimly lit bookshop aisle lined with shelves of books under hanging bulbs',
      // Optional: credit: { text: 'Photo: Name / Unsplash', url: 'https://unsplash.com/@…' }
    },
  },

  notFound: {
    code: '404',
    title: 'This page has gone missing',
    description:
      'We couldn’t find the page you were looking for. It may have been moved, or the link might be wrong.',
    actions: [
      { label: 'Back to home', href: '/', variant: 'default' },
    ],
  },

  footer: {
    rights: 'All rights reserved.',
  },
}
