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
    cart: '/cart',
    login: '/login',
    signup: '/signup',
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

  hero: {
    title: 'Stories worth turning the page for.',
    description:
      'Discover new releases, timeless classics and hidden gems, hand-picked by readers who love books as much as you do.',
    image: {
      src: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80&auto=format&fit=crop',
      alt: 'A dimly lit bookshop aisle lined with shelves of books under hanging bulbs',
      // Optional: credit: { text: 'Photo: Name / Unsplash', url: 'https://unsplash.com/@…' }
    },
    actions: [
      { label: 'Shop bestsellers', href: '/bestsellers', variant: 'default' },
      { label: 'New arrivals', href: '/new', variant: 'outline' },
    ],
  },

  newsletter: {
    placeholder: 'Your email',
    label: 'Email for newsletter',
    button: 'Subscribe',
  },

  footer: {
    groups: [
      {
        title: 'Shop',
        links: [
          { label: 'New Arrivals', href: '/new' },
          { label: 'Bestsellers', href: '/bestsellers' },
          { label: 'Gift Cards', href: '/gift-cards' },
        ],
      },
      {
        title: 'Help',
        links: [
          { label: 'Shipping', href: '/shipping' },
          { label: 'Returns', href: '/returns' },
          { label: 'Contact Us', href: '/contact' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Careers', href: '/careers' },
          { label: 'Privacy', href: '/privacy' },
        ],
      },
    ],
    rights: 'All rights reserved.',
  },
}
