chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "matchCV") {
    const requestData = {
      cv: JSON.stringify(request.data.cv),
      job: JSON.stringify(request.data.jobDescription)
    };

    fetch('https://your-service-name-47779369171.me-west1.run.app/matchJobCv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    })
    .then(blob => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    })
    .then(dataUrl => {
      sendResponse({success: true, data: dataUrl});
    })
    .catch(error => {
      console.error('Error:', error);
      sendResponse({success: false, error: error.message});
    });

    return true;  // Keeps the message channel open for asynchronous response
  }
});

// Optionally, add an installation event listener to initialize the extension
chrome.runtime.onInstalled.addListener(function() {
  console.log('Extension installed');
  // You can add any initialization logic here
});

// Add an unload event listener to perform cleanup if necessary
chrome.runtime.onSuspend.addListener(function() {
  console.log('Extension being unloaded');
  // Perform any necessary cleanup here
});