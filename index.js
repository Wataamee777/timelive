const { spawn } = require('child_process');
const http = require('http');

// Renderの管理画面「Environment」で STREAM_URL を設定してください
const RTMP_URL = process.env.RTMP_URL;

function startStream() {
    if (!RTMP_URL) {
        console.error("Error: STREAM_URL is not set in Render Environment Variables.");
        return;
    }

    const zones = [];
    for (let i = -11; i <= 12; i++) {
        const offset = i * 3600;
        const label = `UTC${i >= 0 ? '+' + i : i}`;
        const isRight = i > 0;
        const row = isRight ? i - 1 : i + 11;
        const x = isRight ? 700 : 100;
        const y = 60 + (row * 55);

        zones.push(`drawtext=text='${label}':x=${x}:y=${y}:fontsize=30:fontcolor=white`);
        // Termuxで成功したエスケープ形式を反映
        zones.push(`drawtext=text='%{gmtime\\:%H\\\\:%M\\\\:%S\\:${offset}}':x=${x + 180}:y=${y}:fontsize=35:fontcolor=yellow`);
    }

    // 成功したコマンドのパラメータを全投入
    const args = [
        '-re',
        '-f', 'lavfi',
        '-i', 'color=c=black:s=1280x720:r=30',
        '-vf', zones.join(','),
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', '3000k',
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p',
        '-g', '60',
        '-f', 'flv',
        RTMP_URL
    ];

    console.log("Render上で配信を開始します...");
    const child = spawn('ffmpeg', args);

    child.stderr.on('data', (data) => {
        const msg = data.toString();
        // 接続維持のためにログを少し出す
        if (msg.includes('frame=') && Math.random() < 0.01) { // ログ溢れ防止
            console.log(msg.trim());
        }
        if (msg.includes('Error')) console.log("FFmpeg Error:", msg);
    });

    child.on('close', (code) => {
        console.log(`FFmpeg終了 (code ${code})。5秒後に再起動。`);
        setTimeout(startStream, 5000);
    });
}

startStream();

// Renderのポート開放
http.createServer((req, res) => res.end('Streaming Running')).listen(process.env.PORT || 3000);
