// Global variables used by our Dapp
var contract_address;

var gas_price = 1000000;
var gas_limit = 200000;
var contract_address = "n1fxdcvtjZ8gHSZJNS89sGm6ZuaSAm8wWjP";//neb_contract.contract;
var contract_txhash = "3c85db77d4930f001d7e4255c924802e8d3359ccb9a3d1e5d08fe904536356e8";
var nebulas_domain = "https://mainnet.nebulas.io";//neb_contract.apiUrl;
var is_mainnet = true;
var explorer_tx_url = "https://explorer.nebulas.io/#/tx/"; 

var token_divider = 1000000000000000000;

var spinner = '<img src="spinner.gif" class="spinner"/>';

function redirectToHome(path)
{
    if(!path)
    {
        path = "";
    }
    var href = window.location.href;
    var dir = href.substring(0, href.lastIndexOf('/')) + path;
    window.location =  dir;  
}

// From https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
const numberWithCommas = (x) => {
    var parts = Number.parseFloat(x).toFixed(8).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

function formatCoins(number) 
{
    var x = number / token_divider;
    return numberWithCommas(x) + " nas";
}

var status_cooldown;
function hideStatus()
{
    $("#status-card").hide();    
}
function showStatus(title, message, timeout, onTimeout)
{
    if(status_cooldown)
    {
        clearTimeout(status_cooldown);
        status_cooldown = null;
    }

    $("#status-card-title").text(title);
    $("#status-card-content").empty();
    $("#status-card-content").append(message);
    $("#status-card").show();

    if(timeout) 
    {
        status_cooldown = setTimeout(function() 
        {
            hideStatus();
            if(onTimeout)
            {
                onTimeout();
            }
        }, timeout);
    }
}

var button = '<div class="mt-3 text-center" style="width:100%"><button class="btn btn-secondary" onclick="window.open(\'' + explorer_tx_url 
    + '$\')">View on Block Explorer</button></div>';
function nebWriteWithStatus(method, args, amount, complete_message, on_complete)
{
    nebWrite(method, args, function(resp)
    { // tx in mempool
        showStatus("Posting transaction", "Please wait for the transaction to be added to a block. " + spinner + button.replace("$", resp.txhash));
    }, amount, function(resp)
    { // tx in block
        showStatus("Transaction Complete", complete_message + button.replace("$", resp.txhash), 2000, function(resp)
        {
            hideStatus();
            on_complete(resp);
        });
    }, function(resp)
    { // error
        showStatus("Transaction Error", resp, 10000);                
    });
}
 
// From https://youtu.be/-iTZxD2O_9g to embed
function embedVideo(url)
{
    var video_id = url.substring(url.lastIndexOf("/"));
    var html = '<iframe height="150" src="https://www.youtube.com/embed/'
         + video_id + '" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
    return html;
}