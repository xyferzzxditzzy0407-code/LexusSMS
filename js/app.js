let otpRows = [];
let selected = 'ALL';

function getCountry(row) {
  const range = (row.rangeName || '').toLowerCase();
  const number = row.destinationNumber || '';

  // Country berdasarkan nama range / prefix nomor
  if (range.includes('benin') || number.startsWith('229')) return 'BJ';
  if (range.includes('sierra leone') || number.startsWith('232')) return 'SL';
  if (range.includes('pakistan') || number.startsWith('92')) return 'PK';
  if (range.includes('indonesia') || number.startsWith('62')) return 'ID';
  if (range.includes('india') || number.startsWith('91')) return 'IN';

  return 'UN';
}

function formatTime(date) {
  if (!date) return '-';

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function maskNumber(number) {
  if (!number) return '-';

  const value = String(number);

  if (value.length <= 7) return value;

  return value.slice(0, 4) + '****' + value.slice(-3);
}

function renderOtp() {
  const search =
    (document.getElementById('otpSearch')?.value || '')
      .toLowerCase();

  const data = otpRows.filter(row => {
    const countryMatch =
      selected === 'ALL' || row[0] === selected;

    const searchMatch =
      row.join(' ').toLowerCase().includes(search);

    return countryMatch && searchMatch;
  });

  const body = document.getElementById('otpBody');

  if (!body) return;

  body.innerHTML = data.map(row => `
    <tr>
      <td>
        <span class="country-tag">${row[0]}</span>
      </td>
      <td>${row[1]}</td>
      <td>—</td>
      <td>${row[3]}</td>
    </tr>
  `).join('');

  const statOtp = document.getElementById('statOtp');

  if (statOtp) {
    statOtp.textContent = otpRows.length;
  }
}

function filterOtp() {
  renderOtp();
}

function country(c) {
  selected = c;
  renderOtp();
}

function todayOtp() {
  selected = 'ALL';

  const search = document.getElementById('otpSearch');

  if (search) {
    search.value = '';
  }

  renderOtp();

  alert('Showing current authorized traffic records.');
}

function demo() {
  alert('Traffic API belum tersedia.');
}

function sendChat() {
  const input = document.getElementById('chatInput');

  if (!input || !input.value.trim()) return;

  const div = document.createElement('div');

  div.innerHTML =
    '<b>You</b><p>' +
    input.value.replace(/[<>]/g, '') +
    '</p>';

  const messages = document.getElementById('messages');

  if (messages) {
    messages.appendChild(div);
  }

  input.value = '';
}

async function loadTraffic() {
  try {
    const response = await fetch('/api/traffic', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    const rows = Array.isArray(data.rows)
      ? data.rows
      : [];

    /*
      Traffic API → OTP table

      row[0] = country
      row[1] = destination number
      row[2] = status
      row[3] = received time

      Message/code verification tidak diproses.
    */
    otpRows = rows.map(row => {
      const country = getCountry(row);

      const number = maskNumber(
        row.destinationNumber
      );

      const status = row.status || '-';

      const time = formatTime(
        row.receivedAt
      );

      return [
        country,
        number,
        status,
        time
      ];
    });

    renderOtp();

    /*
      Hitung jumlah Traffic berdasarkan negara
    */
    const traffic = {};

    otpRows.forEach(row => {
      const country = row[0];

      traffic[country] =
        (traffic[country] || 0) + 1;
    });

    const statTraffic =
      document.getElementById('statTraffic');

    if (statTraffic) {
      statTraffic.textContent =
        otpRows.length;
    }

    const trafficData =
      document.getElementById('trafficData');

    if (trafficData) {
      trafficData.innerHTML =
        Object.entries(traffic)
          .map(([country, count]) => `
            <p>
              <span class="country-tag">
                ${country}
              </span>
              ${count} record
            </p>
          `)
          .join('');
    }

  } catch (error) {
    console.error('Traffic error:', error);

    const trafficData =
      document.getElementById('trafficData');

    if (trafficData) {
      trafficData.innerHTML =
        '<p class="muted">API not connected yet.</p>';
    }

    const statTraffic =
      document.getElementById('statTraffic');

    if (statTraffic) {
      statTraffic.textContent = '0';
    }

    otpRows = [];
    renderOtp();
  }
}

function route() {
  const id =
    location.hash.slice(1) || 'dashboard';

  document
    .querySelectorAll('.page')
    .forEach(page => {
      page.classList.toggle(
        'active',
        page.id === id
      );
    });

  document
    .querySelectorAll('nav a')
    .forEach(a => {
      a.classList.toggle(
        'active',
        a.getAttribute('href') === '#' + id
      );
    });

  const title =
    document.getElementById('pageTitle');

  if (title) {
    title.textContent =
      id
        .replaceAll('-', ' ')
        .replace(/\b\w/g, x => x.toUpperCase());
  }
}

window.addEventListener(
  'hashchange',
  route
);

document.addEventListener(
  'DOMContentLoaded',
  () => {
    route();
    renderOtp();
    loadTraffic();
  }
);
