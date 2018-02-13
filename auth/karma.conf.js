module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    browsers: ['PhantomJS'],
    reporters: ['spec', 'junit'],
    singleRun: true,
    files: [
      'src/client/**/*.spec.*'
    ],
    webpack: {
      module: {
        loaders: [{
          test: /\.jsx$|\.js$/,
          exclude: /node_modules/,
          loaders: ['babel']
        }]
      }
    },
    preprocessors: {
      'src/client/**/*.spec.*': ['webpack']
    },
    plugins: [
      require('karma-webpack'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-phantomjs-launcher'),
      require('karma-spec-reporter'),
      require('karma-junit-reporter')
    ]
  });
};
