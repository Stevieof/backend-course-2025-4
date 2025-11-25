const http = require("http");
const path = require("path");
const fs = require("fs");
const { Command } = require("commander");
const { XMLBuilder } = require("fast-xml-parser");

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

async function loadCars() {
    const raw = await fs.promises.readFile(INPUT, "utf-8");
    const lines = raw.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => JSON.parse(line));
}

function filterCars(cars, maxMpg) {
    let result = cars;

    if (!isNaN(maxMpg)) {
        result = result.filter(car => typeof car.mpg === "number" && car.mpg < maxMpg);
    }

    return result;
}

const xmlBuilder = new XMLBuilder({ format: true });

function buildXml(cars, showCylinders) {
    const xmlCars = cars.map(car => {
        const obj = {
            model: car.model,
            mpg: car.mpg,
        };

        if (showCylinders) obj.cyl = car.cyl;

        return obj;
    });

    return xmlBuilder.build({
        cars: { car: xmlCars }
    });
}

function startServer() {
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${HOST}:${PORT}`);

        const showCylinders = url.searchParams.get("cylinders") === "true";
        const maxMpg = url.searchParams.get("max_mpg");

        try {
            const cars = await loadCars();
            const filtered = filterCars(cars, Number(maxMpg));
            const xml = buildXml(filtered, showCylinders);

            res.writeHead(200, { "Content-Type": "application/xml" });
            res.end(xml);
        } catch (e) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
        }
    });

    server.listen(PORT, HOST, () => {
        console.log(`Server running at http://${HOST}:${PORT}`);
    });
}
