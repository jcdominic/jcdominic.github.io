// Everything the apartment says about you lives in this file.
// Edit freely; the 3D scene reads from it and you never have to touch main.js.
//
// Each station is one thing you can click in the room. A station has:
//   name     shown when you look at it ("TV")
//   hint     shown next to the name ("Movies & shows")
//   title    heading of the panel that opens
//   intro    optional line under the heading
//   body     optional list of paragraphs after the intro
//   sections list of { heading, items }
//   hidden   true to make it plain furniture for now (not clickable, not counted)
//
// Each item can have any of:
//   title  (required)   meta  (small text after the title)
//   note   (a sentence)  link  (URL; the title becomes a link)
//   photo  (path to an image, e.g. "photos/zion.jpg", relative to this folder)
//
// Anything in [square brackets] is a placeholder, same as the other draft pages.

export const stations = {
  tv: {
    name: "TV",
    hint: "Movies & shows",
    title: "Now showing",
    sections: [
      {
        heading: "Currently watching",
        items: [{ title: "The Diplomat", meta: "Season 4" }],
      },
      {
        heading: "All-time favorites",
        items: [
          { title: "Interstellar", meta: "Movie" },
          { title: "Avatar: The Last Airbender", meta: "TV" },
          { title: "Severance", meta: "TV" },
          { title: "Jack Ryan", meta: "TV" },
        ],
      },
      {
        heading: "On deck",
        items: [
          { title: "Good Will Hunting", meta: "Movie" },
          { title: "Dead Poets Society", meta: "Movie" },
        ],
      },
      {
        items: [{ title: "The full bookshelf", link: "/bookshelf/" }],
      },
    ],
  },

  desk: {
    name: "Desk",
    hint: "Work & education",
    title: "The desk",
    sections: [
      {
        heading: "Work",
        items: [
          {
            title: "Accenture",
            meta: "Senior Analyst",
            note: "I help companies use AI better and make pretty slides.",
          },
        ],
      },
      {
        heading: "Education",
        items: [
          {
            title: "Yale University",
            meta: "B.S. in computer science and economics, with distinction",
            note: "I read some good books, wrote some code, and bought an unreasonable number of tortillas.",
          },
          { title: "Loyola High School", meta: "Valedictorian", note: "I told FRC Team 3408's robots what to do." },
        ],
      },
      {
        items: [
          { title: "More about my work and coursework", link: "/work/" },
          { title: "LinkedIn", link: "https://www.linkedin.com/in/justincdominic/" },
          { title: "GitHub", link: "https://github.com/jcdominic" },
        ],
      },
    ],
  },

  fridge: {
    hidden: true, // Recipes coming soon. Delete this line to make the fridge clickable.
    name: "Fridge",
    hint: "Recipes",
    title: "On the fridge",
    intro: "I cook a lot and like figuring out why a recipe works.",
    sections: [
      {
        heading: "Currently",
        items: [{ title: "Thanksgiving, optimized", note: "Working out how to cook the whole dinner with food science." }],
      },
      {
        heading: "Recipes",
        items: [
          { title: "[Recipe]", meta: "[Serves 4]", note: "[Why it works, or a link.]" },
          { title: "[Recipe]" },
        ],
      },
      {
        heading: "Eating out",
        items: [{ title: "My Beli list", link: "https://beliapp.co/app/justindominic" }],
      },
    ],
  },

  map: {
    name: "Map",
    hint: "National parks",
    title: "National parks",
    intro: "Working through them, one road trip at a time.",
    art: "map", // draws the wall map at the top of the panel
    sections: [
      {
        heading: "Visited",
        // lat/lon put the pin on the map. Add photo: "photos/zion.jpg" to show a picture.
        items: [
          { title: "Joshua Tree", lat: 33.87, lon: -115.9 },
          { title: "Sequoia", lat: 36.49, lon: -118.57 },
          { title: "Yosemite", lat: 37.86, lon: -119.54 },
          { title: "Pinnacles", lat: 36.49, lon: -121.18 },
          { title: "Zion", lat: 37.3, lon: -113.03 },
          { title: "Bryce Canyon", lat: 37.59, lon: -112.19 },
          { title: "Yellowstone", lat: 44.43, lon: -110.59 },
          { title: "Grand Teton", lat: 43.79, lon: -110.68 },
          { title: "Badlands", lat: 43.86, lon: -102.34 },
          { title: "Gateway Arch", lat: 38.62, lon: -90.18 },
        ],
      },
      {
        heading: "Also",
        items: [
          { title: "Appalachian Trail", note: "Backpacked a few stretches." },
          { title: "More photos on VSCO", link: "https://vsco.co/justincdominic/gallery" },
        ],
      },
    ],
  },

  bookshelf: {
    name: "Bookshelf",
    hint: "Books",
    title: "The bookshelf",
    sections: [
      {
        heading: "Currently reading",
        items: [
          { title: "Abundance", meta: "Ezra Klein and Derek Thompson" },
          { title: "Crime and Punishment", meta: "Fyodor Dostoevsky" },
          { title: "Confessions", meta: "St. Augustine" },
          { title: "Crown of Midnight", meta: "Sarah J. Maas" },
          { title: "Interior Castle", meta: "St. Teresa of Ávila" },
        ],
      },
      {
        heading: "On deck",
        items: [
          { title: "East of Eden", meta: "John Steinbeck" },
          { title: "Algospeak", meta: "Adam Aleksic" },
          { title: "Animal Farm", meta: "George Orwell" },
          { title: "1984", meta: "George Orwell" },
        ],
      },
      {
        heading: "All-time favorites",
        items: [
          { title: "The Giver", meta: "Lois Lowry" },
          { title: "The Gospel of John" },
          { title: "Harry Potter", meta: "J. K. Rowling", note: "How did Harry Potter get down a hill? Walking. J.K., rolling." },
          { title: "Jesus and the Jewish Roots of the Eucharist", meta: "Brant Pitre" },
          { title: "The Kite Runner", meta: "Khaled Hosseini" },
          { title: "The Lamb’s Supper", meta: "Scott Hahn" },
          { title: "Percy Jackson", meta: "Rick Riordan", note: "I’ve probably read The Son of Neptune at least ten times." },
          { title: "Red Rising", meta: "Pierce Brown", note: "The whole series." },
          { title: "Shadowhunters", meta: "Cassandra Clare" },
          { title: "A Thousand Splendid Suns", meta: "Khaled Hosseini" },
        ],
      },
      {
        items: [{ title: "The full bookshelf", link: "/bookshelf/" }],
      },
    ],
  },

  skis: {
    name: "Skis",
    hint: "Outside",
    title: "Gear by the door",
    intro: "I spend as much time outside as I can.",
    sections: [
      {
        heading: "Seasons",
        items: [
          { title: "Winter", note: "Skiing." },
          { title: "Everything else", note: "Hiking and running." },
        ],
      },
      {
        heading: "Logged",
        items: [{ title: "Strava", link: "https://www.strava.com/athletes/54869886" }],
      },
    ],
  },

  spikeball: {
    name: "Spikeball set",
    hint: "Challenge me",
    title: "Spikeball",
    intro: "I will play Spikeball with anyone who asks. Ask.",
    sections: [],
  },

  pennants: {
    name: "Pennants",
    hint: "Teams",
    title: "Teams",
    sections: [
      {
        heading: "Rooting for",
        items: [
          { title: "Cincinnati Bengals", meta: "Football" },
          { title: "Los Angeles Lakers", meta: "Basketball" },
          { title: "Yale Bulldogs", meta: "Alma mater" },
        ],
      },
    ],
  },

  window: {
    name: "Window",
    hint: "Places",
    title: "The view",
    intro: "San Francisco, for now.",
    sections: [
      {
        heading: "Places I've lived",
        items: [
          { title: "Los Angeles", meta: "Grew up" },
          { title: "Jakarta" },
          { title: "Cincinnati" },
          { title: "New Haven" },
          { title: "Paris" },
          { title: "San Francisco", meta: "Now" },
        ],
      },
    ],
  },

  dream: {
    name: "Window",
    hint: "The city that could be",
    title: "San Francisco, someday",
    intro: "I've spent a lot of time thinking about what San Francisco could be.",
    body: [
      "I'd love to live in a city with more homes, beautiful architecture, trains you don't have to check a schedule for, and neighborhoods where you can get just about anywhere on foot. More trees, little cafes, public squares, and kids who can bike to school. A city where raising a family doesn't mean having to move away.",
      "A lot of my thinking on this comes from the abundance movement and Catholic social teaching. I'm interested in how we can get better at building things again, but also in what we're building toward: a society where more people can afford to live well, raise families, and participate in their communities.",
      "I think San Francisco has the potential to be one of the greatest cities in the world.",
    ],
    sections: [
      {
        heading: "Inspired by",
        items: [
          { title: "Abundance", meta: "Ezra Klein and Derek Thompson" },
          { title: "Rerum Novarum", meta: "Pope Leo XIII, 1891" },
          { title: "San Fransokyo", meta: "Big Hero 6" },
          { title: "The Paris Métro" },
        ],
      },
    ],
  },

  crucifix: {
    name: "Crucifix",
    hint: "Faith",
    title: "Faith",
    sections: [
      {
        items: [
          {
            title: "John 3:16",
            note: "For God so loved the world that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
          },
          {
            title: "Galatians 2:20",
            note: "I have been crucified with Christ; it is no longer I who live, but Christ who lives in me; and the life I now live in the flesh I live by faith in the Son of God, who loved me and gave himself for me.",
          },
        ],
      },
    ],
  },

  guadalupe: {
    name: "Our Lady of Guadalupe",
    hint: "Faith",
    title: "Our Lady of Guadalupe",
    intro: "Patroness of the Americas.",
    body: [
      "In December 1531, Mary appeared to St. Juan Diego, an Indigenous convert, on the hill of Tepeyac outside Mexico City. She spoke to him in his own language, Nahuatl, and left her image on his tilma. Nearly 500 years later it still hangs in the Basilica of Guadalupe, where millions of pilgrims come to see her every year.",
      "My faith really caught fire on a pilgrimage to Guadalupe with St. Thomas More, the Catholic chaplaincy at Yale.",
    ],
    sections: [],
  },
};

