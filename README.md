# js-client
Cardmarket JavaScript client is availible at: **mkmapi.js**. It includes automatic conversion of POST/PUT request from JSON objects to XML, and automatic adding of GET query parameters from JSON object.

Example of usage:

      import MkmApi from './mkmapi.js';

      let token = {
            baseUrl: 'https://api.cardmarket.com/ws/v2.0/',
            appToken: '...',
            appSecret: '...',
            accessToken: '...',
            accessSecret: '...',
      };

      const api = new MkmApi(token.baseUrl, token.appToken, token.appSecret, token.accessToken, token.accessSecret);

      let findResult = await api.send('get', 'products/find', {
            search: 'Tatyova',
            idGame: 1,
            idLanguage: 1,
            maxResults: 100,
            start: 0
      });

      let getAccountResult = await api.send('get', 'account');
      
      let postStockResult = await api.send('post', 'stock', { 
        request: {
            article: [{
                idProduct: 327170,
                count: 1,
                idLanguage: 'EN',
                comments: 'imported with mkmapi',
                price: 1000000,
                condition: 'NM',
                isFoil: false
            }]
        }
      });

You can test it at https://martsve.github.io/mkm_api/js-client/
The test client currently support
- testing your access tokens
- listing your stock
- searching for products
- parsing a CSV export from CardCastle and match cards to CardMarket products and importing them to your stock

# mkm_api for command line
MagicCardMarket API 1.1/2.0 accessor

This program is a simple executable file to communicate simply with the MKM API v1.1/v2.0 (An Oauth wrapper). 
You provide the program with accesss tokens (https://www.cardmarket.eu/?mainPage=showMyAccount)
and then issues commands to access resources in the API

For resources check https://api.cardmarket.com/ws/documentation/API_1.1:Main_Page
 or the Sandbox for API 2.0: https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page

Usage: 

       MKM [-j] <CMD> <RESOURCE> [-f FILE] [DATA]

Availible CMD: GET, PUT, POST, DEL

PUT and POST requires data, from either a file (-f) or given text (DATA).

Use -j option to receive JSON.

All data should be given/received as UTF8

If tokens.txt does not exist, the program will pause while it waits for you to
fill in the created tokens.txt file:
      
      URL=https://api.cardmarket.com/ws/v2.0/
      App token=YOUR APP TOKEN
      App secret=YOUR APP SECRET
      Access token=YOUR ACCESS TOKEN
      Access token secret=YOUR ACCESS TOKEN SECRET

Examples:
      
        MKM GET account
      
        MKM GET stock/1
      
        MKM DEL shoppingcart
      
        MKM GET orders/2/8 > received.txt
        
4 .bat files are included in the "examples/" folder, with simple functionality:

  * empty_cart.bat - empties your shopping cart
  * get_orders.bat - retrieves all your orders
  * get_stock.bat - retrives all your stocks to stock.xml. Stock.xml can be opened and edited using f.ex. Microsoft Excel
  * update_stock.bat - uploads stock.xml. This updates all existing stocks
