// Real editions. Prices and stock are store values, not publisher list prices.
// Parents must come before their children.
export const CATEGORIES = [
  { slug: "fiction", name: "Fiction" },
  { slug: "classics", name: "Classics", parent: "fiction" },
  { slug: "science-fiction", name: "Science Fiction", parent: "fiction" },
  { slug: "fantasy", name: "Fantasy", parent: "fiction" },
  { slug: "mystery-thriller", name: "Mystery & Thriller", parent: "fiction" },
  { slug: "non-fiction", name: "Non-fiction" },
  { slug: "self-help", name: "Self-help", parent: "non-fiction" },
  { slug: "psychology", name: "Psychology", parent: "non-fiction" },
  { slug: "history", name: "History", parent: "non-fiction" },
  { slug: "memoir", name: "Memoir", parent: "non-fiction" },
  { slug: "programming", name: "Programming", parent: "non-fiction" }
];

export const BOOKS = [
  {
    isbn: "9780061120084",
    title: "To Kill a Mockingbird",
    description:
      "In a small Alabama town during the Depression, lawyer Atticus Finch defends a Black man falsely accused of rape, seen through the eyes of his young daughter Scout.",
    authors: ["Harper Lee"],
    publisher: "Harper Perennial Modern Classics",
    publishedDate: "2006-05-23",
    pages: 336,
    format: "paperback",
    price: "14.99",
    stock: 42,
    categories: ["fiction", "classics"]
  },
  {
    isbn: "9780451524935",
    title: "1984",
    description:
      "Winston Smith works at the Ministry of Truth rewriting history for the Party, and begins a dangerous private rebellion against Big Brother.",
    authors: ["George Orwell"],
    publisher: "Signet Classics",
    publishedDate: null,
    pages: 328,
    format: "paperback",
    price: "9.99",
    stock: 60,
    categories: ["fiction", "classics", "science-fiction"]
  },
  {
    isbn: "9780743273565",
    title: "The Great Gatsby",
    description:
      "Nick Carraway recounts a summer on Long Island with his mysterious neighbour Jay Gatsby and Gatsby's obsession with Daisy Buchanan.",
    authors: ["F. Scott Fitzgerald"],
    publisher: "Scribner",
    publishedDate: "2004-09-30",
    pages: 180,
    format: "paperback",
    price: "11.99",
    stock: 35,
    categories: ["fiction", "classics"]
  },
  {
    isbn: "9780141439518",
    title: "Pride and Prejudice",
    description:
      "Elizabeth Bennet and the proud Mr Darcy misjudge each other in Austen's comedy of manners about marriage, money and first impressions.",
    authors: ["Jane Austen"],
    publisher: "Penguin Classics",
    publishedDate: null,
    pages: 480,
    format: "paperback",
    price: "8.99",
    stock: 50,
    categories: ["fiction", "classics"]
  },
  {
    isbn: "9780316769488",
    title: "The Catcher in the Rye",
    description:
      "After being expelled from prep school, sixteen-year-old Holden Caulfield spends three days drifting around New York City.",
    authors: ["J. D. Salinger"],
    publisher: "Little, Brown and Company",
    publishedDate: null,
    pages: 277,
    format: "paperback",
    price: "9.99",
    stock: 28,
    categories: ["fiction", "classics"]
  },
  {
    isbn: "9780547928227",
    title: "The Hobbit",
    description:
      "Bilbo Baggins is swept out of his comfortable hobbit-hole by Gandalf and a company of dwarves on a quest to reclaim treasure from the dragon Smaug.",
    authors: ["J. R. R. Tolkien"],
    publisher: "Mariner Books",
    publishedDate: "2012-09-18",
    pages: 300,
    format: "paperback",
    price: "14.99",
    stock: 45,
    categories: ["fiction", "fantasy"]
  },
  {
    isbn: "9780590353427",
    title: "Harry Potter and the Sorcerer's Stone",
    description:
      "On his eleventh birthday Harry Potter learns he is a wizard and leaves the Dursleys for Hogwarts School of Witchcraft and Wizardry.",
    authors: ["J. K. Rowling"],
    publisher: "Scholastic",
    publishedDate: null,
    pages: 309,
    format: "paperback",
    price: "10.99",
    stock: 80,
    categories: ["fiction", "fantasy"]
  },
  {
    isbn: "9780441172719",
    title: "Dune",
    description:
      "On the desert planet Arrakis, the only source of the spice melange, young Paul Atreides is drawn into a struggle between great houses and the native Fremen.",
    authors: ["Frank Herbert"],
    publisher: "Ace Books",
    publishedDate: null,
    pages: null,
    format: "paperback",
    price: "10.99",
    stock: 38,
    categories: ["fiction", "science-fiction"]
  },
  {
    isbn: "9780062315007",
    title: "The Alchemist",
    description:
      "Santiago, an Andalusian shepherd boy, travels to the Egyptian desert in search of a treasure he has dreamed about.",
    authors: ["Paulo Coelho"],
    publisher: "HarperOne",
    publishedDate: "2014-04-15",
    pages: 208,
    format: "paperback",
    price: "12.99",
    stock: 55,
    categories: ["fiction"]
  },
  {
    isbn: "9780735211292",
    title: "Atomic Habits",
    subtitle: "An Easy & Proven Way to Build Good Habits & Break Bad Ones",
    description:
      "A practical framework for improving by 1% each day, built on the science of how habits form and how to change them.",
    authors: ["James Clear"],
    publisher: "Avery",
    publishedDate: "2018-10-16",
    pages: 320,
    format: "hardcover",
    price: "27.00",
    stock: 70,
    categories: ["non-fiction", "self-help"]
  },
  {
    isbn: "9780374533557",
    title: "Thinking, Fast and Slow",
    description:
      "Nobel laureate Daniel Kahneman explains the two systems that drive how we think: fast, intuitive System 1 and slow, deliberate System 2.",
    authors: ["Daniel Kahneman"],
    publisher: "Farrar, Straus and Giroux",
    publishedDate: "2013-04-02",
    pages: 499,
    format: "paperback",
    price: "18.00",
    stock: 30,
    categories: ["non-fiction", "psychology"]
  },
  {
    isbn: "9780062316097",
    title: "Sapiens",
    subtitle: "A Brief History of Humankind",
    description:
      "A sweeping history of Homo sapiens, from the Cognitive Revolution through the Agricultural and Scientific Revolutions.",
    authors: ["Yuval Noah Harari"],
    publisher: "Harper",
    publishedDate: "2015-02-10",
    pages: 443,
    format: "hardcover",
    price: "24.99",
    stock: 40,
    categories: ["non-fiction", "history"]
  },
  {
    isbn: "9780399590504",
    title: "Educated",
    subtitle: "A Memoir",
    description:
      "Raised by survivalists in the mountains of Idaho with no formal schooling, Tara Westover teaches herself enough to get into university and eventually earns a PhD from Cambridge.",
    authors: ["Tara Westover"],
    publisher: "Random House",
    publishedDate: "2018-02-20",
    pages: null,
    format: "hardcover",
    price: "28.00",
    stock: 22,
    categories: ["non-fiction", "memoir"]
  },
  {
    isbn: "9780132350884",
    title: "Clean Code",
    subtitle: "A Handbook of Agile Software Craftsmanship",
    description:
      "Principles, patterns and case studies for writing code that is readable, maintainable and easy to change.",
    authors: ["Robert C. Martin"],
    publisher: "Prentice Hall",
    publishedDate: "2008-08-01",
    pages: 464,
    format: "paperback",
    price: "44.99",
    stock: 25,
    categories: ["non-fiction", "programming"]
  },
  {
    isbn: "9780201616224",
    title: "The Pragmatic Programmer",
    subtitle: "From Journeyman to Master",
    description:
      "Practical advice on everything from personal responsibility and career development to architectural techniques for keeping code flexible.",
    authors: ["Andrew Hunt", "David Thomas"],
    publisher: "Addison-Wesley",
    publishedDate: "1999-10-20",
    pages: 352,
    format: "paperback",
    price: "39.99",
    stock: 18,
    categories: ["non-fiction", "programming"]
  },
  {
    isbn: "9780593135204",
    title: "Project Hail Mary",
    description:
      "Science teacher Ryland Grace wakes up alone on a spacecraft with no memory, and slowly realises he is humanity's last chance to stop a microbe that is dimming the Sun.",
    authors: ["Andy Weir"],
    publisher: "Ballantine Books",
    publishedDate: "2021-05-04",
    pages: 496,
    format: "hardcover",
    price: "28.99",
    stock: 33,
    categories: ["fiction", "science-fiction"]
  },
  {
    isbn: "9780553418026",
    title: "The Martian",
    description:
      "Stranded on Mars after his crew leaves him for dead, astronaut Mark Watney has to use his engineering skills to survive until rescue.",
    authors: ["Andy Weir"],
    publisher: "Broadway Books",
    publishedDate: "2014-10-28",
    pages: null,
    format: "paperback",
    price: "16.99",
    stock: 36,
    categories: ["fiction", "science-fiction"]
  },
  {
    isbn: "9780385490818",
    title: "The Handmaid's Tale",
    description:
      "In the theocratic Republic of Gilead, Offred is a Handmaid, valued only for her ability to bear children for the ruling class.",
    authors: ["Margaret Atwood"],
    publisher: "Anchor Books",
    publishedDate: "1998-03-16",
    pages: 311,
    format: "paperback",
    price: "15.99",
    stock: 27,
    categories: ["fiction", "classics", "science-fiction"]
  },
  {
    isbn: "9780060850524",
    title: "Brave New World",
    description:
      "In a future World State built on conditioning, pleasure and stability, Bernard Marx and John the Savage question what has been lost.",
    authors: ["Aldous Huxley"],
    publisher: "Harper Perennial Modern Classics",
    publishedDate: "2006-10-17",
    pages: 288,
    format: "paperback",
    price: "15.99",
    stock: 31,
    categories: ["fiction", "classics", "science-fiction"]
  },
  {
    isbn: "9781451673319",
    title: "Fahrenheit 451",
    description:
      "Fireman Guy Montag burns books for a living in a society that has outlawed them, until he begins to wonder what is inside them.",
    authors: ["Ray Bradbury"],
    publisher: "Simon & Schuster",
    publishedDate: "2012-01-10",
    pages: null,
    format: "paperback",
    price: "11.99",
    stock: 40,
    categories: ["fiction", "classics", "science-fiction"]
  },
  {
    isbn: "9780307277671",
    title: "The Road",
    description:
      "A father and his young son walk south through a burned, post-apocalyptic America, carrying only what they need to survive.",
    authors: ["Cormac McCarthy"],
    publisher: "Vintage International",
    publishedDate: null,
    pages: 287,
    format: "paperback",
    price: "16.00",
    stock: 20,
    categories: ["fiction"]
  },
  {
    isbn: "9780525559474",
    title: "The Midnight Library",
    description:
      "Between life and death, Nora Seed finds a library whose books let her live out every life she could have chosen.",
    authors: ["Matt Haig"],
    publisher: "Viking",
    publishedDate: "2020-09-29",
    pages: 304,
    format: "hardcover",
    price: "26.00",
    stock: 44,
    categories: ["fiction", "fantasy"]
  },
  {
    isbn: "9780307269751",
    title: "The Girl with the Dragon Tattoo",
    description:
      "Disgraced journalist Mikael Blomkvist and hacker Lisbeth Salander investigate a forty-year-old disappearance in a wealthy Swedish family.",
    authors: ["Stieg Larsson"],
    publisher: "Alfred A. Knopf",
    publishedDate: "2008-09-16",
    pages: null,
    format: "hardcover",
    price: "25.95",
    stock: 15,
    categories: ["fiction", "mystery-thriller"]
  }
];
