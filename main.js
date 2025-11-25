const http = require("http");
const path = require("path");
const fs = require("fs");
const { Command } = require("commander");

const program = new Command();

program
    .requiredOption("-i, --input <path>", "path to input JSON file")
    .requiredOption("-h, --host <host>", "server host")
    .requiredOption("-p, --port <port>", "server port");

program.parse(process.argv);
const opts = program.opts();

const INPUT = path.resolve(opts.input);
const HOST = opts.host;
const PORT = Number(opts.port);

fs.access(INPUT, fs.constants.R_OK, (err) => {
    if (err) {
        console.error("Cannot find input file");
        process.exit(1);
    } else {
        startServer();
    }
});

// --- NEW PART FOR COMMIT 4 ---
async function loadCars() {
    const raw = await fs.promises.readFile(INPUT, "utf-8");
    const lines = raw.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => JSON.parse(line));
}
// --------------------------------

function startServer() {
    const server = http.createServer(async (req, res) => {
        // test JSON reading
        try {
            const cars = await loadCars();

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "OK", loaded: cars.length }));
        } catch (e) {
            res.writeHead(500);
            res.end("Error loading JSON");
        }
    });

    server.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
    });
}
