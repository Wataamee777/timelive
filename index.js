const { spawn } = require('child_process');
const http = require('http');
const ffmpeg = require('ffmpeg');

const RTMP_URL = process.env.STREAM_URL;

function startStream() {
    // -11から+12までの時差を自動生成
    const zones = [];
for (let i = -11; i <= 12; i++) {
        const offset = i * 3600;
        const label = `UTC${i >= 0 ? '+' + i : i}`;
        
        const isRight = i > 0;
        const row = isRight ? i - 1 : i + 11;
        const x = isRight ? 700 : 100;
        const y = 60 + (row * 55);

        zones.push(`drawtext=text='${label}':x=${x}:y=${y}:fontsize=30:fontcolor=white`);
        
        // ここを修正：コロンを \\\\: でエスケープする
        zones.push(`drawtext=text='%{gmtime\\:%H\\\\:%M\\\\:%S\\:${offset}}':x=${x + 180}:y=${y}:fontsize=35:fontcolor=yellow`);
    }
    
    // npm経由で入れたffmpegを叩く
    const ffmpeg = spawn('ffmpeg', [
        '-re',
        '-f', 'lavfi',
        '-i', 'color=c=black:s=1280x720:r=30', // 黒背景
        '-vf', zones.join(','),
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-b:v', '2500k',
        '-pix_fmt', 'yuv420p',
        '-f', 'flv',
        RTMP_URL
    ]);

    ffmpeg.stderr.on('data', (data) => console.log(`FFmpeg: ${data}`));
    ffmpeg.on('close', () => setTimeout(startStream, 5000));
}

startStream();

// Renderのスリープ防止用
http.createServer((req, res) => res.end('Streaming World Clock...')).listen(process.env.PORT || 3000);

setInterval(() => {
  fetch('127.0.0.1');
}, 600000);
