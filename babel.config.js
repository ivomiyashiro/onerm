module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // The Drizzle migrations (drizzle/migrations.js) import the .sql files as strings (ADR-0010).
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
