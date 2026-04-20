const { spawn } = require('child_process');
const http = require('http');

// 1. 変数名を整理（npmのffmpegは使わないのでrequireも削除）
const RTMP_URL = process.env.RTMP_URL; 

function startStream() {
    if (!RTMP_URL) {
        console.error("Error: STREAM_URL is empty. Check Render's Environment Variables.");
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
        // 2. エスケープを修正 (\\\\\\: にすることで、FFmpeg側へ \\: として伝わる)
        zones.push(`drawtext=text='%{gmtime\\:%H\\\\\\:%M\\\\\\:%S\\:${offset}}':x=${x + 180}:y=${y}:fontsize=35:fontcolor=yellow`);
    }

    // 3. spawnの左辺を childProcess などに変更して衝突を避ける
    console.log("Connecting to:", RTMP_URL);
    const childProcess = spawn('ffmpeg', [
        '-re',
        '-f', 'lavfi',
        '-i', 'color=c=black:s=1280x720:r=30',
        '-vf', zones.join(','),
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', '2500k',
        '-pix_fmt', 'yuv420p',
        '-f', 'flv',
        RTMP_URL
    ]);

    childProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('Error')) console.log(`FFmpeg Error: ${msg}`);
    });

    childProcess.on('close', (code) => {
        console.log(`FFmpeg closed (code ${code}). Restarting...`);
        setTimeout(startStream, 5000);
    });
}

startStream();

http.createServer((req, res) => res.end('Streaming...')).listen(process.env.PORT || 3000);
