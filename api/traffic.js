// api/traffic.js

const sentTrafficIds = new Set();
const MAX_CACHE_SIZE = 5000;

function getCountry(row) {
  const range = String(row.rangeName || "").toLowerCase();
  const number = String(row.destinationNumber || "");

  if (range.includes("pakistan") || number.startsWith("92")) return "PK";
  if (range.includes("indonesia") || number.startsWith("62")) return "ID";
  if (range.includes("india") || number.startsWith("91")) return "IN";
  if (range.includes("bangladesh") || number.startsWith("880")) return "BD";
  if (range.includes("thailand") || number.startsWith("66")) return "TH";
  if (range.includes("sierra leone") || number.startsWith("232")) return "SL";
  if (range.includes("benin") || number.startsWith("229")) return "BJ";

  return "UN";
}

function maskNumber(number) {
  if (!number) return "-";

  const value = String(number);

  if (value.length <= 7) {
    return value;
  }

  return (
    value.slice(0, 4) +
    "****" +
    value.slice(-3)
  );
}

function escapeTelegram(text) {
  return String(text ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateTime(date) {
  if (!date) {
    return {
      date: "-",
      time: "-"
    };
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return {
      date: "-",
      time: "-"
    };
  }

  return {
    date: d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Jakarta"
    }),

    time: d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta"
    })
  };
}

async function sendTelegram(row) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const chatId =
    process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "Telegram ENV belum dikonfigurasi."
    );

    return false;
  }

  const country =
    getCountry(row);

  const messageBody =
    String(row.messageBody || "-");

  const number =
    maskNumber(row.destinationNumber);

  const dateTime =
    formatDateTime(row.receivedAt);

  const message = [
    `🔔 <b>${escapeTelegram(country)} • ${escapeTelegram(sender)}</b>`,
    "",
    `📅 ${escapeTelegram(dateTime.date)}`,
    `🕐 ${escapeTelegram(dateTime.time)}`,
    "",
    `📱 Number: <code>${escapeTelegram(number)}</code>`,
    `📋 OTP: <b>${escapeTelegram(messageBody)}</b>`
  ].join("\n");

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: "OTP NICH",
          copy_text: {
            text: messageBody
          }
        }
      ]
    ]
  };

  const telegramUrl =
    `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(
    telegramUrl,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
        disable_web_page_preview: true
      })
    }
  );

  if (!response.ok) {
    const error =
      await response.text();

    console.error(
      "Telegram error:",
      response.status,
      error
    );

    return false;
  }

  return true;
}

function getTrafficId(row) {
  if (row.id) {
    return String(row.id);
  }

  return [
    row.receivedAt || "",
    row.destinationNumber || "",
    row.messageBody || "",
    row.rangeName || ""
  ].join("-");
}

function rememberTraffic(id) {
  sentTrafficIds.add(id);

  if (
    sentTrafficIds.size >
    MAX_CACHE_SIZE
  ) {
    const oldest =
      sentTrafficIds
        .values()
        .next()
        .value;

    if (oldest) {
      sentTrafficIds.delete(oldest);
    }
  }
}

export default async function handler(req, res) {

  /*
   * Hanya GET
   */

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const base =
      process.env.API_BASE_URL;

    const key =
      process.env.API_KEY;

    if (!base || !key) {
      return res.status(503).json({
        error:
          "API environment variables are not configured"
      });
    }

    const url =
      base.replace(/\/$/, "") +
      "/api/v1/traffic";

    /*
     * Request ke provider
     */

    const providerResponse =
      await fetch(url, {
        method: "GET",

        headers: {
          "Authorization":
            `Bearer ${key}`,

          "Accept":
            "application/json"
        }
      });

    const text =
      await providerResponse.text();

    /*
     * Parse JSON
     */

    let data;

    try {
      data =
        JSON.parse(text);
    } catch {

      return res.status(502).json({
        error:
          "Provider returned invalid JSON",

        status:
          providerResponse.status,

        response:
          text.slice(0, 500)
      });
    }

    /*
     * Kalau provider error,
     * jangan kirim Telegram.
     */

    if (!providerResponse.ok) {
      return res
        .status(providerResponse.status)
        .json(data);
    }

    /*
     * Ambil rows
     */

    const rows =
      Array.isArray(data.rows)
        ? data.rows
        : [];

    /*
     * Kirim traffic baru
     * ke Telegram.
     *
     * OTP / messageBody
     * TIDAK dikirim.
     */

    for (const row of rows) {

      const trafficId =
        getTrafficId(row);

      /*
       * Sudah pernah dikirim?
       */

      if (
        sentTrafficIds.has(
          trafficId
        )
      ) {
        continue;
      }

      try {

        const sent =
          await sendTelegram(row);

        /*
         * Hanya tandai sebagai
         * terkirim kalau Telegram
         * benar-benar berhasil.
         */

        if (sent) {
          rememberTraffic(
            trafficId
          );
        }

      } catch (telegramError) {

        console.error(
          "Telegram request failed:",
          telegramError.message
        );

      }
    }

    /*
     * Response tetap dikirim
     * ke frontend seperti biasa.
     */

    return res
      .status(providerResponse.status)
      .json(data);

  } catch (error) {

    console.error(
      "Traffic API error:",
      error
    );

    return res.status(500).json({
      error:
        "Provider request failed",

      details:
        error.message
    });
  }
    }
