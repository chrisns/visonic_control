const app = require("../index")
const request = require('supertest');

describe('GET /', function () {
  it('respond with json', function (done) {
    request(app)
      .get('/')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200, done);
  });
});

// TODO: write more tests
