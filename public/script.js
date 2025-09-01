async function fetchReservations() {
  const res = await fetch('/reservations');
  const data = await res.json();
  const list = document.getElementById('reservations');
  list.innerHTML = '';
  data.sort((a,b) => new Date(a.startTime) - new Date(b.startTime));
  data.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${new Date(r.startTime).toLocaleString()} - ${new Date(r.endTime).toLocaleString()}: ${r.destination} by ${r.user} (${r.status})`;
    if (r.status !== 'cancelled') {
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = async () => {
        const user = prompt('Your name for cancellation:');
        const role = prompt('Role (leave blank if none):');
        await fetch('/reservations/' + r.id, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, role })
        });
        fetchReservations();
      };
      li.appendChild(cancelBtn);
      if (r.status === 'pending') {
        const approveBtn = document.createElement('button');
        approveBtn.textContent = 'Approve';
        approveBtn.onclick = async () => {
          const role = prompt('Role:');
          await fetch('/reservations/' + r.id + '/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });
          fetchReservations();
        };
        li.appendChild(approveBtn);
      }
    }
    list.appendChild(li);
  });
}

document.getElementById('destination').addEventListener('change', e => {
  const custom = document.getElementById('customDestination');
  const dur = document.getElementById('duration');
  if (e.target.value === 'Other') {
    custom.style.display = 'inline';
    dur.style.display = 'inline';
  } else {
    custom.style.display = 'none';
    dur.style.display = 'none';
  }
});

document.getElementById('reserveForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());
  body.duration = body.duration ? Number(body.duration) : undefined;
  await fetch('/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  e.target.reset();
  fetchReservations();
});

fetchReservations();
