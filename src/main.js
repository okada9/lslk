#!/usr/bin/env node

const puppeteer = require("puppeteer");
const { URL } = require("node:url");
const { Command } = require("commander");

const visitedUrls = new Set();
const printedUrls = new Set();
const urlQueue = [];

async function delay(sec) {
	return new Promise((resolve) => setTimeout(resolve, sec * 1000));
}

async function fetchUrls(
	page,
	url,
	entryUrl,
	allowedPattern,
	disallowedPattern,
	currentDepth,
	maxDepth,
	options,
) {
	if (visitedUrls.has(url) || currentDepth > maxDepth) return;

	visitedUrls.add(url);

	if (maxDepth > 1) {
		console.error(`Visiting: ${url} (depth: ${currentDepth})`);
	} else {
		console.error(`Visiting: ${url}`);
	}

	try {
		const response = await page.goto(url, { waitUntil: "networkidle0" });

		if (response && response.status() !== 200) {
			console.warn(`Warning: ${url} returned status ${response.status()}`);
		}

		const links = await extractLinks(
			page,
			url,
			entryUrl,
			allowedPattern,
			disallowedPattern,
			options.sameHost,
			options.children,
		);

		for (const link of links) {
			if (!printedUrls.has(link)) {
				printedUrls.add(link);
				console.log(link);
			}
		}

		if (currentDepth < maxDepth) {
			for (const link of links) {
				urlQueue.push({ link, entry: entryUrl, depth: currentDepth + 1 });
			}
		}
	} catch (error) {
		console.error(`Failed to fetch ${url}: ${error.message}`);
	}
}

async function extractLinks(
	page,
	baseUrl,
	entryUrl,
	allowedPattern,
	disallowedPattern,
	sameHost,
	children,
) {
	const links = new Set();
	const entry = new URL(entryUrl);
	const entryPath = entry.pathname.endsWith("/")
		? entry.pathname
		: `${entry.pathname}/`;

	const anchors = await page.$$eval("a", (elements) =>
		elements.map((el) => el.href).filter((href) => href),
	);

	for (const href of anchors) {
		try {
			const absoluteUrl = new URL(href, baseUrl).href.split("#")[0];

			const isAllowed = allowedPattern
				? absoluteUrl.match(allowedPattern)
				: true;
			const isDisallowed = disallowedPattern
				? absoluteUrl.match(disallowedPattern)
				: false;

			const urlObj = new URL(absoluteUrl);
			const isSameHost = sameHost ? urlObj.host === entry.host : true;
			const isChild = children
				? urlObj.host === entry.host && urlObj.pathname.startsWith(entryPath)
				: true;

			if (
				isAllowed &&
				!isDisallowed &&
				!visitedUrls.has(absoluteUrl) &&
				isSameHost &&
				isChild
			) {
				links.add(absoluteUrl);
			}
		} catch (e) {
			// Ignore invalid URLs
		}
	}

	return links;
}

async function listUrls(
	entryUrls,
	allowedPattern,
	disallowedPattern,
	delaySec,
	maxDepth,
	options,
) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.setRequestInterception(true);

	page.on("request", (request) => {
		const resourceTypesToBlock = ["font", "image", "media", "stylesheet"];

		if (resourceTypesToBlock.includes(request.resourceType())) {
			request.abort();
		} else {
			request.continue();
		}
	});

	page.setUserAgent(
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
		(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
	);

	if (options.disableJavascript) {
		await page.setJavaScriptEnabled(false);
	}

	for (const entryUrl of entryUrls) {
		urlQueue.push({ link: entryUrl, entry: entryUrl, depth: 1 });
	}

	while (urlQueue.length > 0) {
		const {
			link: currentUrl,
			entry: currentEntryUrl,
			depth: currentDepth,
		} = urlQueue.shift();

		await fetchUrls(
			page,
			currentUrl,
			currentEntryUrl,
			allowedPattern,
			disallowedPattern,
			currentDepth,
			maxDepth,
			options,
		);

		if (urlQueue.length > 0 && delaySec > 0) {
			await delay(delaySec);
		}
	}

	await browser.close();
}

const program = new Command();

program
	.version("0.1.0")
	.arguments("<urls...>")
	.option("--same-host", "only follow links on the same host", false)
	.option(
		"--children",
		"only follow links whose path is a child of the entry URL",
		false,
	)
	.option("--allow <pattern>", "regex pattern for allowed URLs")
	.option("--disallow <pattern>", "regex pattern for disallowed URLs")
	.option(
		"--delay <seconds>",
		"time to wait between requests (default: 0)",
		Number.parseInt,
	)
	.option(
		"--depth <number>",
		"maximum depth of URL search (default: 1)",
		Number.parseInt,
	)
	.option("--disable-javascript", "do not run JavaScript", false)
	.action((urls) => {
		const options = program.opts();

		if (urls.length === 0) {
			console.error("Please provide an entry URL.");
			process.exit(1);
		}

		const allowedPattern = options.allow;

		const disallowedPattern = options.disallow;

		const delaySec = options.delay ?? 0;

		const maxDepth = options.depth ?? 1;

		listUrls(
			urls,
			allowedPattern,
			disallowedPattern,
			delaySec,
			maxDepth,
			options,
		).catch((error) => console.error(`${error.message}`));
	});

program.parse(process.argv);
