// Content wrapper element
let contentElement = document.getElementById("content");
let inputFileName = "";
let tranArray = new Array();
let origTranArray = new Array();
let bankArray = new Array();
let proceedsArray = new Array();

function displayConversionResults(contents) {
  var element = document.getElementById("file-content");
  element.textContent = contents;
}
// Button callback
async function onButtonClicked() {
  let files = await selectFile(".csv");
  var file = files[0];
  inputFileName = file.name.substring(0, file.name.length - 4);
  if (!file) {
    console.log("nothing");
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    var contents = e.target.result;
    processData(contents);
    tranArray.forEach(analyzeTx);
    console.log(tranArray);
    console.log(proceedsArray);
    console.log(bankArray);
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
  var fileNameToSaveAs = inputFileName + "-gain-loss.csv";

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

function processData(allText) {
  startRow = 0;
  var allTextLines = allText.split(/\r\n|\n/);
  for (var i = 0; i < allTextLines.length; i++) {
    if (allTextLines[i].includes("Timestamp")) {
      startRow = i;
      break;
    }
  }

  var headers = allTextLines[startRow].split(",");
  for (var i = startRow + 1; i < allTextLines.length; i++) {
    var tmp = allTextLines[i].toString();
    //remove those pesky double double quotes first before splitting by comma
    tmp = tmp.replace(/""/g, "");
    var data = splitCSVButIgnoreCommasInDoublequotes(tmp);
    if (data.length == headers.length) {
      var tarr = " ";
      for (var j = 0; j < headers.length; j++) {
        data[j] = data[j].replace(/['"]+/g, "");
        if (j == 0) {
          tarr = '{"' + headers[j] + '"' + ":" + '"' + data[j] + '"';
        } else {
          tarr += ' , "' + headers[j] + '"' + ":" + '"' + data[j] + '"';
        }
      }
      tarr += "}";
      var myobj = JSON.parse(tarr);
      const unixTimeZero = Date.parse(myobj.Timestamp);

      //For debugging purposes, I create two copies of the transaction array since
      //one will get modified as I subtract sales events
      let myTrans = new Transaction(
        unixTimeZero,
        myobj["Transaction Type"],
        myobj.Asset,
        myobj["Quantity Transacted"],
        myobj["USD Spot Price at Transaction"],
        myobj["USD Subtotal"],
        myobj["USD Total (inclusive of fees)"],
        myobj["USD Fees"],
        myobj.Notes
      );
      tranArray.push(myTrans);

      let myOrigTrans = new Transaction(
        unixTimeZero,
        myobj["Transaction Type"],
        myobj.Asset,
        myobj["Quantity Transacted"],
        myobj["USD Spot Price at Transaction"],
        myobj["USD Subtotal"],
        myobj["USD Total (inclusive of fees)"],
        myobj["USD Fees"],
        myobj.Notes
      );
      origTranArray.push(myOrigTrans);
    } else {
      //console.log(data);
      if (data.length > 1) console.log("there is a bad line in here");
    }
  }
  tranArray.sort((a, b) => (a.date > b.date ? 1 : b.date > a.date ? -1 : 0));
}

function analyzeTx(item, index, arr) {
  if (item.action == "Buy" || item.action == "Receive") processAddBank(item);
  if (item.action == "Sell" || item.action == "Send") processSubtractBank(item);
  if (item.action == "Convert") processConversion(item);
}

function processAddBank(item) {
  for (var i = 0; i < bankArray.length; i++) {
    if (bankArray[i].assetName == item.asset) {
      bankArray[i].addTx(item);
      return;
    }
  }
  console.log("creating bank for:" + item.asset);
  let myBank = new Bank(item.asset);
  myBank.addTx(item);
  bankArray.push(myBank);
}

function processSubtractBank(item) {
  for (var i = 0; i < bankArray.length; i++) {
    if (bankArray[i].assetName == item.asset) {
      bankArray[i].subtractTx(item);
      return;
    }
  }
  console.log("error, asset to be sold not found in banks:" + item.asset);
}

function processConversion(item) {
  //first create sale event
  let sellTrans = new Transaction(
    item.date,
    "Sell",
    item.asset,
    item.quantity,
    item.spot,
    item.usdSubtotal,
    item.usdTotal,
    item.fees,
    item.note
  );
  processSubtractBank(sellTrans);
  console.log(sellTrans);

  //now we have to parse out the notes to figure out what we bought and how much
  var delimiter = " ";
  var elements = item.note.split(delimiter);
  console.log(elements);

  var subTotal = item.usdSubtotal;
  let addTrans = new Transaction(
    item.date,
    "Buy",
    elements[5],
    parseFloat(elements[4]),
    item.usdTotal / elements[4],
    item.usdSubtotal,
    item.usdTotal,
    item.fees,
    item.note
  );
  console.log(addTrans);
  processAddBank(addTrans);
}

class Transaction {
  constructor(
    _date,
    _action,
    _asset,
    _quantity,
    _spot,
    _subtotal,
    _total,
    _fees,
    _note
  ) {
    this.date = _date;
    this.action = _action;
    this.asset = _asset;
    this.quantity = parseFloat(_quantity);
    this.spot = parseFloat(_spot);
    if (_subtotal != "") this.usdSubtotal = parseFloat(_subtotal);
    else this.usdSubtotal = 0.0;
    if (_total != "") this.usdTotal = parseFloat(_total);
    else this.usdTotal = 0.0;
    if (_fees != "") this.fees = parseFloat(_fees);
    else this.fees = 0.0;
    this.note = _note;
    if (this.usdTotal > 0) this.basisSpot = this.usdTotal / this.quantity;
    else this.basisSpot = this.spot;
  }
}

class Proceeds {
  constructor(dateAquired, dateDisposed, assetName, quantity, basis, proceeds) {
    this.dateAquired = dateAquired;
    this.dateDisposed = dateDisposed;
    this.assetName = assetName;
    this.quantity = quantity;
    this.basis = basis;
    this.proceeds = proceeds;
  }
}

class Bank {
  constructor(assetName) {
    this.assetName = assetName;
    this.txArray = [];
    this.totalQuantity = 0.0;
  }

  addTx(tx) {
    this.txArray.push(tx);
    this.totalQuantity += tx.quantity;
  }

  subtractTx(tx) {
    var runningQuantity = tx.quantity;
    //using FIFO method to compute proceeds
    for (var i = 0; i < this.txArray.length; i++) {
      if (this.txArray[i].quantity == 0) continue;
      if (runningQuantity <= this.txArray[i].quantity) {
        console.log(
          "using full " + runningQuantity + " " + this.txArray[i].quantity
        );
        this.txArray[i].quantity -= runningQuantity;
        this.totalQuantity -= runningQuantity;
        var costBasis = runningQuantity * this.txArray[i].basisSpot;
        var saleProceeds = runningQuantity * tx.basisSpot;

        var myProceeds = new Proceeds(
          this.txArray[i].date,
          tx.date,
          tx.asset,
          runningQuantity,
          costBasis,
          saleProceeds
        );
        proceedsArray.push(myProceeds);
        runningQuantity = 0;
        return;
      }

      if (runningQuantity > this.txArray[i].quantity) {
        var numberSold = this.txArray[i].quantity;
        this.totalQuantity -= numberSold;
        this.txArray.quantity = 0;
        var costBasis = numberSold * this.txArray[i].basisSpot;
        var saleProceeds = numberSold * tx.basisSpot;
        var myProceeds = new Proceeds(
          this.txArray[i].date,
          tx.date,
          tx.asset,
          numberSold,
          costBasis,
          saleProceeds
        );
        runningQuantity -= numberSold;
        proceedsArray.push(myProceeds);
      }
    }
    console.log(
      "error, not enough " + tx.asset + " banked to cover this sale!!"
    );
  }
}

//The coinbase csv sometimes contains a comma in the notes field that is enclosed in quotes
//this messes up the splitting so this function deals with it
//found this on Stackoverflow:
// https://stackoverflow.com/questions/11456850/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascript
//But it doesn't work if an element has two consecutive quotes so I remove those before calling
function splitCSVButIgnoreCommasInDoublequotes(str) {
  //split the str first
  //then merge the elments between two double quotes
  var delimiter = ",";
  var quotes = '"';
  var elements = str.split(delimiter);
  var newElements = [];
  for (var i = 0; i < elements.length; ++i) {
    if (elements[i].indexOf(quotes) >= 0) {
      //the left double quotes is found
      var indexOfRightQuotes = -1;
      var tmp = elements[i];
      //find the right double quotes
      for (var j = i + 1; j < elements.length; ++j) {
        if (elements[j].indexOf(quotes) >= 0) {
          indexOfRightQuotes = j;
          break;
        }
      }
      //found the right double quotes
      //merge all the elements between double quotes
      if (-1 != indexOfRightQuotes) {
        for (var j = i + 1; j <= indexOfRightQuotes; ++j) {
          tmp = tmp + delimiter + elements[j];
        }
        newElements.push(tmp);
        i = indexOfRightQuotes;
      } else {
        //right double quotes is not found
        newElements.push(elements[i]);
      }
    } else {
      //no left double quotes is found
      newElements.push(elements[i]);
    }
  }
  return newElements;
}
