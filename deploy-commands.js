const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const path = require('path');

// 1. Cấu hình dotenv trỏ thẳng vào file .env trong cùng thư mục
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// 2. Kiểm tra biến môi trường trước khi chạy
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
    console.error("❌ ERROR: Missing TOKEN or CLIENT_ID in .env file!");
    console.log("Check if your .env file exists in: " + __dirname);
    process.exit(1);
}

// 3. Định nghĩa lệnh /countdown
const commands = [
    new SlashCommandBuilder()
        .setName('countdown')
        .setDescription('Start the Irene Countdown Timer (Whiteout Survival)'),
].map(command => command.toJSON());

// 4. Khởi tạo REST client
const rest = new REST({ version: '10' }).setToken(token);

// 5. Triển khai (Deploy)
(async () => {
    try {
        console.log(`⏳ Started refreshing ${commands.length} application (/) commands...`);

        // Đẩy lệnh Global (Sẽ dùng được ở TẤT CẢ các Server mà Bot tham gia)
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`✅ SUCCESS: Registered ${data.length} commands globally!`);
        console.log(`💡 Note: It may take a few minutes for Discord to update the command list.`);
        
        process.exit(0);
    } catch (error) {
        console.error("❌ DEPLOY ERROR:");
        console.error(error);
        process.exit(1);
    }
})();