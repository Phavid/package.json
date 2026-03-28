const { Telegraf } = require('telegraf');
const axios = require('axios');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ==========================================
// ១. ការកំណត់ព័ត៌មាន (បងអាចប្តូរនៅទីនេះ)
// ==========================================
const TELEGRAM_TOKEN = "6579258540:AAEnRQACdoJjqwCu8ttTEyQ6bnHE3qd6awg";
const CHAT_ID = "-1001325523657";
const GEMINI_API_KEY = "AIzaSyA1TN2KmFm9pMxVLHCzSDcc4aTi-wIKL78";

const bot = new Telegraf(TELEGRAM_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// មុខងារទាញទិន្នន័យថ្ងៃខែខ្មែរពី API
async function getKhmerDate(date) {
    try {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const res = await axios.get(`https://khmerlunar.com/api/v1/date?year=${y}&month=${m}&day=${d}`);
        return res.data;
    } catch (e) {
        console.error("Error fetching Khmer Date");
        return null;
    }
}

// ==========================================
// ២. មុខងារផ្ញើសារបើកគ្រុប (ម៉ោង ៦:០០ ព្រឹក)
// ==========================================
cron.schedule('0 6 * * *', async () => {
    const now = new Date();
    const data = await getKhmerDate(now);
    
    let silStatus = "";
    let holidayStatus = "";
    let lunarDetail = "";

    if (data) {
        lunarDetail = `🌙 ${data.dayOfWeek} ${data.lunarDay} ${data.lunarMonth} ${data.animalYear}\n`;
        const silDays = ["៨ កើត", "១៥ កើត", "៨ រោច", "១៤ រោច", "១៥ រោច"];
        if (silDays.some(day => data.lunarDay.includes(day))) {
            silStatus = "🙏 <b>ថ្ងៃនេះ គឺជាថ្ងៃសីល</b>\n";
        }
        if (data.holiday) holidayStatus = `🎊 <b>ថ្ងៃឈប់សម្រាក៖ ${data.holiday}</b>\n`;
    }

    const message = `👋 <b>សួស្តីបងប្អូនសមាជិកគ្រុបទាំងអស់គ្នា!</b>\n\n` +
                    `⏰ វេលាម៉ោង <b>6:00 ព្រឹក</b> ថ្ងៃទី ${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}\n` +
                    lunarDetail +
                    `--------------------------\n` +
                    silStatus + holidayStatus +
                    `🔓 <b>គ្រុបយើងចាប់ផ្ដើមដំណើរការហើយ!</b>\n` +
                    `សូមរីករាយ និងជជែកកម្សាន្តទាក់ទងនឹងបច្ចេកវិទ្យា។ 🙏`;

    bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
    
    // ឆែកថ្ងៃសីលស្អែក
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const nextData = await getKhmerDate(tomorrow);
    if (nextData && ["៨ កើត", "១៥ កើត", "៨ រោច", "១៤ រោច", "១៥ រោច"].some(d => nextData.lunarDay.includes(d))) {
        bot.telegram.sendMessage(CHAT_ID, `🔔 <b>ដំណឹង៖</b> ថ្ងៃស្អែកគឺជា <b>ថ្ងៃសីល (${nextData.lunarDay})</b> សូមបងប្អូនជ្រាបជាព័ត៌មាន។ 🙏`, { parse_mode: 'HTML' });
    }
}, { timezone: "Asia/Phnom_Penh" });

// ==========================================
// ៣. មុខងារផ្ញើសារបិទគ្រុប (ម៉ោង ១០:០០ យប់)
// ==========================================
cron.schedule('0 22 * * *', () => {
    const message = `🌕 <b>រាត្រីសួស្ដីបងប្អូនទាំងអស់គ្នា!</b>\n\n` +
                    `⏰ នៅវេលាថ្មើរនេះ គ្រុបយើងដល់ម៉ោងសម្រាកហើយ។\n` +
                    `💤 សូមសម្រាកឱ្យបានស្កប់ស្កល់ និងជួបគ្នានៅថ្ងៃស្អែក។ សូមអរគុណ!`;
    bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
}, { timezone: "Asia/Phnom_Penh" });

// ==========================================
// ៤. មុខងារ AI ឆ្លើយសំណួរបច្ចេកវិទ្យា
// ==========================================
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const techKeywords = ["ទូរសព្ទ", "កុំព្យូទ័រ", "របៀប", "iphone", "android", "windows", "mac", "it", "phone", "ទាញយក", "password"];
    
    const isTech = techKeywords.some(k => text.toLowerCase().includes(k.toLowerCase()));

    if (isTech) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a helpful tech assistant. Answer this briefly in Khmer: ${text}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            ctx.reply(response.text(), { reply_to_message_id: ctx.message.message_id });
        } catch (e) {
            console.error("Gemini Error");
        }
    }
});

// បើក Bot
bot.launch().then(() => console.log("Bot ដំណើរការលើ Render រួចរាល់!"));

// បិទ Bot ដោយសុវត្ថិភាព
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
