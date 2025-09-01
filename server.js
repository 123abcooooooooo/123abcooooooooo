const express = require('express');
const dayjs = require('dayjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DESTINATIONS = {
  'Lago Atitlan': 60,
  'Antigua Guatemala': 30,
  'Puerto': 60
};

let reservations = [];
let nextId = 1;

function overlap(start1, end1, start2, end2) {
  return start1.isBefore(end2) && start2.isBefore(end1);
}

app.get('/reservations', (req, res) => {
  res.json(reservations);
});

app.post('/reservations', (req, res) => {
  const { user, destination, startTime, duration, customDestination } = req.body;
  if (!user || !destination || !startTime) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const start = dayjs(startTime);
  if (start.diff(dayjs(), 'minute') < 60) {
    return res.status(400).json({ error: 'Must schedule at least 1 hour in advance' });
  }

  let destName = destination;
  let dur = DESTINATIONS[destination];
  let status = 'confirmed';
  if (destination === 'Other') {
    if (!customDestination || !duration) {
      return res.status(400).json({ error: 'Custom destination and duration required' });
    }
    destName = customDestination;
    dur = Number(duration);
    status = 'pending';
  }
  const end = start.add(dur, 'minute');

  const conflict = reservations.find(r => overlap(start, end, dayjs(r.startTime), dayjs(r.endTime)) && r.status !== 'cancelled');
  if (conflict) {
    return res.status(400).json({ error: 'Time slot already taken' });
  }

  // consecutive flights check
  const userReservations = reservations
    .filter(r => r.user === user && r.status !== 'cancelled')
    .map(r => ({ startTime: r.startTime, endTime: r.endTime }));
  userReservations.push({ startTime: start.toISOString(), endTime: end.toISOString() });
  userReservations.sort((a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
  let chain = 1;
  for (let i = 1; i < userReservations.length; i++) {
    const prevEnd = dayjs(userReservations[i - 1].endTime);
    const currStart = dayjs(userReservations[i].startTime);
    if (prevEnd.isSame(currStart)) {
      chain++;
      if (chain > 2) {
        return res.status(400).json({ error: 'Cannot book more than two consecutive flights' });
      }
    } else {
      chain = 1;
    }
  }

  const reservation = {
    id: nextId++,
    user,
    destination: destName,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status
  };
  reservations.push(reservation);
  res.json(reservation);
});

app.post('/reservations/:id/approve', (req, res) => {
  const { role } = req.body;
  if (role !== 'secretary') {
    return res.status(403).json({ error: 'Only secretary can approve' });
  }
  const reservation = reservations.find(r => r.id === Number(req.params.id));
  if (!reservation || reservation.status !== 'pending') {
    return res.status(404).json({ error: 'Reservation not found or not pending' });
  }
  reservation.status = 'confirmed';
  res.json(reservation);
});

app.delete('/reservations/:id', (req, res) => {
  const { user, role } = req.body;
  const reservation = reservations.find(r => r.id === Number(req.params.id));
  if (!reservation || reservation.status === 'cancelled') {
    return res.status(404).json({ error: 'Reservation not found' });
  }
  if (reservation.user !== user && role !== 'secretary') {
    return res.status(403).json({ error: 'Not authorized to cancel' });
  }
  if (dayjs(reservation.startTime).diff(dayjs(), 'minute') < 60) {
    return res.status(400).json({ error: 'Cannot cancel within 1 hour of flight' });
  }
  reservation.status = 'cancelled';
  res.json(reservation);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
