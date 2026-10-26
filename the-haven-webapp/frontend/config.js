// Production frontend: browser -> Vercel /api proxy -> Render /api -> MongoDB Atlas.
// Keep API calls same-origin. No database connection strings or tokens belong here.
window.HAVEN_CONFIG = Object.freeze({
  DEMO_MODE: false,
  API_BASE_URL: '/api'
});
