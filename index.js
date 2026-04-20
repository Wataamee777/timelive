const { spawn } = require('child_process');
const http = require('http');

const RTMP_URL = process.env.RTMP_URL;

function startStream() {
    if (!RTMP_URL) return console.error("STREAM_URL is empty");

    const zones = [];
    // RenderのUbuntu標準フォントパスを指定
    const fontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";

    for (let i = -11; i <= 12; i++) {
        const offset = i * 3600;
        const label = `UTC${i >= 0 ? '+' + i : i}`;
        const isRight = i > 0;
        const row = isRight ? i - 1 : i + 11;
        const x = isRight ? 700 : 100;
        const y = 60 + (row * 55);

        // fontfileを指定して、エスケープをさらに慎重に行う
        zones.push(`drawtext=fontfile='${fontPath}':text='${label}':x=${x}:y=${y}:fontsize=30:fontcolor=white`);
        zones.push(`drawtext=fontfile=${fontPath}:text='''%{gmtime\\:%H\\\\\\:%M\\\\\\:%S\\:${offset}}''':x=${x + 180}:y=${y}:fontsize=35:fontcolor=yellow`);

    }

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

    console.log("Starting FFmpeg on Render...");
    const child = spawn('ffmpeg', args);

    child.stderr.on('data', (data) => {
        const msg = data.toString();
        // ログが多すぎるとRenderが重くなるので、エラーだけ表示
        if (msg.includes('Error') || msg.includes('font')) {
            console.log("FFmpeg Log:", msg);
        }
    });

    child.on('close', (code) => {
        console.log(`FFmpeg closed (code ${code}). Restarting...`);
        setTimeout(startStream, 5000);
    });
}

startStream();
http.createServer((req, res) => res.end('Live')).listen(process.env.PORT || 3000);
