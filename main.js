const http = require("http");
const path = require("path");
const fs = require("fs");
const { Command } = require("commander");
const { XMLBuilder } = require("fast-xml-parser");

// ------------------------------
// 1. Параметри командного рядка
// ------------------------------

const program = new Command();

program
    .name("backend-course-2025-4")
    .description("Lab 4 HTTP server (variant 5 - mtcars)")
    .requiredOption("-i, --input <path>", "path to input JSON file")
    .requiredOption("-h, --host <host>", "server host")
    .requiredOption("-p, --port <port>", "server port");

program.parse(process.argv);
const opts = program.opts();

const INPUT = path.resolve(opts.input);
const HOST = opts.host;
const PORT = Number(opts.port);

// файл, куди будемо зберігати останню XML-відповідь (щоб використати writeFile)
const OUTPUT_XML = path.resolve("last-response.xml");

// --------------------------------------
// 2. Перевірка наявності вхідного файлу
// --------------------------------------

fs.promises
    .access(INPUT, fs.constants.R_OK)
    .catch(() => {
        // текст помилки строго як у завданні
        console.error("Cannot find input file");
        process.exit(1);
    })
    .then(() => {
        startServer();
    });

// --------------------------------------
// 3. Допоміжні функції: читання та фільтр
// --------------------------------------

/**
 * Асинхронно читає mtcars.json.
 * У файлі кожен рядок – окремий JSON-об’єкт.
 */
async function loadCars() {
    const raw = await fs.promises.readFile(INPUT, "utf-8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    return lines.map((line) => JSON.parse(line));
}

/**
 * Фільтрує авто за max_mpg:
 *  - якщо maxMpg = NaN → повертаємо всі авто (без фільтра)
 *  - інакше → лишаємо лише ті, в яких mpg < maxMpg
 */
function filterCars(cars, maxMpg) {
    if (Number.isNaN(maxMpg)) {
        return cars;
    }

    return cars.filter(
        (car) => typeof car.mpg === "number" && car.mpg < maxMpg
    );
}

// --------------------------------------
// 4. Підготовка XML-білдера
// --------------------------------------

const xmlBuilder = new XMLBuilder({
    ignoreAttributes: false,
    format: true, // красиве форматування
});

/**
 * Формує структуру XML відповідно до варіанта 5:
 *   <cars>
 *     <car>
 *       <model>...</model>
 *       <cyl>...</cyl>    // якщо cylinders=true
 *       <mpg>...</mpg>
 *     </car>
 *   </cars>
 */
function buildCarsXml(cars, showCylinders) {
    const carNodes = cars.map((car) => {
        const node = {
            model: car.model,
            mpg: car.mpg,
        };

        if (showCylinders) {
            node.cyl = car.cyl;
        }

        return node;
    });

    const xmlObj = {
        cars: {
            car: carNodes,
        },
    };

    return xmlBuilder.build(xmlObj);
}

// --------------------------------------
// 5. HTTP-сервер: обробка запитів
// --------------------------------------

function startServer() {
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, `http://${HOST}:${PORT}`);

        // ?cylinders=true
        const showCylinders = url.searchParams.get("cylinders") === "true";

        // ?max_mpg=X
        const maxMpgParam = url.searchParams.get("max_mpg");
        const maxMpg =
            maxMpgParam !== null && maxMpgParam !== ""
                ? Number(maxMpgParam)
                : NaN;

        try {
            // 1. Читаємо JSON з файлу (асинхронно)
            const cars = await loadCars();

            // 2. Фільтруємо за mpg (якщо max_mpg заданий)
            const filteredCars = filterCars(cars, maxMpg);

            // 3. Формуємо XML
            const xml = buildCarsXml(filteredCars, showCylinders);

            // 4. Додатково зберігаємо XML у файл (writeFile згідно з вимогами)
            await fs.promises.writeFile(OUTPUT_XML, xml, "utf-8");

            // 5. Надсилаємо XML-клієнту
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/xml; charset=utf-8");
            res.end(xml);
        } catch (err) {
            console.error("Server error:", err);

            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("Internal Server Error");
        }
    });

    server.listen(PORT, HOST, () => {
        console.log(`Server is listening on http://${HOST}:${PORT}`);
    });
}
