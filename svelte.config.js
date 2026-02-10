import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    csp: {
      directives: {
        "default-src": ["self"],
        "script-src": ["self"],
        "style-src": ["self", "unsafe-inline", "https://fonts.googleapis.com"],
        "font-src": ["self", "https://fonts.gstatic.com"],
        "img-src": ["self", "data:", "https:"],
        "connect-src": ["self", "https://api.github.com", "https://github.com"],
        "frame-ancestors": ["none"],
        "base-uri": ["self"],
        "form-action": ["self", "https://github.com"],
      },
    },
  },
};

export default config;
