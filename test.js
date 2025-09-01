const request = require('supertest');
const dayjs = require('dayjs');
const assert = require('assert');
const app = require('./server');

async function run() {
  const start1 = dayjs().add(2, 'hour').startOf('hour');
  let res = await request(app)
    .post('/reservations')
    .send({ user: 'Alice', destination: 'Antigua Guatemala', startTime: start1.toISOString() });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.destination, 'Antigua Guatemala');

  // overlapping reservation should fail
  res = await request(app)
    .post('/reservations')
    .send({ user: 'Bob', destination: 'Puerto', startTime: start1.toISOString() });
  assert.strictEqual(res.status, 400);

  // second consecutive flight for Alice
  const secondStart = start1.add(30, 'minute');
  res = await request(app)
    .post('/reservations')
    .send({ user: 'Alice', destination: 'Puerto', startTime: secondStart.toISOString() });
  assert.strictEqual(res.status, 200);

  // other destination pending approval
  const otherStart = start1.add(3, 'hour');
  res = await request(app)
    .post('/reservations')
    .send({ user: 'Carol', destination: 'Other', customDestination: 'New Place', duration: 45, startTime: otherStart.toISOString() });
  assert.strictEqual(res.body.status, 'pending');

  // third consecutive flight for Alice should fail
  const thirdStart = secondStart.add(1, 'hour');
  res = await request(app)
    .post('/reservations')
    .send({ user: 'Alice', destination: 'Puerto', startTime: thirdStart.toISOString() });
  assert.strictEqual(res.status, 400);
}

run()
  .then(() => console.log('All tests passed'))
  .catch(e => { console.error('Tests failed', e); process.exit(1); });
