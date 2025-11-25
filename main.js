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

function startServer() {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("Server is running...");
    });

    server.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
    });
}
