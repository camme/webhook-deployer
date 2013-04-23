/*global module:false*/

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> */'
    },
    lint: {
      files: ['grunt.js', 'api.js', '<simplemocha:all.src>']
    },
    simplemocha: {
      all: {
        src: 'test/**/*.js',
        options: {
          timeout: 5000,
          ignoreLeaks: false,
          ui: 'bdd',
          reporter: 'tap'
        }
      }
    },
    watch: {
      files: ['test/**/*.js', 'index.js'],
      tasks:'lint simplemocha'
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true
      },
      globals: {
        module: true,
        console: true,
        require: true,
        __dirname: true,
        process: true
      }
    }
  });

  //grunt.loadTasks('grunt/tasks');

  //grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-simple-mocha');

  // Default task.
  grunt.registerTask('default', 'lint simplemocha');

};
