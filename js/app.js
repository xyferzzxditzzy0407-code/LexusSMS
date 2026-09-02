let otpRows = [];
let selected = 'ALL';


/* =========================
   COUNTRY DETECTOR
========================= */

function getCountry(row) {
  const range = String(row.rangeName || '').toLowerCase();
  const number = String(row.destinationNumber || '');

  if (range.includes('pakistan') || number.startsWith('92')) {
    return 'PK';
  }

  if (range.includes('indonesia') || number.startsWith('62')) {
    return 'ID';
  }

  if (range.includes('india') || number.startsWith('91')) {
    return 'IN';
  }

  if (range.includes('bangladesh') || number.startsWith('880')) {
    return 'BD';
  }

  if (range.includes('thailand') || number.startsWith('66')) {
    return 'TH';
  }

  if (range.includes('sierra leone') || number.startsWith('232')) {
    return 'SL';
  }

  if (range.includes('benin') || number.startsWith('229')) {
    return 'BJ';
  }

  return 'UN';
}


/* =========================
   FORMAT TIME
========================= */

function formatTime(date) {
  if (!date) return '-';

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return '-';
  }

  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}


/* =========================
   MASK NUMBER
========================= */

function maskNumber(number) {
  if (!number) return '-';

  const value = String(number);

  if (value.length <= 7) {
    return value;
  }

  return (
    value.slice(0, 4) +
    '****' +
    value.slice(-3)
  );
}


/* =========================
   RENDER OTP TABLE
========================= */

function renderOtp() {
  const search =
    (
      document.getElementById('otpSearch')?.value || ''
    ).toLowerCase();

  const data = otpRows.filter(row => {

    const countryMatch =
      selected === 'ALL' ||
      row.country === selected;

    const searchMatch = [
      row.country,
      row.number,
      row.source,
      row.status,
      row.time
    ]
      .join(' ')
      .toLowerCase()
      .includes(search);

    return countryMatch && searchMatch;
  });


  const body =
    document.getElementById('otpBody');

  if (!body) return;


  if (!data.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5" class="muted">
          No traffic data.
        </td>
      </tr>
    `;
  } else {

    body.innerHTML = data.map(row => `
      <tr>

        <td>
          <span class="country-tag">
            ${row.country}
          </span>
        </td>

        <td>
          ${row.number}
        </td>

        <td>
          ${row.source}
        </td>

        <td>
          ${row.messageBody}
        </td>

        <td>
          ${row.time}
        </td>

      </tr>
    `).join('');
  }


  const statOtp =
    document.getElementById('statOtp');

  if (statOtp) {
    statOtp.textContent = data.length;
  }
}


/* =========================
   SEARCH
========================= */

function filterOtp() {
  renderOtp();
}


/* =========================
   COUNTRY FILTER
========================= */

function country(c) {
  selected = c;
  renderOtp();
}


/* =========================
   TODAY OTP
========================= */

function todayOtp() {
  selected = 'ALL';

  const search =
    document.getElementById('otpSearch');

  if (search) {
    search.value = '';
  }

  renderOtp();
}


/* =========================
   DEMO
========================= */

function demo() {
  alert('Feature belum tersedia.');
}


/* =========================
   CHAT
========================= */

function sendChat() {
  const input =
    document.getElementById('chatInput');

  if (!input || !input.value.trim()) {
    return;
  }


  const div =
    document.createElement('div');

  div.innerHTML =
    '<b>You</b><p>' +
    input.value.replace(/[<>]/g, '') +
    '</p>';


  const messages =
    document.getElementById('messages');

  if (messages) {
    messages.appendChild(div);
  }

  input.value = '';
}


/* =========================
   LOAD TRAFFIC API
========================= */

async function loadTraffic() {

  try {

    const response =
      await fetch('/api/traffic', {
        method: 'GET',

        headers: {
          'Accept': 'application/json'
        }
      });


    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status
      );
    }


    const data =
      await response.json();


    /*
      Format API:

      {
        rows: [],
        total: 1,
        page: 1,
        pageSize: 15
      }
    */

    const rows =
      Array.isArray(data.rows)
        ? data.rows
        : [];


    /*
      Traffic → OTP Table

      Negara  = rangeName / prefix
      Nomor   = destinationNumber
      Source  = sourceAddress
      messageBody  = Otp
      Jam     = receivedAt

      messageBody tidak diproses.
    */

    otpRows = rows.map(row => {

      return {

        country:
          getCountry(row),

        number:
          maskNumber(
            row.destinationNumber
          ),

        source:
          row.sourceAddress || '-',

        messageBody:
          row.messageBody || '-',

        time:
          formatTime(
            row.receivedAt
          )

      };

    });


    /* Render tabel */

    renderOtp();


    /* =========================
       TOTAL TRAFFIC
    ========================= */

    const statTraffic =
      document.getElementById(
        'statTraffic'
      );

    if (statTraffic) {

      statTraffic.textContent =
        data.total ?? rows.length;

    }


    /* =========================
       TRAFFIC BY COUNTRY
    ========================= */

    const traffic = {};


    otpRows.forEach(row => {

      traffic[row.country] =
        (traffic[row.country] || 0) + 1;

    });


    const countryTraffic =
      document.getElementById(
        'countryTraffic'
      );


    if (countryTraffic) {

      const entries =
        Object.entries(traffic);


      if (!entries.length) {

        countryTraffic.innerHTML =
          '<p class="muted">No traffic data.</p>';

      } else {

        countryTraffic.innerHTML =
          entries
            .sort(
              (a, b) => b[1] - a[1]
            )
            .map(
              ([country, count]) => `
                <p>

                  <span class="country-tag">
                    ${country}
                  </span>

                  ${count} Traffic

                </p>
              `
            )
            .join('');
      }
    }


    /* =========================
       TRAFFIC PAGE
    ========================= */

    const trafficData =
      document.getElementById(
        'trafficData'
      );


    if (trafficData) {

      trafficData.innerHTML = `

        <p>
          Total Traffic:
          <b>${data.total ?? rows.length}</b>
        </p>

        <p>
          Page:
          <b>${data.page ?? 1}</b>
        </p>

        <p>
          Page Size:
          <b>${data.pageSize ?? rows.length}</b>
        </p>

      `;
    }


  } catch (error) {

    console.error(
      'Traffic error:',
      error
    );


    otpRows = [];

    renderOtp();


    const statTraffic =
      document.getElementById(
        'statTraffic'
      );

    if (statTraffic) {
      statTraffic.textContent = '0';
    }


    const statOtp =
      document.getElementById(
        'statOtp'
      );

    if (statOtp) {
      statOtp.textContent = '0';
    }


    const countryTraffic =
      document.getElementById(
        'countryTraffic'
      );

    if (countryTraffic) {

      countryTraffic.innerHTML =
        '<p class="muted">No traffic data.</p>';

    }


    const trafficData =
      document.getElementById(
        'trafficData'
      );

    if (trafficData) {

      trafficData.innerHTML =
        '<p class="muted">API not connected yet.</p>';

    }

  }
}


/* =========================
   ROUTER
========================= */

function route() {

  const id =
    location.hash.slice(1) ||
    'dashboard';


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
        a.getAttribute('href') ===
        '#' + id
      );

    });


  const title =
    document.getElementById(
      'pageTitle'
    );


  if (title) {

    title.textContent =
      id
        .replaceAll('-', ' ')
        .replace(
          /\b\w/g,
          x => x.toUpperCase()
        );

  }
}


/* =========================
   START APP
========================= */

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
