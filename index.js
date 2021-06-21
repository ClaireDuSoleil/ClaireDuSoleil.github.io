// Content wrapper element

let contentElement = document.getElementById('content');
let inputFileName = '';
let tranArray = new Array();
let origTranArray = new Array();
let bankArray = new Array();
let proceedsArray = new Array();
let combinedProceedsArray = new Array();
var dataObject = [];

//mainline**********************************************************

Handsontable.renderers.registerRenderer('negativeValueRenderer', negativeValueRenderer);
var hotElement = document.querySelector('#hot');
var hotElementContainer = hotElement.parentNode;
var hotSettings = {
  data: dataObject,
  columns: [
    {
      //0
      data: 'delAction',
      type: 'text',
      width: '30',
    },
    {
      //1
      data: 'dateAcquired',
      tyep: 'text',
    },
    {
      //2
      data: 'dateDisposed',
      type: 'text',
    },
    {
      //3
      data: 'assetName',
      type: 'text',
    },
    {
      //4
      data: 'quantity',
      type: 'numeric',
      numericFormat: {
        pattern: '0.0000',
      },
    },
    {
      //5
      data: 'basis',
      type: 'numeric',
      numericFormat: {
        pattern: '0.0000',
      },
    },
    {
      //6
      data: 'basisSpot',
      type: 'numeric',
      numericFormat: {
        pattern: '0.0000',
      },
    },
    {
      //7
      data: 'proceeds',
      type: 'numeric',
      numericFormat: {
        pattern: '0.0000',
      },
    },
    {
      //8
      data: 'gainLoss',
      type: 'numeric',
      numericFormat: {
        pattern: '0.00',
      },
    },
  ],
  stretchH: 'all',
  width: 1005,
  autoWrapRow: true,
  manualRowResize: true,
  manualColumnResize: true,
  rowHeaders: false,
  licenseKey: 'non-commercial-and-evaluation',
  colHeaders: [
    'Del',
    'Date Acquired',
    'Date Disposed',
    'Asset',
    'Quantity',
    'Basis',
    'Basis-Spot',
    'Proceeds',
    'Gain/Loss',
  ],
  manualRowMove: true,
  manualColumnMove: true,
  contextMenu: false,
  filters: true,
  language: 'en-US',
  cells: function (row, col) {
    var cellProperties = {};
    var data = this.instance.getData();
    if (col == 0) {
      cellProperties.renderer = firstColRenderer;
      cellProperties.readOnly = true;
    } else {
      cellProperties.renderer = 'negativeValueRenderer';
    }

    return cellProperties;
  },
};
var hot = new Handsontable(hotElement, hotSettings);
hot.addHook('afterOnCellMouseDown', function (event, coords, TD) {
  if (coords.col === 0) {
    hot.alter('remove_row', coords.row);
  }
  var vr = hot.countVisibleRows();
  if (vr < dataObject.length || vr < 10) return;
  var h = dataObject.length * 15 + 50;
  if (h > 500) h = 500;
  hot.updateSettings({height: h});
});

document.getElementById('hot').style.display = 'none';
document.getElementById('canEdit').style.display = 'none';

//start of functions*************************************************

function firstColRenderer(instance, td, row, col, prop, value, cellProperties) {
  Handsontable.renderers.TextRenderer.apply(this, arguments);
  td.style.fontWeight = 'bold';
  td.className = 'make-me-red';
}

function negativeValueRenderer(instance, td, row, col, prop, value, cellProperties) {
  Handsontable.renderers.TextRenderer.apply(this, arguments);
  if (parseFloat(value, 10) < 0) {
    td.className = 'make-me-red';
  }
}

// Button callback
async function onButtonClicked() {
  let files = await selectFile('.csv');
  var file = files[0];
  inputFileName = file.name.substring(0, file.name.length - 4);
  if (!file) {
    console.log('nothing');
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    document.getElementById('button1').style.visibility = 'hidden';
    document.getElementById('content').style.visibility = 'hidden';
    var contents = e.target.result;
    processData(contents);
    tranArray.forEach(analyzeTx);
    combineProceeds();
    console.log(tranArray);
    console.log(proceedsArray);
    console.log(combinedProceedsArray);
    console.log(bankArray);
    document.getElementById('button1').style.display = 'none';
    document.getElementById('myTitle').style.display = 'none';
    document.getElementById('div2').style.display = 'none';
    document.getElementById('canEdit').style.display = 'block';
    document.getElementById('hot').style.display = 'block';
    fillHotDataFromProceeds();
    hot.loadData(dataObject);
    createSaveCSVButton();
    createSaveTXFButton();
    createResetButton();
    createFilterDropdown();
  };
  reader.readAsText(file);
}

function fillHotDataFromProceeds() {
  dataObject = [];
  proceedsArray.forEach((e) => {
    var obj = {
      delAction: '\u274c',
      dateAcquired: e.dateAcquired,
      dateDisposed: e.dateDisposed,
      assetName: e.assetName,
      quantity: e.quantity,
      basis: parseFloat(e.basis).toFixed(2),
      basisSpot: parseFloat(e.basisSpot).toFixed(2),
      proceeds: parseFloat(e.proceeds).toFixed(2),
      gainLoss: parseFloat(e.gainLoss).toFixed(2),
    };
    dataObject.push(obj);
  });
  var h = dataObject.length * 15 + 50;
  if (h > 500) h = 500;
  hot.updateSettings({height: h});
}

function fillHotDataFromArray(newArray) {
  dataObject = [];
  newArray.forEach((e, index) => {
    var obj = {
      delAction: '\u274c',
      dateAcquired: e[1],
      dateDisposed: e[2],
      assetName: e[3],
      quantity: e[4],
      basis: e[5],
      basisSpot: e[6],
      proceeds: e[7],
      gainLoss: e[8],
    };
    dataObject.push(obj);
  });
  var h = dataObject.length * 15 + 50;
  if (h > 500) h = 500;
  hot.updateSettings({height: h});
}

function createSaveCSVButton() {
  var save_csv_button = document.createElement('button');
  save_csv_button.innerHTML = 'Export as CSV to Downloads Folder';
  var div1 = document.getElementById('div1');
  var e = document.getElementById('hot');
  div1.insertBefore(save_csv_button, e);
  save_csv_button.style.marginTop = '10px';
  save_csv_button.style.marginBottom = '20px';
  save_csv_button.addEventListener('click', function () {
    saveTextAsFile(createOutputCSV(), inputFileName + '-Proceeds.csv');
    alert('File saved to Download Folder');
  });
}

function createResetButton() {
  var reset_button = document.createElement('button');
  reset_button.innerHTML = 'Start Over';
  var div1 = document.getElementById('div1');
  var e = document.getElementById('hot');
  reset_button.style.marginLeft = '50px';
  div1.insertBefore(reset_button, e);
  reset_button.addEventListener('click', function () {
    window.location.reload();
  });
}

function createFilterDropdown() {
  var values = ['', '2022', '2021', '2020', '2019'];
  var select = document.createElement('select');
  select.name = 'filterYear';
  select.id = 'filterYear';
  for (const val of values) {
    var option = document.createElement('option');
    option.value = val;
    option.text = val.charAt(0).toUpperCase() + val.slice(1);
    select.appendChild(option);
  }
  select.style.marginTop = '30px';
  select.style.width = '80px';
  select.style.appearance = 'auto';
  var label = document.createElement('label');
  label.innerHTML = 'Filter table data by year: ';
  label.htmlFor = 'filterYear';

  var applyFilterButton = document.createElement('button');
  applyFilterButton.style.marginLeft = '20px';
  applyFilterButton.innerHTML = 'Apply Filter for Selected Year';
  document.getElementById('div1').appendChild(label).appendChild(select);
  document.getElementById('div1').appendChild(applyFilterButton);
  applyFilterButton.addEventListener('click', function () {
    filterByYear(select.value);
  });
}

function filterByYear(value) {
  if (value.length == 0) return;
  var oldData = hot.getData();
  var newArray = oldData.filter(function (dataRow) {
    const date1 = new Date(dataRow[2]);
    return date1.getFullYear().toString() == value;
  });
  fillHotDataFromArray(newArray);
  hot.loadData(dataObject);
  hot.render();
}

function combineProceeds() {
  //first loop thru the proceeds array and combine sell actions that have the same
  //date and asset to be only one action with the average basis
  for (var j = 1; j < proceedsArray.length; j++) {
    let proceeds = proceedsArray[j - 1];
    let nextProceeds = proceedsArray[j];
    if (proceeds.dateDisposed == nextProceeds.dateDisposed && proceeds.assetName == nextProceeds.assetName) {
      proceeds.usedInCombo = true;
      nextProceeds.usedInCombo = true;
      var found = false;
      for (var k = 0; k < combinedProceedsArray.length; k++) {
        if (
          combinedProceedsArray[k].dateDisposed == nextProceeds.dateDisposed &&
          combinedProceedsArray[k].asset == nextProceeds.asset
        ) {
          found = true;
          var combProceeds = combinedProceedsArray[k];
          combProceeds.quantity += nextProceeds.quantity;
          combProceeds.basis += nextProceeds.basis;
          combProceeds.basisSpot = combProceeds.basis / combProceeds.quantity;
          combProceeds.proceeds += nextProceeds.proceeds;
          combProceeds.gainLoss += nextProceeds.gainLoss;
        }
      }
      if (!found) {
        //create a new combined sale
        var myProceeds = new Proceeds(
          proceeds.dateAcquired,
          proceeds.dateDisposed,
          proceeds.assetName,
          proceeds.quantity + nextProceeds.quantity,
          proceeds.basis + nextProceeds.basis,
          proceeds.proceeds + nextProceeds.proceeds
        );
        myProceeds.usedInCombo = true;
        combinedProceedsArray.push(myProceeds);
      }
    } else {
      if (proceeds.usedInCombo == false) combinedProceedsArray.push(proceeds);
      if (nextProceeds.usedInCombo == false && j == proceedsArray.length - 1) combinedProceedsArray.push(nextProceeds);
    }
  }
}

function createOutputCSV() {
  var hotData = hot.getData();
  var output = '';
  output = 'Date Acquired, Date Disposed, Asset, Quantity, Basis, Basis-Spot, Proceeds, Gain/Loss\r\n';
  for (var i = 0; i < hotData.length; i++) {
    output += hotData[i][1] + ',';
    output += hotData[i][2] + ',';
    output += hotData[i][3] + ',';
    output += hotData[i][4] + ',';
    output += hotData[i][5] + ',';
    output += hotData[i][6] + ',';
    output += hotData[i][7] + ',';
    output += hotData[i][8] + '\r\n';
  }
  return output;
}

function createSaveTXFButton() {
  var save_txf_button = document.createElement('button');
  save_txf_button.innerHTML = 'Export as TurboTax TXF to Downloads Folder';
  var div1 = document.getElementById('div1');
  var e = document.getElementById('hot');
  save_txf_button.style.marginLeft = '50px';
  div1.insertBefore(save_txf_button, e);
  save_txf_button.addEventListener('click', function () {
    saveTextAsFile(createOutputTXF(), inputFileName + '-TurboTax.txf');
    alert('File saved to Download Folder');
  });
}

function createOutputTXF() {
  var hotData = hot.getData();
  var output = 'V042\r\n';
  output += 'Aclaire\r\n';
  var date = new Date();

  output +=
    'D ' +
    ('0' + (date.getMonth() + 1)).slice(-2) +
    '/' +
    ('0' + date.getUTCDate()).slice(-2) +
    '/' +
    date.getFullYear() +
    '\r\n';
  // N321 is short-term sale
  // N323 is long-term
  for (var i = 0; i < hotData.length; i++) {
    var dateAcquired = hotData[i][1];
    var dateDisposed = hotData[i][2];
    var d1 = Date.parse(dateAcquired);
    var d2 = Date.parse(dateDisposed);
    var saleCode = 'N321';
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) saleCode = 'N323'; //todo fix for a leap year

    var txfDateAcq = ('0' + (date1.getMonth() + 1)).slice(-2);
    txfDateAcq += '/' + ('0' + date1.getUTCDate()).slice(-2);
    txfDateAcq += '/' + date1.getFullYear();
    var txfDateDis = ('0' + (date2.getMonth() + 1)).slice(-2);
    txfDateDis += '/' + ('0' + date2.getUTCDate()).slice(-2);
    txfDateDis += '/' + date2.getFullYear();
    output += '^\r\nTD\r\n';
    output += saleCode;
    output += '\r\nC1\r\nL1\r\n';
    output += 'P' + hotData[i][4];
    output += ' ' + hotData[i][3] + '\r\n';
    output += 'D' + txfDateAcq + '\r\n';
    output += 'D' + txfDateDis + '\r\n';
    output += '$' + hotData[i][5] + '\r\n';
    output += '$' + hotData[i][7] + '\r\n';
  }
  output += '^\r\n';
  return output;
}

function saveTextAsFile(textToWrite, fileNameToSaveAs) {
  var textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'});
  var downloadLink = document.createElement('a');
  downloadLink.download = fileNameToSaveAs;
  downloadLink.innerHTML = 'Download File';
  if (window.webkitURL != null) {
    // Chrome allows the link to be clicked
    // without actually adding it to the DOM.
    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
  } else {
    // Firefox requires the link to be added to the DOM
    // before it can be clicked.
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
  }
  downloadLink.click();
}

// ---- function definition ----
function selectFile(contentType) {
  return new Promise((resolve) => {
    let input = document.createElement('input');
    input.type = 'file';
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
    if (allTextLines[i].includes('Timestamp')) {
      startRow = i;
      break;
    }
  }

  var headers = allTextLines[startRow].split(',');
  for (var i = startRow + 1; i < allTextLines.length; i++) {
    var tmp = allTextLines[i].toString();
    //remove those pesky double double quotes first before splitting by comma
    tmp = tmp.replace(/""/g, '');
    var data = splitCSVButIgnoreCommasInDoublequotes(tmp);
    if (data.length == headers.length) {
      var tarr = ' ';
      for (var j = 0; j < headers.length; j++) {
        data[j] = data[j].replace(/['"]+/g, '');
        if (j == 0) {
          tarr = '{"' + headers[j] + '"' + ':' + '"' + data[j] + '"';
        } else {
          tarr += ' , "' + headers[j] + '"' + ':' + '"' + data[j] + '"';
        }
      }
      tarr += '}';
      var myobj = JSON.parse(tarr);
      const unixTimeZero = Date.parse(myobj.Timestamp);

      //For debugging purposes, I create two copies of the transaction array since
      //one will get modified as I subtract sales events
      let myTrans = new Transaction(
        myobj.Timestamp,
        unixTimeZero,
        myobj['Transaction Type'],
        myobj.Asset,
        myobj['Quantity Transacted'],
        myobj['USD Spot Price at Transaction'],
        myobj['USD Subtotal'],
        myobj['USD Total (inclusive of fees)'],
        myobj['USD Fees'],
        myobj.Notes
      );
      tranArray.push(myTrans);

      let myOrigTrans = new Transaction(
        myobj.Timestamp,
        unixTimeZero,
        myobj['Transaction Type'],
        myobj.Asset,
        myobj['Quantity Transacted'],
        myobj['USD Spot Price at Transaction'],
        myobj['USD Subtotal'],
        myobj['USD Total (inclusive of fees)'],
        myobj['USD Fees'],
        myobj.Notes
      );
      origTranArray.push(myOrigTrans);
    } else {
      //console.log(data);
      if (data.length > 1) console.log('there is a bad line in here');
    }
  }
  tranArray.sort((a, b) => (a.unixDate > b.unixDate ? 1 : b.unixDate > a.unixDate ? -1 : 0));
}

function analyzeTx(item, index, arr) {
  if (item.action == 'Buy' || item.action == 'Receive') processAddBank(item);
  if (item.action == 'Sell' || item.action == 'Send') processSubtractBank(item);
  if (item.action == 'Convert') processConversion(item);
}

function processAddBank(item) {
  for (var i = 0; i < bankArray.length; i++) {
    if (bankArray[i].assetName == item.asset) {
      bankArray[i].addTx(item);
      return;
    }
  }
  console.log('creating bank for:' + item.asset);
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
  console.log('error, asset to be sold not found in banks:' + item.asset);
}

function processConversion(item) {
  //first create sale event
  let sellTrans = new Transaction(
    item.date,
    item.unixDate,
    'Sell',
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
  var delimiter = ' ';
  var elements = item.note.split(delimiter);

  let addTrans = new Transaction(
    item.date,
    item.unixDate,
    'Buy',
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
  constructor(_date, _unixDate, _action, _asset, _quantity, _spot, _subtotal, _total, _fees, _note) {
    this.date = _date;
    this.unixDate = _unixDate;
    this.action = _action;
    this.asset = _asset;
    this.quantity = Number(parseFloat(_quantity).toPrecision(12));
    this.spot = parseFloat(_spot);
    if (_subtotal != '') this.usdSubtotal = parseFloat(_subtotal);
    else this.usdSubtotal = 0.0;
    if (_total != '') this.usdTotal = parseFloat(_total);
    else this.usdTotal = 0.0;
    if (_fees != '') this.fees = parseFloat(_fees);
    else this.fees = 0.0;
    this.note = _note;
    if (this.usdTotal > 0) this.basisSpot = this.usdTotal / this.quantity;
    else this.basisSpot = this.spot;
  }
}

//remember, toPrecision returns a STRING!!
class Proceeds {
  constructor(dateAcquired, dateDisposed, assetName, quantity, basis, proceeds) {
    this.dateAcquired = dateAcquired;
    this.dateDisposed = dateDisposed;
    this.assetName = assetName;
    this.quantity = parseFloat(quantity).toPrecision(12);
    this.basis = basis;
    this.proceeds = proceeds;
    this.gainLoss = proceeds - basis;
    this.basisSpot = this.basis / this.quantity;
    this.usedInCombo = false;
  }
}

class Bank {
  constructor(assetName) {
    this.assetName = assetName;
    this.txArray = [];
    this.totalQuantity = Number(0.0);
  }

  addTx(tx) {
    this.txArray.push(tx);
    var num = Number(this.totalQuantity) + Number(tx.quantity);
    this.totalQuantity = Number(num.toPrecision(12));
  }

  subtractTx(tx) {
    var runningQuantity = tx.quantity;
    //using FIFO method to compute proceeds
    for (var i = 0; i < this.txArray.length; i++) {
      if (this.txArray[i].quantity == 0) continue;
      if (runningQuantity <= this.txArray[i].quantity) {
        this.txArray[i].quantity -= runningQuantity;
        this.totalQuantity -= runningQuantity;
        this.totalQuantity = Number(this.totalQuantity.toPrecision(12));
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
        this.totalQuantity = Number(this.totalQuantity.toPrecision(12));
        this.txArray[i].quantity = 0;
        var costBasis = numberSold * this.txArray[i].basisSpot;
        var saleProceeds = numberSold * tx.basisSpot;
        var myProceeds = new Proceeds(this.txArray[i].date, tx.date, tx.asset, numberSold, costBasis, saleProceeds);
        proceedsArray.push(myProceeds);
        var num = Number(runningQuantity) - Number(numberSold);
        runningQuantity = Number(num.toPrecision(12));
      }
    }
    alert('ERROR: Not enough ' + tx.asset + ' banked to cover sale on ' + tx.date);
    console.log('error, not enough ' + tx.asset + ' banked to cover this sale!!');
    window.location.reload();
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
  var delimiter = ',';
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
