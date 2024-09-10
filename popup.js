let jobDescription = '';
let uploadedCV = '';

const uploadCVButton = document.getElementById('uploadCVButton');
const scrapeButton = document.getElementById('scrapeButton');
const matchButton = document.getElementById('matchButton');
const resultDiv = document.getElementById('result');
const cvDisplay = document.getElementById('cvDisplay');
const reloadButton = document.getElementById('reloadButton');

document.addEventListener('DOMContentLoaded', initPopup);
uploadCVButton.addEventListener('click', handleUploadCV);
scrapeButton.addEventListener('click', handleScrapeClick);
matchButton.addEventListener('click', handleMatchClick);
reloadButton.addEventListener('click', reloadUi);

function initPopup() {
  chrome.storage.local.get(['jobDescription', 'uploadedCV'], function(result) {
    if (chrome.runtime.lastError) {
      console.error('Error loading data from storage:', chrome.runtime.lastError);
      resultDiv.textContent = 'Error loading saved data.';
    } else {
      jobDescription = result.jobDescription || '';
      uploadedCV = result.uploadedCV || '';
      updateUI();
    }
  });
}

function handleUploadCV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf';
  
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        extractTextFromPDF(arrayBuffer)
          .then(() => {
            resultDiv.textContent = 'CV uploaded and text extracted successfully!';
            updateUI();
          })
          .catch(error => {
            console.error('Error processing PDF:', error);
            resultDiv.textContent = 'Error processing PDF: ' + error.message;
          });
      };
      reader.onerror = function(e) {
        console.error('Error reading file:', e);
        resultDiv.textContent = 'Error reading file.';
      };
      reader.readAsArrayBuffer(file);
    }
  };
  
  input.click();
}

function extractTextFromPDF(arrayBuffer) {
  return new Promise((resolve, reject) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.js');
    
    pdfjsLib.getDocument({data: arrayBuffer}).promise.then(function(pdf) {
      let promises = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        promises.push(pdf.getPage(i).then(page => page.getTextContent()));
      }
      
      return Promise.all(promises);
    }).then(function(contents) {
      const textContent = contents
        .flatMap(content => content.items.map(item => item.str))
        .join(' ');
      
      uploadedCV = textContent;
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({uploadedCV: uploadedCV}, function() {
          if (chrome.runtime.lastError) {
            reject(new Error('Error saving to chrome.storage: ' + chrome.runtime.lastError.message));
          } else {
            console.log('Extracted and saved text from PDF');
            resolve();
          }
        });
      });
    }).then(resolve).catch(reject);
  });
}

function handleScrapeClick() {
  console.log('Scrape button clicked');
  resultDiv.textContent = 'Scraping...';
  
  function scrapeWithRetry(retries = 3) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "scrape"}, function(response) {
          if (chrome.runtime.lastError) {
            console.warn('Scraping error:', chrome.runtime.lastError);
            if (retries > 0) {
              console.log(`Retrying... (${retries} attempts left)`);
              setTimeout(() => scrapeWithRetry(retries - 1), 1000);
            } else {
              console.error('Max retries reached');
              resultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
            }
            return;
          }
          if (response && response.success) {
            jobDescription = response.data;
            chrome.storage.local.set({jobDescription: jobDescription}, function() {
              if (chrome.runtime.lastError) {
                console.error('Error saving job description:', chrome.runtime.lastError);
                resultDiv.textContent = 'Error saving job description.';
              } else {
                resultDiv.textContent = 'Job description scraped and saved successfully!';
                updateUI();
              }
            });
          } else {
            resultDiv.textContent = 'Failed to scrape job description.';
          }
        });
      } else {
        console.error('No active tab found');
        resultDiv.textContent = 'Error: No active tab found';
      }
    });
  }

  scrapeWithRetry();
}

function handleMatchClick() {
  if (!jobDescription) {
    resultDiv.textContent = 'Please scrape a job description first.';
    return;
  }
  
  if (!uploadedCV) {
    resultDiv.textContent = 'Please upload a CV first.';
    return;
  }
  
  resultDiv.textContent = 'Matching CV...';
  chrome.runtime.sendMessage({
    action: "matchCV",
    data: {
      cv: uploadedCV,
      jobDescription: jobDescription
    }
  }, function(response) {
    if (chrome.runtime.lastError) {
      resultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
    } else if (response && response.success) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `matched_cv_${timestamp}.pdf`;

      const a = document.createElement('a');
      a.href = response.data;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      resultDiv.textContent = 'Your CV was downloaded successfully!';
      updateUI();
    } else {
      resultDiv.textContent = 'Failed to match CV: ' + (response ? response.error : 'Unknown error');
    }
  });
}

function updateUI() {
  uploadCVButton.disabled = !!uploadedCV;
  scrapeButton.disabled = !!jobDescription;
  matchButton.disabled = !jobDescription || !uploadedCV;
  cvDisplay.textContent = uploadedCV ? 'CV uploaded, ready to match.' : 'No CV uploaded yet.';
}

function reloadUi() {
  jobDescription = '';
  uploadedCV = '';

  chrome.storage.local.set({jobDescription: jobDescription, uploadedCV: uploadedCV}, function() {
    if (chrome.runtime.lastError) {
      console.error('Error clearing data:', chrome.runtime.lastError);
      resultDiv.textContent = 'Error clearing data.';
    } else {
      resultDiv.textContent = 'Data cleared successfully.';
      updateUI();
    }
  });
}