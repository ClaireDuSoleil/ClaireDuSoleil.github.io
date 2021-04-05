/// Content wrapper element
let contentElement = document.getElementById("content");

function displayConversionResults(contents) {
  var element = document.getElementById("file-content");
  element.textContent = contents;
}
// Button callback
async function onButtonClicked() {
  let files = await selectFile(".csv");
  var file = files[0];
  if (!file) {
    console.log("nothing");
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    var contents = e.target.result;
    displayConversionResults("All Finished");
    createSaveButton();
  };
  reader.readAsText(file);
}

function createSaveButton() {
  var save_button = document.createElement("button");
  save_button.innerHTML = "Save New CSV to Download Folder";
  var body = document.getElementsByTagName("body")[0];
  body.appendChild(save_button);
  save_button.addEventListener("click", function () {
    saveTextAsFile();
    alert("File saved to Download Folder");
    window.location.reload();
  });
}

function saveTextAsFile() {
  var textToWrite = "something";
  var textFileAsBlob = new Blob([textToWrite], { type: "text/plain" });
  var fileNameToSaveAs = "coinbase-gain-loss.csv";

  var downloadLink = document.createElement("a");
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = "Download File";
  if (window.webkitURL != null) {
    // Chrome allows the link to be clicked
    // without actually adding it to the DOM.
    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
  } else {
    // Firefox requires the link to be added to the DOM
    // before it can be clicked.
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
  }
  downloadLink.click();
}

// ---- function definition ----
function selectFile(contentType) {
  return new Promise((resolve) => {
    let input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = contentType;

    input.onchange = (_) => {
      let files = Array.from(input.files);
      resolve(files);
    };

    input.click();
  });
}
