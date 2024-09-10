console.log('Content script loaded and executing');

let isReady = false;

function scrapeJobDescription() {
  const possibleSelectors = [
    '.description__text',
    '.job-description',
    '#job-description',
    '[data-test="job-description"]',
    'div[class*="description"]',
    'div[id*="description"]',
    // New LinkedIn-specific selectors
    '.show-more-less-html__markup',
    '[data-testid="job-details"]',
    '.jobs-description__content',
    '.jobs-box__html-content',
    '.jobs-description-content__text'
  ];

  for (const selector of possibleSelectors) {
    console.log(`Trying selector: ${selector}`);
    const element = document.querySelector(selector);
    if (element) {
      console.log('Found job description element:', element);
      // Check if the content is substantial
      const text = element.innerText.trim();
      if (text.length > 100) {  // Arbitrary threshold, adjust as needed
        console.log('Found substantial job description');
        return text;
      } else {
        console.log('Found element but content too short, continuing search');
      }
    }
  }

  console.log('Could not find job description with any selector');
  return null;
}

function handleScrapeRequest(sendResponse) {
  console.log('Handling scrape request');
  const jobDescription = scrapeJobDescription();

  if (jobDescription) {
    try {
    console.log('Scraped job description:', jobDescription.substring(0, 100) + '...');
    sendResponse({success: true, data: jobDescription});
} catch (error) {
    sendResponse({success: false, error: error.message});
  }
  } else {
    console.log('Failed to scrape job description');
    sendResponse({success: false, error: "Could not find job description"});
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message in content script:', request);
  if (request.action === "scrape") {
    console.log('Scrape action received');
    if (isReady) {
      handleScrapeRequest(sendResponse);
    } else {
      console.log('Page not ready, waiting for load event');
      window.addEventListener('load', () => {
        console.log('Page loaded, now scraping');
        handleScrapeRequest(sendResponse);
      }, { once: true });
    }
    return true;  // Keeps the message channel open for asynchronous response
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  isReady = true;
});

// Fallback in case DOMContentLoaded has already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('DOM already loaded');
  isReady = true;
}

console.log('Content script finished executing');