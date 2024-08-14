import fetch from 'node-fetch';
import { load } from 'cheerio';

import express from 'express';
import cors from 'cors';

const domain = '';

function range(size, startAt = 0) {
    return [...Array(size).keys()].map(i => i + startAt);
}

const durationStringToFloat = async (timeString) => {
    // Extract minutes and seconds from the string
    let minutesMatch = timeString.match(/(\d+)min/);
    let secondsMatch = timeString.match(/(\d+)sec/);

    let minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    let seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

    // Convert to float minutes
    let floatMinutes = minutes + seconds / 60;

    return floatMinutes
}

// function to extract urls
async function extractVideoUrls(url) {
    // Load the HTML content into Cheerio
    const response = await fetch(url);
    const html = await response.text();
    const $ = load(html);

    // Initialize result object
    let result = {
        thumbnailUrl: '',
        contentUrl: '',
        name: '',
        duration: '',
    };

    // Find the script tag with type 'application/ld+json'
    $('script[type="application/ld+json"]').each(function () {
        // Parse the JSON content of the script tag
        const data = JSON.parse($(this).html());

        // Check if the JSON is of the type VideoObject
        if (data['@type'] === 'VideoObject') {

            let thumbnailUrl = ''
            let contentUrl = ''

            try {
                thumbnailUrl = new URL(data.thumbnailUrl[0]);
                contentUrl = new URL(data.contentUrl)

                thumbnailUrl = `${thumbnailUrl.origin}${thumbnailUrl.pathname}`
                contentUrl = `${contentUrl.origin}${contentUrl.pathname}`
            } catch (e) {
                console.error(e);
                throw e;
            }

            // Extract thumbnailUrl and contentUrl
            result.thumbnailUrl = thumbnailUrl
            result.contentUrl = contentUrl;
            result.name = data.name,
                result.duration = data.duration
        }
    });

    return result;
}


async function loadAndParseURL(link) {
    const videosData = [];
    try {
        const response = await fetch(`${domain}${link}`);
        const html = await response.text();
        const $ = load(html);

        const videos = $('div[id^="video_"]');

        videos.find('.metadata span').remove();

        for (const video of videos) {
            const vLength = $(video).find('.metadata').text().trim();
            if (await durationStringToFloat(vLength) > 5) {
                continue;
            }

            const videoPageLink = $(video).find('.thumb-inside .thumb a').attr('href');

            const videoData = await extractVideoUrls(`${domain}${videoPageLink}`);

            videosData.push(videoData);
        }

    } catch (error) {
        console.error('Error fetching or parsing:', error);

        throw e;
    }

    return videosData;
}

async function parsePagination(link) {
    let links = [];
    let totalLinks = 0;

    try {
        const response = await fetch(`${domain}${link}`);
        const html = await response.text();
        const $ = load(html);

        // Use the cheerio selectors in a similar way to jQuery to find your links
        const paginationLinks = $('.pagination:nth(0) ul li a:not(.no-page)'); // Change this to match your selector

        totalLinks = paginationLinks.last().text();
        links = range(parseInt(totalLinks)).map((l) => {
            return l === 0 ? link : `${link}/${l}`;
        });
    } catch (error) {
        console.error('Error fetching or parsing:', error);
        throw e;
    }

    return links
}

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/search', async (req, res) => {
    const query = req.query?.query || '';

    if (!query) {
        return res.status(400).json({
            message: 'Query cannot be empty.'
        });
    }

    try {
        const links = await parsePagination(`/search/0-10min/${query}`);

        if (!links?.length) {
            return res.status(404);
        }

        const link = links[0];

        return res.status(200).json({
            links,
            link,
            data: await loadAndParseURL(link)
        });
    } catch (e) {
        return res.status(500).json({
            message: `Internal error.`
        });
    }
});

app.get('/load-page', async (req, res) => {
    const page = req.query?.page || '';

    if (!page) {
        return res.status(400).json({
            message: 'Missing page to load.'
        });
    }

    try {
        return res.status(200).json({
            data: await loadAndParseURL(page)
        });
    } catch (e) {
        return res.status(500).json({
            message: `Internal error.`
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

