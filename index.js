// Content wrapper element
let contentElement = document.getElementById("content");
let inputFileName = "";
let tranArray = new Array();
let origTranArray = new Array();
let bankArray = new Array();
let proceedsArray = new Array();

function displaySomething(contents) {
  var element = document.getElementById("file-content");
  element.textContent = contents;
}
// Button callback
async function onButtonClicked() {
  if (
    !document.getElementById("Option1").checked &&
    !document.getElementById("Option2").checked
  ) {
    alert("please select output type as csv or txf");
    return;
  }
  let files = await selectFile(".csv");
  var file = files[0];
  inputFileName = file.name.substring(0, file.name.length - 4);
  if (!file) {
    console.log("nothing");
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById("button1").style.visibility = "hidden";
    document.getElementById("content").style.visibility = "hidden";
    var contents = e.target.result;
    processData(contents);
    tranArray.forEach(analyzeTx);
    console.log(tranArray);
    console.log(proceedsArray);
    console.log(bankArray);
    if (document.getElementById("Option1").checked) {
      displaySomething("Proceeds CSV ready to save!");
      createSaveCSVButton();
    } else if (document.getElementById("Option2").checked) {
      displaySomething("TurboTax TXF ready to save!");
      createSaveTXFButton();
    }
  };
  reader.readAsText(file);
}

function createSaveCSVButton() {
  var save_csv_button = document.createElement("button");
  save_csv_button.innerHTML = "Save Proceeds CSV to Download Folder";
  var body = document.getElementsByTagName("body")[0];
  var e = document.getElementById("button1");
  body.insertBefore(save_csv_button, e);
  save_csv_button.addEventListener("click", function () {
    saveTextAsFile(createOutputCSV(), inputFileName + "-Proceeds.csv");
    alert("File saved to Download Folder");
    window.location.reload();
  });
}

function createOutputCSV() {
  var output =
    "Date Acquired, Date Disposed, Asset, Quantity, Basis, Proceeds, Gain/Loss\r\n";
  for (var i = 0; i < proceedsArray.length; i++) {
    output += proceedsArray[i].dateAcquired + ",";
    output += proceedsArray[i].dateDisposed + ",";
    output += proceedsArray[i].assetName + ",";
    output += proceedsArray[i].quantity + ",";
    output += proceedsArray[i].basis + ",";
    output += proceedsArray[i].proceeds + ",";
    output += proceedsArray[i].gainLoss + "\r\n";
  }
  return output;
}

function createSaveTXFButton() {
  var save_txf_button = document.createElement("button");
  save_txf_button.innerHTML = "Save TurboTax TXF to Download Folder";
  var body = document.getElementsByTagName("body")[0];
  var e = document.getElementById("button1");
  body.insertBefore(save_txf_button, e);
  save_txf_button.addEventListener("click", function () {
    saveTextAsFile(createOutputTXF(), inputFileName + "-TurboTax.txf");
    alert("File saved to Download Folder");
    window.location.reload();
  });
}

function createOutputTXF() {
  var output = "V042\r\n";
  output += "Aclaire\r\n";
  var date = new Date();

  output +=
    "D " +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    "/" +
    ("0" + date.getUTCDate()).slice(-2) +
    "/" +
    date.getFullYear() +
    "\r\n";
  // N321 is supposed to mean short-term sale but TT is ignoring it
  for (var i = 0; i < proceedsArray.length; i++) {
    output += "^\r\nTD\r\nN321\r\nC1\r\nL1\r\n";
    output += "P" + proceedsArray[i].quantity;
    output += " " + proceedsArray[i].assetName + "\r\n";
    output += "D" + proceedsArray[i].txfDateAcq + "\r\n";
    output += "D" + proceedsArray[i].txfDateDis + "\r\n";
    output += "$" + proceedsArray[i].basis + "\r\n";
    output += "$" + proceedsArray[i].proceeds + "\r\n";
  }
  output += "^\r\n";
  return output;
}

function saveTextAsFile(textToWrite, fileNameToSaveAs) {
  var textFileAsBlob = new Blob([textToWrite], { type: "text/plain" });
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
        myobj.Timestamp,
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
        myobj.Timestamp,
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
  tranArray.sort((a, b) =>
    a.unixDate > b.unixDate ? 1 : b.unixDate > a.unixDate ? -1 : 0
  );
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
    item.unixDate,
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
  //now we have to parse out the notes to figure out what we bought and how much
  var delimiter = " ";
  var elements = item.note.split(delimiter);

  var subTotal = item.usdSubtotal;
  let addTrans = new Transaction(
    item.date,
    item.unixDate,
    "Buy",
    elements[5],
    parseFloat(elements[4]),
    item.usdTotal / elements[4],
    item.usdSubtotal,
    item.usdTotal,
    item.fees,
    item.note
  );
  processAddBank(addTrans);
}

class Transaction {
  constructor(
    _date,
    _unixDate,
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
    this.unixDate = _unixDate;
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
  constructor(
    dateAcquired,
    dateDisposed,
    assetName,
    quantity,
    basis,
    proceeds
  ) {
    this.dateAcquired = dateAcquired;
    this.dateDisposed = dateDisposed;
    this.assetName = assetName;
    this.quantity = quantity;
    this.basis = basis;
    this.proceeds = proceeds;
    this.gainLoss = proceeds - basis;
    var d1 = Date.parse(dateAcquired);
    var d2 = Date.parse(dateDisposed);
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    this.txfDateAcq = ("0" + (date1.getMonth() + 1)).slice(-2);
    this.txfDateAcq += "/" + ("0" + date1.getUTCDate()).slice(-2);
    this.txfDateAcq += "/" + date1.getFullYear();

    this.txfDateDis = ("0" + (date2.getMonth() + 1)).slice(-2);
    this.txfDateDis += "/" + ("0" + date2.getUTCDate()).slice(-2);
    this.txfDateDis += "/" + date2.getFullYear();
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
      var skipProceeds = false;
      var e = document.getElementById("timeframe");
      if (e.value != "AllTime") {
        const date1 = new Date(tx.date);
        if (date1.getFullYear().toString() != e.value) skipProceeds = true;
      }
      if (runningQuantity <= this.txArray[i].quantity) {
        this.txArray[i].quantity -= runningQuantity;
        this.totalQuantity -= runningQuantity;
        var costBasis = runningQuantity * this.txArray[i].basisSpot;
        var saleProceeds = runningQuantity * tx.basisSpot;
        if (!skipProceeds) {
          var myProceeds = new Proceeds(
            this.txArray[i].date,
            tx.date,
            tx.asset,
            runningQuantity,
            costBasis,
            saleProceeds
          );
          proceedsArray.push(myProceeds);
        }
        runningQuantity = 0;
        return;
      }

      if (runningQuantity > this.txArray[i].quantity) {
        var numberSold = this.txArray[i].quantity;
        this.totalQuantity -= numberSold;
        this.txArray.quantity = 0;
        var costBasis = numberSold * this.txArray[i].basisSpot;
        var saleProceeds = numberSold * tx.basisSpot;
        if (!skipProceeds) {
          var myProceeds = new Proceeds(
            this.txArray[i].date,
            tx.date,
            tx.asset,
            numberSold,
            costBasis,
            saleProceeds
          );
          proceedsArray.push(myProceeds);
        }
        runningQuantity -= numberSold;
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
